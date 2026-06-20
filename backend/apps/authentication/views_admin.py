from rest_framework.views import APIView
from rest_framework import status
from .permissions import EsAdmin
from .services import AdminService
from .serializers import CrearUsuarioAdminSerializer, ActualizarUsuarioAdminSerializer
from .responses import respuesta_exitosa, respuesta_error


def _ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class ListarUsuariosView(APIView):
    permission_classes = [EsAdmin]

    def get(self, request):
        resultado = AdminService.listar_usuarios(
            rol=request.query_params.get('rol'),
            plan=request.query_params.get('plan'),
            bloqueado=request.query_params.get('bloqueado') == 'true' if 'bloqueado' in request.query_params else None,
            busqueda=request.query_params.get('q'),
            pagina=int(request.query_params.get('pagina', 1)),
            por_pagina=int(request.query_params.get('por_pagina', 20)),
        )
        return respuesta_exitosa(resultado)

    def post(self, request):
        """Crear un usuario nuevo y asignarle rol/plan."""
        serializer = CrearUsuarioAdminSerializer(data=request.data)
        if not serializer.is_valid():
            primer_error = next(iter(serializer.errors.values()))[0]
            return respuesta_error('VALIDACION', str(primer_error), status.HTTP_400_BAD_REQUEST)

        datos = serializer.validated_data
        usuario, error = AdminService.crear_usuario(
            correo=datos['correo'],
            nombre_usuario=datos['nombre_usuario'],
            password=datos['password'],
            nombre_completo=datos.get('nombre_completo'),
            rol=datos.get('rol', 'usuario'),
            plan=datos.get('plan', 'gratis'),
            pais=datos.get('pais', 'BO'),
            ip=_ip(request),
        )
        if error:
            codigo_http = status.HTTP_409_CONFLICT if 'DUPLICADO' in error else status.HTTP_400_BAD_REQUEST
            return respuesta_error(error, 'No se pudo crear el usuario', codigo_http)
        return respuesta_exitosa(usuario.to_dict(), mensaje='Usuario creado correctamente', codigo_http=status.HTTP_201_CREATED)


class DetalleUsuarioView(APIView):
    permission_classes = [EsAdmin]

    def get(self, request, id_supabase):
        usuario, error = AdminService.obtener_usuario(id_supabase)
        if error:
            return respuesta_error(error, 'Usuario no encontrado', status.HTTP_404_NOT_FOUND)
        return respuesta_exitosa(usuario.to_dict())

    def put(self, request, id_supabase):
        return self._actualizar(request, id_supabase)

    def patch(self, request, id_supabase):
        return self._actualizar(request, id_supabase)

    def _actualizar(self, request, id_supabase):
        serializer = ActualizarUsuarioAdminSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            primer_error = next(iter(serializer.errors.values()))[0]
            return respuesta_error('VALIDACION', str(primer_error), status.HTTP_400_BAD_REQUEST)

        # Proteccion: el admin no puede auto-degradarse de rol
        propio = getattr(request.user, 'id', None) == id_supabase
        if propio and serializer.validated_data.get('rol') == 'usuario':
            return respuesta_error('AUTO_DEGRADACION', 'No puedes quitarte a ti mismo el rol de administrador.', status.HTTP_400_BAD_REQUEST)

        usuario, error = AdminService.actualizar_usuario(id_supabase, serializer.validated_data, ip=_ip(request))
        if error:
            codigo_http = status.HTTP_404_NOT_FOUND if error == 'NO_ENCONTRADO' else (
                status.HTTP_409_CONFLICT if 'DUPLICADO' in error else status.HTTP_400_BAD_REQUEST
            )
            return respuesta_error(error, 'No se pudo actualizar el usuario', codigo_http)
        return respuesta_exitosa(usuario.to_dict(), mensaje='Usuario actualizado')

    def delete(self, request, id_supabase):
        # Proteccion: el admin no puede eliminarse a si mismo
        if getattr(request.user, 'id', None) == id_supabase:
            return respuesta_error('AUTO_ELIMINACION', 'No puedes eliminar tu propia cuenta de administrador.', status.HTTP_400_BAD_REQUEST)

        ok, error = AdminService.eliminar_usuario(id_supabase, ip=_ip(request))
        if error:
            codigo_http = status.HTTP_404_NOT_FOUND if error == 'NO_ENCONTRADO' else status.HTTP_400_BAD_REQUEST
            return respuesta_error(error, 'No se pudo eliminar el usuario', codigo_http)
        return respuesta_exitosa(mensaje='Usuario eliminado correctamente')


class BloquearUsuarioView(APIView):
    permission_classes = [EsAdmin]

    def patch(self, request, id_supabase):
        usuario, error = AdminService.bloquear_usuario(id_supabase)
        if error:
            return respuesta_error(error, 'No se pudo bloquear', status.HTTP_404_NOT_FOUND)
        return respuesta_exitosa(usuario.to_dict(), mensaje='Usuario bloqueado')


class DesbloquearUsuarioView(APIView):
    permission_classes = [EsAdmin]

    def patch(self, request, id_supabase):
        usuario, error = AdminService.desbloquear_usuario(id_supabase)
        if error:
            return respuesta_error(error, 'No se pudo desbloquear', status.HTTP_404_NOT_FOUND)
        return respuesta_exitosa(usuario.to_dict(), mensaje='Usuario desbloqueado')


class CambiarPlanView(APIView):
    permission_classes = [EsAdmin]

    def patch(self, request, id_supabase):
        plan = request.data.get('plan')
        usuario, error = AdminService.cambiar_plan(id_supabase, plan)
        if error:
            return respuesta_error(error, 'No se pudo cambiar el plan', status.HTTP_400_BAD_REQUEST)
        return respuesta_exitosa(usuario.to_dict(), mensaje='Plan actualizado')


class CambiarRolView(APIView):
    permission_classes = [EsAdmin]

    def patch(self, request, id_supabase):
        rol = request.data.get('rol')
        usuario, error = AdminService.cambiar_rol(id_supabase, rol)
        if error:
            return respuesta_error(error, 'No se pudo cambiar el rol', status.HTTP_400_BAD_REQUEST)
        return respuesta_exitosa(usuario.to_dict(), mensaje='Rol actualizado')


class EstadisticasView(APIView):
    permission_classes = [EsAdmin]

    def get(self, request):
        return respuesta_exitosa(AdminService.estadisticas())
