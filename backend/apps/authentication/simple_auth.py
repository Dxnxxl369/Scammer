from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import Usuario

class SimpleIDUser:
    def __init__(self, usuario_mongo):
        self.id = usuario_mongo.id_supabase
        self.email = usuario_mongo.correo
        self.rol = usuario_mongo.rol
        self.is_authenticated = True

    def __str__(self):
        return self.email

class SimpleIDAuthentication(BaseAuthentication):
    """
    Autenticación simplificada: Confía en el ID enviado en la cabecera X-User-ID.
    Ideal para máxima estabilidad y evitar problemas de expiración de tokens o cookies.
    """
    def authenticate(self, request):
        user_id = request.headers.get('X-User-ID')
        
        if not user_id:
            return None

        try:
            # Buscamos al usuario directamente en nuestra base de datos MongoDB
            usuario = Usuario.objects(id_supabase=user_id).first()
            
            if not usuario:
                # Si el ID no existe en nuestra DB, no permitimos el paso
                return None

            print(f"[AUTH SIMPLE] Usuario identificado: {usuario.correo}")
            return (SimpleIDUser(usuario), None)

        except Exception as e:
            print(f"[AUTH SIMPLE] Error: {str(e)}")
            return None
