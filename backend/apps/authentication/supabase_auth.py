import jwt
from jwt import PyJWKClient
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

_jwks_client = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


class SupabaseUser:
    def __init__(self, payload: dict):
        self.id = payload.get('sub')
        self.email = payload.get('email', '')
        self.is_authenticated = True
        self.payload = payload

    def __str__(self):
        return self.email


class SupabaseAuthentication(BaseAuthentication):
    def authenticate_header(self, request):
        return 'Bearer realm="api"'

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization', '')
        token = None

        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ', 1)[1]
            print(f"[DEBUG AUTH] Token encontrado en Header Authorization")
        
        # PLAN B: Si no hay header, buscar en cookies (Cookie-based session)
        if not token:
            token = request.COOKIES.get('scammer_session')
            if token:
                print(f"[DEBUG AUTH] Token encontrado en COOKIE 'scammer_session'")
            else:
                # LISTADO DE TODAS LAS COOKIES PARA DEBUG
                print(f"[DEBUG AUTH] No hay cookie 'scammer_session'. Cookies recibidas: {list(request.COOKIES.keys())}")

        if not token:
            return None

        try:
            header = jwt.get_unverified_header(token)
            alg = header.get('alg', 'HS256')
            
            # Leeway de 30 segundos para evitar errores por clock skew entre servidores
            decode_kwargs = {
                'algorithms': ['HS256', 'ES256', 'RS256'],
                'audience': 'authenticated',
                'leeway': 30
            }

            if alg == 'HS256' and settings.SUPABASE_JWT_SECRET:
                payload = jwt.decode(token, settings.SUPABASE_JWT_SECRET, **decode_kwargs)
            else:
                signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
                payload = jwt.decode(token, signing_key.key, **decode_kwargs)
            
            print(f"DEBUG: Autenticación exitosa para: {payload.get('email')}")

        except jwt.ExpiredSignatureError:
            print("AUTH_ERROR: Token expirado")
            raise AuthenticationFailed('Token expirado. Inicia sesión nuevamente.')
        except jwt.InvalidAudienceError:
            print("AUTH_ERROR: Audiencia incorrecta")
            raise AuthenticationFailed('Token inválido: audiencia incorrecta.')
        except jwt.InvalidTokenError as e:
            print(f"AUTH_ERROR: {str(e)}")
            raise AuthenticationFailed(f'Token inválido: {e}')

        return (SupabaseUser(payload), token)
