from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from .services import AnalisisService, BitacoraService, NotificacionService
from apps.authentication.responses import respuesta_exitosa, respuesta_error
from apps.authentication.permissions import EsAdmin

class AnalisisBaseView(APIView):
    permission_classes = [AllowAny]

    def obtener_identificador(self, request):
        # 1. Prioridad: ID Directo (Simple Auth)
        # Este ID viene del LocalStorage del frontend
        user_id = request.headers.get('X-User-ID')
        if user_id and user_id not in ['undefined', 'null', 'None', '']:
            print(f"[DEBUG VIEWS] Identidad Simple detectada: {user_id}")
            return user_id

        # 2. Fallback: Usuario autenticado por middleware (si lo hubiera)
        if request.user and request.user.is_authenticated:
            print(f"[DEBUG VIEWS] Usuario por middleware detectado: {request.user.id}")
            return request.user.id
            
        # 3. Fallback: Sesión Anónima
        session_id = request.headers.get('X-Session-Id')
        if not session_id and request.COOKIES:
            session_id = request.COOKIES.get('id_sesion_anonimo')
            
        print(f"[DEBUG VIEWS] Fallback a Sesión Anónima: {session_id}")
        return session_id

    def obtener_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')

class AnalizarTextoView(AnalisisBaseView):
    def post(self, request):
        identificador = self.obtener_identificador(request)
        if not identificador:
            return respuesta_error('IDENTIFICADOR_REQUERIDO', 'No hay sesión activa', status.HTTP_401_UNAUTHORIZED)
        texto = request.data.get('texto')
        if not texto:
            return respuesta_error('DATOS_FALTANTES', 'Se requiere texto', status.HTTP_400_BAD_REQUEST)
        try:
            analisis = AnalisisService.analizar_texto(
                identificador, 
                texto, 
                self.obtener_ip(request),
                nombre_archivo=request.data.get('nombre_archivo'),
                extension=request.data.get('extension')
            )
            return respuesta_exitosa(analisis.to_dict())
        except Exception as e:
            return respuesta_error('ERROR_ANALISIS', str(e), status.HTTP_500_INTERNAL_SERVER_ERROR)

class AnalizarCodigoView(AnalisisBaseView):
    def post(self, request):
        identificador = self.obtener_identificador(request)
        if not identificador:
            return respuesta_error('IDENTIFICADOR_REQUERIDO', 'No hay sesión activa', status.HTTP_401_UNAUTHORIZED)
        codigo = request.data.get('codigo')
        if not codigo or not str(codigo).strip():
            return respuesta_error('DATOS_FALTANTES', 'Se requiere código', status.HTTP_400_BAD_REQUEST)
        lenguaje = request.data.get('lenguaje')
        try:
            from .code_detector import analizar_codigo, ESTADO_MOTOR
            resultado = analizar_codigo(identificador, str(codigo), lenguaje, self.obtener_ip(request))
            if resultado.get('estado') == ESTADO_MOTOR:
                return respuesta_error('MOTOR_NO_DISPONIBLE', resultado.get('detalles', 'Motor no disponible'), status.HTTP_503_SERVICE_UNAVAILABLE)
            return respuesta_exitosa(resultado)
        except Exception as e:
            return respuesta_error('ERROR_ANALISIS', str(e), status.HTTP_500_INTERNAL_SERVER_ERROR)


class AnalizarSmsView(AnalisisBaseView):
    def post(self, request):
        identificador = self.obtener_identificador(request)
        if not identificador:
            return respuesta_error('IDENTIFICADOR_REQUERIDO', 'No hay sesión activa', status.HTTP_401_UNAUTHORIZED)
        texto = request.data.get('texto') or request.data.get('mensaje')
        if not texto or not str(texto).strip():
            return respuesta_error('DATOS_FALTANTES', 'Se requiere el texto del SMS', status.HTTP_400_BAD_REQUEST)
        remitente = request.data.get('remitente')
        auto = str(request.data.get('auto', '')).lower() in ('true', '1', 'yes')
        try:
            from .sms_detector import analizar_sms
            resultado = analizar_sms(identificador, str(texto), remitente, self.obtener_ip(request), auto=auto)
            return respuesta_exitosa(resultado)
        except Exception as e:
            return respuesta_error('ERROR_ANALISIS', str(e), status.HTTP_500_INTERNAL_SERVER_ERROR)


class AnalizarImagenView(AnalisisBaseView):
    def post(self, request):
        identificador = self.obtener_identificador(request)
        if not identificador: return respuesta_error('IDENTIFICADOR_REQUERIDO', 'Sin sesión', status.HTTP_401_UNAUTHORIZED)
        if 'archivo' not in request.FILES: return respuesta_error('DATOS_FALTANTES', 'Sin imagen', status.HTTP_400_BAD_REQUEST)
        try:
            # Capturar metadatos si vienen en el body (multipart)
            nombre_archivo = request.data.get('nombre_archivo')
            extension = request.data.get('extension')
            
            analisis = AnalisisService.analizar_imagen(
                identificador, 
                request.FILES['archivo'], 
                self.obtener_ip(request)
            )
            
            # Si el servicio no los puso (por compatibilidad vieja), los ponemos aquí
            if nombre_archivo: analisis.update(set__nombre_archivo=nombre_archivo)
            if extension: analisis.update(set__extension=extension)
            
            return respuesta_exitosa(analisis.to_dict())
        except Exception as e:
            import traceback
            print(f"[DEBUG ERROR 500 IMAGEN]: {str(e)}")
            print(traceback.format_exc())
            return respuesta_error('ERROR_ANALISIS', str(e), status.HTTP_500_INTERNAL_SERVER_ERROR)

class AnalizarVideoView(AnalisisBaseView):
    def post(self, request):
        identificador = self.obtener_identificador(request)
        if not identificador: return respuesta_error('IDENTIFICADOR_REQUERIDO', 'Sin sesión', status.HTTP_401_UNAUTHORIZED)
        if 'archivo' not in request.FILES: return respuesta_error('DATOS_FALTANTES', 'Sin video', status.HTTP_400_BAD_REQUEST)
        try:
            nombre_archivo = request.data.get('nombre_archivo')
            extension = request.data.get('extension')

            analisis = AnalisisService.analizar_video(
                identificador, 
                request.FILES['archivo'], 
                self.obtener_ip(request)
            )

            if nombre_archivo: analisis.update(set__nombre_archivo=nombre_archivo)
            if extension: analisis.update(set__extension=extension)

            return respuesta_exitosa(analisis.to_dict())
        except Exception as e:
            import traceback
            print(f"[DEBUG ERROR 500 VIDEO]: {str(e)}")
            print(traceback.format_exc())
            return respuesta_error('ERROR_ANALISIS', str(e), status.HTTP_500_INTERNAL_SERVER_ERROR)

class AnalizarAudioView(AnalisisBaseView):
    def post(self, request):
        identificador = self.obtener_identificador(request)
        if not identificador: return respuesta_error('IDENTIFICADOR_REQUERIDO', 'Sin sesión', status.HTTP_401_UNAUTHORIZED)
        if 'archivo' not in request.FILES: return respuesta_error('DATOS_FALTANTES', 'Sin audio', status.HTTP_400_BAD_REQUEST)
        try:
            nombre_archivo = request.data.get('nombre_archivo')
            extension = request.data.get('extension')

            analisis = AnalisisService.analizar_audio(
                identificador, 
                request.FILES['archivo'], 
                self.obtener_ip(request)
            )

            if nombre_archivo: analisis.update(set__nombre_archivo=nombre_archivo)
            if extension: analisis.update(set__extension=extension)

            return respuesta_exitosa(analisis.to_dict())
        except Exception as e:
            import traceback
            print(f"[DEBUG ERROR 500 AUDIO]: {str(e)}")
            print(traceback.format_exc())
            return respuesta_error('ERROR_ANALISIS', str(e), status.HTTP_500_INTERNAL_SERVER_ERROR)

class AnalizarURLView(AnalisisBaseView):
    def post(self, request):
        identificador = self.obtener_identificador(request)
        if not identificador: return respuesta_error('IDENTIFICADOR_REQUERIDO', 'Sin sesión', status.HTTP_401_UNAUTHORIZED)
        url = request.data.get('url')
        if not url: return respuesta_error('DATOS_FALTANTES', 'Sin URL', status.HTTP_400_BAD_REQUEST)
        try:
            analisis = AnalisisService.analizar_url(identificador, url, self.obtener_ip(request))
            return respuesta_exitosa(analisis.to_dict())
        except Exception as e:
            return respuesta_error('ERROR_ANALISIS', str(e), status.HTTP_500_INTERNAL_SERVER_ERROR)

class AnalizarArchivoView(AnalisisBaseView):
    def post(self, request):
        identificador = self.obtener_identificador(request)
        if not identificador: return respuesta_error('IDENTIFICADOR_REQUERIDO', 'Sin sesión', status.HTTP_401_UNAUTHORIZED)
        if 'archivo' not in request.FILES: return respuesta_error('DATOS_FALTANTES', 'Sin archivo', status.HTTP_400_BAD_REQUEST)
        try:
            analisis = AnalisisService.analizar_archivo(identificador, request.FILES['archivo'], self.obtener_ip(request))
            return respuesta_exitosa(analisis.to_dict())
        except Exception as e:
            return respuesta_error('ERROR_ANALISIS', str(e), status.HTTP_500_INTERNAL_SERVER_ERROR)

class HistorialAnalisisView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        historial = AnalisisService.obtener_historial(request.user.id)
        return respuesta_exitosa([a.to_dict() for a in historial])

class AdminBitacoraView(APIView):
    # permission_classes = [EsAdmin] # temporal para debug de roles si falla
    def get(self, request):
        logs = AnalisisService.obtener_bitacora()
        return respuesta_exitosa(logs)

class NotificacionesView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        solo_no_leidas = request.query_params.get('unread') == 'true'
        notifs = NotificacionService.listar(request.user.id, solo_no_leidas)
        return respuesta_exitosa([n.to_dict() for n in notifs])
    def post(self, request):
        NotificacionService.marcar_todas_leidas(request.user.id)
        return respuesta_exitosa(mensaje='Todas leídas')

class MarcarNotificacionLeidaView(APIView):
    permission_classes = [IsAuthenticated]
    def patch(self, request, notif_id):
        NotificacionService.marcar_como_leida(notif_id)
        return respuesta_exitosa(mensaje='Leída')

class PreferenciasNotificacionView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        pref = NotificacionService.obtener_preferencias(request.user.id)
        return respuesta_exitosa({'global_push': pref.global_push, 'canales': pref.canales})
    def patch(self, request):
        pref = NotificacionService.guardar_preferencias(request.user.id, request.data)
        return respuesta_exitosa({'global_push': pref.global_push, 'canales': pref.canales})
