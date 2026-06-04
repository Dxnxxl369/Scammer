from rest_framework.permissions import BasePermission
from .models import Usuario


class EsAdmin(BasePermission):
    message = 'Requiere permisos de administrador'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        usuario = Usuario.objects(id_supabase=request.user.id).first()
        return usuario is not None and usuario.rol == 'administrador' and usuario.activo


class EsUsuario(BasePermission):
    """Cualquier usuario autenticado y activo (admin o usuario)."""
    message = 'Cuenta no encontrada o desactivada'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        usuario = Usuario.objects(id_supabase=request.user.id).first()
        return usuario is not None and usuario.activo and not usuario.bloqueado
