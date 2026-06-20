"""
Cliente para la Admin API de Supabase Auth.

Permite que un administrador del sistema cree, edite o elimine usuarios reales
en Supabase (no solo en MongoDB). Esto es indispensable porque todo el login
del SaaS se valida contra Supabase: un usuario que solo viva en Mongo nunca
podria iniciar sesion.

Requiere la SUPABASE_SECRET_KEY (service_role / secret key), que es la misma
que ya se usa en LoginView para el grant de password.
"""
import requests
from django.conf import settings

TIMEOUT = 15


def _admin_headers() -> dict:
    secret = settings.SUPABASE_SECRET_KEY
    return {
        "apikey": secret,
        "Authorization": f"Bearer {secret}",
        "Content-Type": "application/json",
    }


def _base_url() -> str:
    return f"{settings.SUPABASE_URL}/auth/v1/admin/users"


def crear_usuario_auth(correo: str, password: str, metadata: dict | None = None):
    """
    Crea un usuario en Supabase Auth con el correo confirmado.
    Retorna (id_supabase, None) en exito o (None, mensaje_error).
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SECRET_KEY:
        return None, 'Supabase no esta configurado en el servidor (faltan SUPABASE_URL / SUPABASE_SECRET_KEY).'

    payload = {
        "email": correo,
        "password": password,
        "email_confirm": True,
    }
    if metadata:
        payload["user_metadata"] = metadata

    try:
        resp = requests.post(_base_url(), json=payload, headers=_admin_headers(), timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        return None, f'No se pudo conectar con Supabase: {e}'

    if resp.status_code in (200, 201):
        data = resp.json()
        user_id = data.get('id') or data.get('user', {}).get('id')
        if not user_id:
            return None, 'Supabase no devolvio un identificador de usuario.'
        return user_id, None

    # Supabase responde con msg / error_description / error
    try:
        err = resp.json()
        mensaje = err.get('msg') or err.get('error_description') or err.get('error') or str(err)
    except ValueError:
        mensaje = resp.text or f'Error HTTP {resp.status_code}'
    return None, mensaje


def actualizar_usuario_auth(id_supabase: str, correo: str | None = None, password: str | None = None):
    """
    Actualiza correo y/o contrasena de un usuario en Supabase Auth.
    Retorna (True, None) en exito o (None, mensaje_error).
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SECRET_KEY:
        return None, 'Supabase no esta configurado en el servidor.'

    payload = {}
    if correo:
        payload['email'] = correo
        payload['email_confirm'] = True
    if password:
        payload['password'] = password

    if not payload:
        return True, None  # nada que actualizar en Supabase

    try:
        resp = requests.put(f"{_base_url()}/{id_supabase}", json=payload, headers=_admin_headers(), timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        return None, f'No se pudo conectar con Supabase: {e}'

    if resp.status_code == 200:
        return True, None

    try:
        err = resp.json()
        mensaje = err.get('msg') or err.get('error_description') or err.get('error') or str(err)
    except ValueError:
        mensaje = resp.text or f'Error HTTP {resp.status_code}'
    return None, mensaje


def eliminar_usuario_auth(id_supabase: str):
    """
    Elimina un usuario de Supabase Auth.
    Retorna (True, None) en exito o (None, mensaje_error).
    Si el usuario ya no existe en Supabase (404) se considera exito idempotente.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SECRET_KEY:
        return None, 'Supabase no esta configurado en el servidor.'

    try:
        resp = requests.delete(f"{_base_url()}/{id_supabase}", headers=_admin_headers(), timeout=TIMEOUT)
    except requests.exceptions.RequestException as e:
        return None, f'No se pudo conectar con Supabase: {e}'

    if resp.status_code in (200, 204, 404):
        return True, None

    try:
        err = resp.json()
        mensaje = err.get('msg') or err.get('error_description') or err.get('error') or str(err)
    except ValueError:
        mensaje = resp.text or f'Error HTTP {resp.status_code}'
    return None, mensaje
