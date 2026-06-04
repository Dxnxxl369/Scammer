import pytest
from apps.authentication.services import UsuarioService


def crear_usuario_test(id_sup='test-uuid-123', correo='test@test.com', username='testuser'):
    UsuarioService.crear_desde_supabase(id_sup, correo, username)


# ─── Registro ─────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_registro_exitoso_devuelve_201(client, auth_headers):
    resp = client.post('/api/auth/registro/', {
        'correo': 'nuevo@test.com',
        'nombre_usuario': 'nuevo_user',
    }, content_type='application/json', **auth_headers)
    assert resp.status_code == 201
    assert resp.json()['exito'] is True


@pytest.mark.django_db
def test_registro_correo_duplicado_devuelve_409(client, auth_headers):
    crear_usuario_test(correo='dup@test.com', username='user1')
    resp = client.post('/api/auth/registro/', {
        'correo': 'dup@test.com',
        'nombre_usuario': 'user2',
    }, content_type='application/json', **auth_headers)
    assert resp.status_code == 409
    assert resp.json()['error']['codigo'] == 'CORREO_DUPLICADO'


@pytest.mark.django_db
def test_registro_username_duplicado_devuelve_409(client, auth_headers):
    crear_usuario_test(correo='a@test.com', username='same_name')
    resp = client.post('/api/auth/registro/', {
        'correo': 'b@test.com',
        'nombre_usuario': 'same_name',
    }, content_type='application/json', **auth_headers)
    assert resp.status_code == 409
    assert resp.json()['error']['codigo'] == 'NOMBRE_USUARIO_DUPLICADO'


@pytest.mark.django_db
def test_registro_sin_jwt_devuelve_401(client):
    resp = client.post('/api/auth/registro/', {
        'correo': 'x@test.com',
        'nombre_usuario': 'xuser',
    }, content_type='application/json')
    assert resp.status_code == 401


@pytest.mark.django_db
def test_registro_username_invalido_devuelve_400(client, auth_headers):
    resp = client.post('/api/auth/registro/', {
        'correo': 'x@test.com',
        'nombre_usuario': 'user name con espacios',
    }, content_type='application/json', **auth_headers)
    assert resp.status_code == 400


@pytest.mark.django_db
def test_registro_correo_invalido_devuelve_400(client, auth_headers):
    resp = client.post('/api/auth/registro/', {
        'correo': 'no-es-un-correo',
        'nombre_usuario': 'validuser',
    }, content_type='application/json', **auth_headers)
    assert resp.status_code == 400


# ─── Yo ───────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_yo_con_jwt_valido_devuelve_usuario(client, auth_headers):
    crear_usuario_test()
    resp = client.get('/api/auth/yo/', **auth_headers)
    assert resp.status_code == 200
    assert resp.json()['datos']['correo'] == 'test@test.com'


@pytest.mark.django_db
def test_yo_sin_jwt_devuelve_401(client):
    resp = client.get('/api/auth/yo/')
    assert resp.status_code == 401


@pytest.mark.django_db
def test_yo_usuario_no_registrado_devuelve_404(client, auth_headers):
    resp = client.get('/api/auth/yo/', **auth_headers)
    assert resp.status_code == 404


@pytest.mark.django_db
def test_actualizar_yo_actualiza_nombre_completo(client, auth_headers):
    crear_usuario_test()
    resp = client.patch('/api/auth/yo/', {'nombre_completo': 'Juan Pérez'},
                        content_type='application/json', **auth_headers)
    assert resp.status_code == 200
    assert resp.json()['datos']['nombre_completo'] == 'Juan Pérez'


@pytest.mark.django_db
def test_actualizar_yo_no_permite_cambiar_correo(client, auth_headers):
    crear_usuario_test()
    resp = client.patch('/api/auth/yo/', {'correo': 'hacked@test.com'},
                        content_type='application/json', **auth_headers)
    assert resp.status_code == 200
    usuario_resp = client.get('/api/auth/yo/', **auth_headers)
    assert usuario_resp.json()['datos']['correo'] == 'test@test.com'


@pytest.mark.django_db
def test_actualizar_yo_no_permite_cambiar_rol(client, auth_headers):
    crear_usuario_test()
    resp = client.patch('/api/auth/yo/', {'rol': 'administrador'},
                        content_type='application/json', **auth_headers)
    assert resp.status_code == 200
    usuario_resp = client.get('/api/auth/yo/', **auth_headers)
    assert usuario_resp.json()['datos']['rol'] == 'usuario'


# ─── Anónimos ─────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_crear_sesion_anonima_devuelve_201_con_id_sesion(client):
    resp = client.post('/api/anonimos/sesion/', content_type='application/json')
    assert resp.status_code == 201
    assert 'id_sesion' in resp.json()['datos']


@pytest.mark.django_db
def test_crear_sesion_guarda_ip_y_navegador(client):
    resp = client.post('/api/anonimos/sesion/', content_type='application/json',
                       HTTP_USER_AGENT='TestBrowser/1.0')
    assert resp.status_code == 201
    assert resp.json()['datos']['navegador'] == 'TestBrowser/1.0'


@pytest.mark.django_db
def test_obtener_sesion_existente_devuelve_200(client):
    create_resp = client.post('/api/anonimos/sesion/', content_type='application/json')
    id_sesion = create_resp.json()['datos']['id_sesion']
    resp = client.get(f'/api/anonimos/sesion/{id_sesion}/')
    assert resp.status_code == 200


@pytest.mark.django_db
def test_obtener_sesion_inexistente_devuelve_404(client):
    resp = client.get('/api/anonimos/sesion/no-existe-uuid/')
    assert resp.status_code == 404


@pytest.mark.django_db
def test_incrementar_intentos_aumenta_contador(client):
    create_resp = client.post('/api/anonimos/sesion/', content_type='application/json')
    id_sesion = create_resp.json()['datos']['id_sesion']
    client.post(f'/api/anonimos/sesion/{id_sesion}/intento/', content_type='application/json')
    resp = client.get(f'/api/anonimos/sesion/{id_sesion}/')
    assert resp.json()['datos']['intentos_usados'] == 1


@pytest.mark.django_db
def test_incrementar_intentos_sesion_inexistente_devuelve_404(client):
    resp = client.post('/api/anonimos/sesion/no-existe/intento/', content_type='application/json')
    assert resp.status_code == 404
