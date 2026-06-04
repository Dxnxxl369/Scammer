import time
import jwt
import pytest
import mongomock
import mongoengine
from django.conf import settings


@pytest.fixture(autouse=True)
def mongo_test_db():
    mongoengine.disconnect_all()
    mongoengine.connect(
        'test_db',
        mongo_client_class=mongomock.MongoClient,
        alias='default',
        uuidRepresentation='standard',
    )
    yield
    mongoengine.disconnect_all()


@pytest.fixture
def jwt_valido():
    payload = {
        'sub': 'test-uuid-123',
        'email': 'test@test.com',
        'aud': 'authenticated',
        'exp': int(time.time()) + 3600,
        'iat': int(time.time()),
    }
    return jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm='HS256')


@pytest.fixture
def auth_headers(jwt_valido):
    return {'HTTP_AUTHORIZATION': f'Bearer {jwt_valido}'}
