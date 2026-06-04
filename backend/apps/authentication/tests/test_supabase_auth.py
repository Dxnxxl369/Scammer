import time
import jwt
import pytest
from django.test import RequestFactory
from rest_framework.exceptions import AuthenticationFailed
from apps.authentication.supabase_auth import SupabaseAuthentication, SupabaseUser

SECRET = 'test-secret-key'
AUDIENCE = 'authenticated'


def make_token(payload_extra=None, expired=False, secret=SECRET):
    now = int(time.time())
    payload = {
        'sub': 'user-uuid-123',
        'email': 'test@example.com',
        'aud': AUDIENCE,
        'iat': now - 10,
        'exp': (now - 5) if expired else (now + 3600),
    }
    if payload_extra:
        payload.update(payload_extra)
    return jwt.encode(payload, secret, algorithm='HS256')


@pytest.fixture(autouse=True)
def patch_jwt_secret(settings):
    settings.SUPABASE_JWT_SECRET = SECRET


def make_request(token=None):
    factory = RequestFactory()
    headers = {}
    if token:
        headers['HTTP_AUTHORIZATION'] = f'Bearer {token}'
    return factory.get('/api/health/', **headers)


# ─── Tests ────────────────────────────────────────────────────────────────────

def test_jwt_valido_devuelve_user():
    token = make_token()
    request = make_request(token)
    auth = SupabaseAuthentication()
    result = auth.authenticate(request)
    assert result is not None
    user, returned_token = result
    assert isinstance(user, SupabaseUser)
    assert user.email == 'test@example.com'
    assert user.is_authenticated is True
    assert returned_token == token


def test_jwt_expirado_devuelve_error():
    token = make_token(expired=True)
    request = make_request(token)
    auth = SupabaseAuthentication()
    with pytest.raises(AuthenticationFailed) as exc:
        auth.authenticate(request)
    assert 'expirado' in str(exc.value.detail).lower()


def test_jwt_invalido_devuelve_error():
    request = make_request('esto.no.es.un.jwt.valido')
    auth = SupabaseAuthentication()
    with pytest.raises(AuthenticationFailed) as exc:
        auth.authenticate(request)
    assert 'inválido' in str(exc.value.detail).lower()


def test_sin_token_devuelve_none():
    request = make_request()
    auth = SupabaseAuthentication()
    result = auth.authenticate(request)
    assert result is None


@pytest.mark.django_db
def test_health_check_responde_200(client):
    response = client.get('/api/health/')
    assert response.status_code == 200
    data = response.json()
    assert 'backend' in data
    assert 'mongodb' in data
    assert 'supabase' in data
    assert data['backend'] == 'ok'
