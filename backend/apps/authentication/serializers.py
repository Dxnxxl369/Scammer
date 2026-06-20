import re
from rest_framework import serializers


def validar_nombre_usuario(value):
    if not re.match(r'^[a-z0-9_]+$', value.lower()):
        raise serializers.ValidationError('Solo letras minúsculas, números y guiones bajos')
    return value.lower()


class UsuarioSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    id_supabase = serializers.CharField(read_only=True)
    correo = serializers.EmailField()
    nombre_usuario = serializers.CharField(min_length=3, max_length=50)
    nombre_completo = serializers.CharField(required=False, allow_blank=True, max_length=120)
    rol = serializers.ChoiceField(choices=['administrador', 'usuario'], read_only=True)
    plan = serializers.ChoiceField(choices=['gratis', 'pro'], read_only=True)
    pais = serializers.CharField(max_length=2, default='BO')
    activo = serializers.BooleanField(read_only=True)
    bloqueado = serializers.BooleanField(read_only=True)
    intentos_usados = serializers.IntegerField(read_only=True)
    fecha_creacion = serializers.DateTimeField(read_only=True)

    def validate_nombre_usuario(self, value):
        return validar_nombre_usuario(value)


class RegistroSerializer(serializers.Serializer):
    correo = serializers.EmailField()
    nombre_usuario = serializers.CharField(min_length=3, max_length=50)
    nombre_completo = serializers.CharField(required=False, allow_blank=True, max_length=120)
    pais = serializers.CharField(max_length=2, default='BO')

    def validate_nombre_usuario(self, value):
        return validar_nombre_usuario(value)


class ActualizarUsuarioSerializer(serializers.Serializer):
    nombre_completo = serializers.CharField(required=False, allow_blank=True, max_length=120)
    pais = serializers.CharField(required=False, max_length=2)


class CrearUsuarioAdminSerializer(serializers.Serializer):
    """El administrador crea un usuario completo y le asigna rol/plan."""
    correo = serializers.EmailField()
    nombre_usuario = serializers.CharField(min_length=3, max_length=50)
    password = serializers.CharField(min_length=6, max_length=72, write_only=True)
    nombre_completo = serializers.CharField(required=False, allow_blank=True, max_length=120)
    rol = serializers.ChoiceField(choices=['administrador', 'usuario'], default='usuario')
    plan = serializers.ChoiceField(choices=['gratis', 'starter', 'pro', 'elite'], default='gratis')
    pais = serializers.CharField(max_length=2, default='BO')

    def validate_nombre_usuario(self, value):
        return validar_nombre_usuario(value)


class ActualizarUsuarioAdminSerializer(serializers.Serializer):
    """Edicion total de un usuario por parte del administrador (todos opcionales)."""
    correo = serializers.EmailField(required=False)
    nombre_usuario = serializers.CharField(required=False, min_length=3, max_length=50)
    password = serializers.CharField(required=False, min_length=6, max_length=72, write_only=True)
    nombre_completo = serializers.CharField(required=False, allow_blank=True, max_length=120)
    rol = serializers.ChoiceField(required=False, choices=['administrador', 'usuario'])
    plan = serializers.ChoiceField(required=False, choices=['gratis', 'starter', 'pro', 'elite'])
    pais = serializers.CharField(required=False, max_length=2)
    activo = serializers.BooleanField(required=False)
    bloqueado = serializers.BooleanField(required=False)

    def validate_nombre_usuario(self, value):
        return validar_nombre_usuario(value)


class AnonimoSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    id_sesion = serializers.CharField(read_only=True)
    ip = serializers.CharField(read_only=True)
    navegador = serializers.CharField(read_only=True)
    pais = serializers.CharField(read_only=True)
    intentos_usados = serializers.IntegerField(read_only=True)
    fecha_creacion = serializers.DateTimeField(read_only=True)
    fecha_expiracion = serializers.DateTimeField(read_only=True)
