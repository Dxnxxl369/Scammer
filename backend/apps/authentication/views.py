import requests
from django.conf import settings
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from .models import Anonimo, Usuario
from .responses import respuesta_error, respuesta_exitosa
from .serializers import ActualizarUsuarioSerializer, AnonimoSerializer, RegistroSerializer
from .services import AnonimoService, UsuarioService


class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            'backend': 'ok',
            'mongodb': self._check_mongodb(),
            'supabase': self._check_supabase(),
        })

    def _check_mongodb(self):
        try:
            client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=3000)
            client.admin.command('ping')
            return 'ok'
        except ConnectionFailure as e:
            return f'error: {e}'
        except Exception as e:
            return f'error: {e}'

    def _check_supabase(self):
        try:
            url = f"{settings.SUPABASE_URL}/auth/v1/settings"
            # El endpoint /auth/v1/settings exige la cabecera apikey; sin ella Supabase responde 401.
            headers = {"apikey": settings.SUPABASE_SECRET_KEY}
            response = requests.get(url, headers=headers, timeout=5)
            if response.status_code == 200:
                return 'ok'
            return f'error: status {response.status_code}'
        except requests.exceptions.Timeout:
            return 'error: timeout'
        except Exception as e:
            return f'error: {e}'


from rest_framework.response import Response  # noqa: E402 (needed for HealthCheckView above)


@method_decorator(csrf_exempt, name='dispatch')
class RegistroView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegistroSerializer(data=request.data)
        if not serializer.is_valid():
            return respuesta_error('VALIDACION', 'Datos inválidos', status.HTTP_400_BAD_REQUEST)

        # En el registro inicial, el usuario no existe en Mongo, por lo que SimpleIDAuthentication falla.
        # Por lo tanto, debemos extraer el ID de Supabase desde los headers manualmente.
        id_supabase = request.headers.get('X-User-ID')
        if getattr(request.user, 'is_authenticated', False):
            id_supabase = request.user.id

        if not id_supabase:
            return respuesta_error('ID_REQUERIDO', 'No se proporcionó identificación de Supabase', status.HTTP_400_BAD_REQUEST)

        if UsuarioService.existe_correo(serializer.validated_data['correo']):
            return respuesta_error('CORREO_DUPLICADO', 'El correo ya está registrado', status.HTTP_409_CONFLICT)

        if UsuarioService.existe_username(serializer.validated_data['nombre_usuario']):
            return respuesta_error('NOMBRE_USUARIO_DUPLICADO', 'El nombre de usuario ya existe', status.HTTP_409_CONFLICT)

        usuario, error = UsuarioService.crear_desde_supabase(
            id_supabase=id_supabase,
            correo=serializer.validated_data['correo'],
            nombre_usuario=serializer.validated_data['nombre_usuario'],
            nombre_completo=serializer.validated_data.get('nombre_completo'),
            pais=serializer.validated_data.get('pais', 'BO'),
        )

        if error:
            return respuesta_error(error, 'No se pudo crear el usuario', status.HTTP_409_CONFLICT)

        # BLINDAJE: Si la bitácora o las notificaciones fallan, el registro NO debe cancelarse (Evitar Error 500)
        try:
            from apps.analysis.services import BitacoraService, NotificacionService
            
            BitacoraService.registrar(
                usuario_id=usuario.id_supabase,
                accion='Registro Nuevo Usuario',
                modulo='Registro',
                ip=request.META.get('REMOTE_ADDR'),
                detalles=f'Usuario {usuario.nombre_usuario} registrado'
            )

            # Notificar a los administradores (El servicio chequeará sus preferencias)
            admins = Usuario.objects(rol='administrador')
            for admin in admins:
                NotificacionService.crear(
                    u_id=admin.id_supabase,
                    t='Nuevo Recluta',
                    m=f'El agente {usuario.nombre_usuario} se ha unido al terminal.',
                    tp='registro'
                )
        except Exception as e:
            print(f"ERROR_AUXILIAR_REGISTRO: {e}")

        return respuesta_exitosa(usuario.to_dict(), mensaje='Usuario creado correctamente', codigo_http=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name='dispatch')
class YoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = UsuarioService.obtener_por_supabase_id(request.user.id)
        
        # Si el usuario no existe en MongoDB pero está autenticado en Supabase (Huérfano)
        if not usuario:
            # Intentar registro automático con datos disponibles en el payload del token
            correo = getattr(request.user, 'email', None) or request.user.payload.get('email')
            if correo:
                nombre_usuario = correo.split('@')[0]
                # Asegurar que sea único
                nombre_usuario = f"{nombre_usuario}_{str(request.user.id)[:4]}"
                
                usuario, error = UsuarioService.crear_desde_supabase(
                    id_supabase=request.user.id,
                    correo=correo,
                    nombre_usuario=nombre_usuario,
                    nombre_completo=request.user.payload.get('user_metadata', {}).get('full_name', nombre_usuario)
                )
                if error:
                    if error == 'CORREO_DUPLICADO':
                        # Si el correo ya existe, es probable que se haya borrado en Supabase y vuelto a crear.
                        # Actualizamos el id_supabase del usuario existente en Mongo.
                        usuario = Usuario.objects(correo=correo.lower().strip()).first()
                        if usuario:
                            usuario.update(set__id_supabase=request.user.id)
                            usuario.reload()
                            error = None
                    elif error == 'NOMBRE_USUARIO_DUPLICADO':
                        import random
                        nombre_usuario = f"{nombre_usuario}_{random.randint(100, 999)}"
                        usuario, error = UsuarioService.crear_desde_supabase(
                            id_supabase=request.user.id,
                            correo=correo,
                            nombre_usuario=nombre_usuario,
                            nombre_completo=request.user.payload.get('user_metadata', {}).get('full_name', nombre_usuario)
                        )
                
                if not usuario:
                    return respuesta_error('NO_REGISTRADO', f'No se pudo crear perfil automático: {error}', status.HTTP_404_NOT_FOUND)
            else:
                return respuesta_error('NO_REGISTRADO', 'Debe completar el registro manual', status.HTTP_404_NOT_FOUND)
        
        # Actualizar última conexión
        from datetime import datetime, timedelta
        ahora = datetime.utcnow()
        if not usuario.ultima_conexion or usuario.ultima_conexion < ahora - timedelta(seconds=60):
            usuario.update(set__ultima_conexion=ahora)

        return respuesta_exitosa(usuario.to_dict())

    def patch(self, request):
        serializer = ActualizarUsuarioSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return respuesta_error('VALIDACION', 'Datos inválidos', status.HTTP_400_BAD_REQUEST)

        usuario, error = UsuarioService.actualizar(request.user.id, serializer.validated_data)
        if error:
            return respuesta_error(error, 'No se pudo actualizar', status.HTTP_400_BAD_REQUEST)

        return respuesta_exitosa(usuario.to_dict(), mensaje='Perfil actualizado')


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('correo')
        password = request.data.get('password')

        if not email or not password:
            return respuesta_error('DATOS_FALTANTES', 'Se requiere correo y contraseña', status.HTTP_400_BAD_REQUEST)

        try:
            # Llamada directa a la API de Supabase Auth
            url = f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password"
            headers = {
                "apikey": settings.SUPABASE_SECRET_KEY,
                "Content-Type": "application/json"
            }
            payload = {
                "email": email,
                "password": password
            }
            
            response = requests.post(url, json=payload, headers=headers, timeout=15)
            res_data = response.json()

            if response.status_code != 200:
                return respuesta_error('LOGIN_FALLIDO', res_data.get('error_description', 'Credenciales inválidas'), status.HTTP_401_UNAUTHORIZED)

            # Obtener el perfil de nuestro MongoDB
            id_supabase = res_data['user']['id']
            usuario = UsuarioService.obtener_por_supabase_id(id_supabase)
            
            if not usuario:
                return respuesta_error('USUARIO_NO_REGISTRADO', 'Inicia sesión en la web primero para completar tu perfil', status.HTTP_403_FORBIDDEN)

            return respuesta_exitosa({
                'session': {
                    'access_token': res_data['access_token'],
                    'refresh_token': res_data['refresh_token'],
                    'expires_in': res_data['expires_in']
                },
                'usuario': usuario.to_dict()
            }, mensaje='Sesión iniciada correctamente')

        except Exception as e:
            return respuesta_error('ERROR_SISTEMA', str(e), status.HTTP_500_INTERNAL_SERVER_ERROR)


class GoogleLoginUrlView(APIView):
    """Devuelve la URL para iniciar sesión con Google en Supabase"""
    permission_classes = [AllowAny]

    def get(self, request):
        redirect_to = request.query_params.get('redirect_to', 'com.scammer.ia://login-callback')
        # Forzamos flow_type=implicit para recibir el access_token directamente en el fragmento (#access_token=...)
        url = f"{settings.SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to={redirect_to}&flow_type=implicit"
        return respuesta_exitosa({'url': url})


class IniciarSesionSessionView(APIView):
    """Sincroniza la sesión de Supabase con una cookie HttpOnly de Django"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # El usuario ya está autenticado por el token Bearer en esta petición (enviado una sola vez)
        # Ahora "sellamos" ese token en una cookie persistente
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.split(' ', 1)[1] if auth_header.startswith('Bearer ') else None
        
        if not token:
            return respuesta_error('TOKEN_REQUERIDO', 'No se pudo extraer el token de acceso', status.HTTP_400_BAD_REQUEST)

        response = respuesta_exitosa(request.user.payload, mensaje='Sesión vinculada correctamente')
        
        # Seteamos la cookie HttpOnly válida por 30 días
        # IMPORTANTE: samesite='None' y secure=True son requeridos para Chrome 
        # al hacer peticiones entre diferentes puertos (ej. 5174 -> 8000)
        response.set_cookie(
            'scammer_session',
            token,
            max_age=60 * 60 * 24 * 30, # 30 días
            httponly=True,
            secure=True, # Obligatorio para SameSite=None
            samesite='None', 
            path='/'
        )
        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        usuario = UsuarioService.obtener_por_supabase_id(request.user.id)
        if usuario:
            # Envejecer la conexión y apagar interruptor de presencia
            from datetime import datetime, timedelta
            hace_diez_minutos = datetime.utcnow() - timedelta(minutes=10)
            usuario.update(set__ultima_conexion=hace_diez_minutos, set__esta_online=False)
            
            # Notificar en vivo al panel de admin
            try:
                from channels.layers import get_channel_layer
                from asgiref.sync import async_to_sync
                channel_layer = get_channel_layer()
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        "admin_bitacora",
                        {
                            "type": "presence_update",
                            "data": {
                                "usuario_id": usuario.id_supabase,
                                "esta_online": False
                            }
                        }
                    )
            except: pass

            # Registrar en bitácora
            from apps.analysis.services import BitacoraService
            BitacoraService.registrar(
                usuario_id=usuario.id_supabase,
                accion='Cierre de Sesión',
                modulo='Seguridad',
                ip=request.META.get('REMOTE_ADDR'),
                detalles='Usuario cerró sesión voluntariamente'
            )
            
        response = respuesta_exitosa(mensaje='Sesión terminada forensemente')
        response.delete_cookie('scammer_session')
        return response


@method_decorator(csrf_exempt, name='dispatch')
class SuscripcionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan = request.data.get('plan')
        if plan not in ['starter', 'pro', 'elite']:
            return respuesta_error('PLAN_INVALIDO', 'Plan seleccionado inválido', status.HTTP_400_BAD_REQUEST)
        
        usuario = UsuarioService.obtener_por_supabase_id(request.user.id)
        if not usuario:
            return respuesta_error('NO_ENCONTRADO', 'Usuario no encontrado', status.HTTP_404_NOT_FOUND)
            
        usuario.plan = plan
        usuario.save()

        # Registrar en bitácora
        from apps.analysis.services import BitacoraService, NotificacionService
        BitacoraService.registrar(
            usuario_id=usuario.id_supabase,
            accion=f'Suscripción {plan.upper()}',
            modulo='Pagos',
            ip=request.META.get('REMOTE_ADDR'),
            detalles=f'Usuario cambió a plan {plan}'
        )

        # Notificar a los administradores
        admins = Usuario.objects(rol='administrador')
        for admin in admins:
            NotificacionService.crear(
                u_id=admin.id_supabase,
                t='Upgrade de Autorización',
                m=f'El agente {usuario.nombre_usuario} ha subido al nivel {plan.upper()}.',
                tp='pago'
            )

        return respuesta_exitosa(usuario.to_dict(), mensaje='Suscripción actualizada exitosamente')


class CrearSesionAnonimaView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ip = self._obtener_ip(request)
        navegador = request.META.get('HTTP_USER_AGENT', '')[:500]
        pais = request.data.get('pais', 'BO')

        existente = AnonimoService.obtener_por_ip(ip)
        if existente:
            return respuesta_exitosa(existente.to_dict(), mensaje='Sesión anónima recuperada', codigo_http=status.HTTP_200_OK)

        anonimo = AnonimoService.crear_sesion(ip=ip, navegador=navegador, pais=pais)
        return respuesta_exitosa(anonimo.to_dict(), mensaje='Sesión anónima creada', codigo_http=status.HTTP_201_CREATED)

    def _obtener_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '')


class SesionAnonimaView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, id_sesion):
        anonimo = AnonimoService.obtener_por_id_sesion(id_sesion)
        if not anonimo:
            return respuesta_error('SESION_NO_ENCONTRADA', 'Sesión inválida o expirada', status.HTTP_404_NOT_FOUND)
        return respuesta_exitosa(anonimo.to_dict())


class RegistrarFCMTokenView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        token = request.data.get('token')
        if not token: return respuesta_error('TOKEN_REQUERIDO', 'Token FCM no proporcionado', status.HTTP_400_BAD_REQUEST)
        usuario = Usuario.objects(id_supabase=request.user.id).first()
        if usuario:
            usuario.update(set__fcm_token=token)
            return respuesta_exitosa(mensaje='Dispositivo vinculado para notificaciones push')
        return respuesta_error('USUARIO_NO_ENCONTRADO', 'No se pudo vincular el rastro', status.HTTP_404_NOT_FOUND)

class IncrementarIntentosAnonimoView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, id_sesion):
        anonimo = AnonimoService.incrementar_intentos_livianos(id_sesion)
        if not anonimo:
            return respuesta_error('SESION_NO_ENCONTRADA', 'Sesión inválida o expirada', status.HTTP_404_NOT_FOUND)
        return respuesta_exitosa(anonimo.to_dict())
