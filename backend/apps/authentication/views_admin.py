from rest_framework.views import APIView
from rest_framework import status
from .permissions import EsAdmin
from .services import AdminService
from .responses import respuesta_exitosa, respuesta_error


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
