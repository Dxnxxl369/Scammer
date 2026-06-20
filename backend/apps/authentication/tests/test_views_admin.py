import time
import jwt
import pytest
from django.test import Client
from django.conf import settings
from apps.authentication.models import Usuario


def make_token(sub: str) -> str:
    payload = {
        'sub': sub,
        'email': f'{sub}@test.com',
        'aud': 'authenticated',
        'exp': int(time.time()) + 3600,
        'iat': int(time.time()),
    }
    return jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm='HS256')


def crear_usuario(
    id_supabase: str = 'user-001',
    correo: str = 'user@test.com',
    nombre_usuario: str = 'usuario1',
    rol: str = 'usuario',
    plan: str = 'gratis',
    bloqueado: bool = False,
) -> Usuario:
    u = Usuario(
        id_supabase=id_supabase,
        correo=correo,
        nombre_usuario=nombre_usuario,
        rol=rol,
        plan=plan,
        bloqueado=bloqueado,
        activo=True,
    )
    u.save()
    return u


@pytest.fixture
def admin_usuario():
    return crear_usuario('admin-001', 'admin@test.com', 'admin1', rol='administrador')


@pytest.fixture
def normal_usuario():
    return crear_usuario('user-001', 'user@test.com', 'user1')


@pytest.fixture
def admin_headers(admin_usuario):
    token = make_token(admin_usuario.id_supabase)
    return {'HTTP_AUTHORIZATION': f'Bearer {token}'}


@pytest.fixture
def user_headers(normal_usuario):
    token = make_token(normal_usuario.id_supabase)
    return {'HTTP_AUTHORIZATION': f'Bearer {token}'}


@pytest.mark.django_db
def test_listar_usuarios_requiere_rol_admin(client: Client):
    resp = client.get('/api/admin/usuarios/')
    assert resp.status_code == 401


@pytest.mark.django_db
def test_usuario_normal_no_puede_listar(client: Client, user_headers):
    resp = client.get('/api/admin/usuarios/', **user_headers)
    assert resp.status_code == 403


@pytest.mark.django_db
def test_admin_puede_listar_usuarios(client: Client, admin_headers):
    crear_usuario('other-001', 'other@test.com', 'other1')
    resp = client.get('/api/admin/usuarios/', **admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data['exito'] is True
    assert data['datos']['total'] >= 1


@pytest.mark.django_db
def test_admin_puede_filtrar_por_plan(client: Client, admin_headers):
    crear_usuario('pro-001', 'pro@test.com', 'prouser', plan='pro')
    resp = client.get('/api/admin/usuarios/?plan=pro', **admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    usuarios = data['datos']['usuarios']
    assert all(u['plan'] == 'pro' for u in usuarios)


@pytest.mark.django_db
def test_admin_puede_buscar_por_email(client: Client, admin_headers):
    crear_usuario('search-001', 'uniqueemail@test.com', 'searchuser')
    resp = client.get('/api/admin/usuarios/?q=uniqueemail', **admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    correos = [u['correo'] for u in data['datos']['usuarios']]
    assert any('uniqueemail' in c for c in correos)


@pytest.mark.django_db
def test_admin_puede_bloquear_usuario(client: Client, admin_headers):
    target = crear_usuario('target-001', 'target@test.com', 'targetuser')
    resp = client.patch(f'/api/admin/usuarios/{target.id_supabase}/bloquear/', **admin_headers)
    assert resp.status_code == 200
    target.reload()
    assert target.bloqueado is True


@pytest.mark.django_db
def test_admin_puede_desbloquear_usuario(client: Client, admin_headers):
    target = crear_usuario('target-002', 'target2@test.com', 'targetuser2', bloqueado=True)
    resp = client.patch(f'/api/admin/usuarios/{target.id_supabase}/desbloquear/', **admin_headers)
    assert resp.status_code == 200
    target.reload()
    assert target.bloqueado is False


@pytest.mark.django_db
def test_admin_puede_cambiar_plan(client: Client, admin_headers):
    import json
    target = crear_usuario('target-003', 'target3@test.com', 'targetuser3')
    resp = client.patch(
        f'/api/admin/usuarios/{target.id_supabase}/plan/',
        data=json.dumps({'plan': 'pro'}),
        content_type='application/json',
        **admin_headers,
    )
    assert resp.status_code == 200
    target.reload()
    assert target.plan == 'pro'


@pytest.mark.django_db
def test_plan_invalido_devuelve_400(client: Client, admin_headers):
    import json
    target = crear_usuario('target-004', 'target4@test.com', 'targetuser4')
    resp = client.patch(
        f'/api/admin/usuarios/{target.id_supabase}/plan/',
        data=json.dumps({'plan': 'enterprise'}),
        content_type='application/json',
        **admin_headers,
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_admin_puede_cambiar_rol(client: Client, admin_headers):
    import json
    target = crear_usuario('target-005', 'target5@test.com', 'targetuser5')
    resp = client.patch(
        f'/api/admin/usuarios/{target.id_supabase}/rol/',
        data=json.dumps({'rol': 'administrador'}),
        content_type='application/json',
        **admin_headers,
    )
    assert resp.status_code == 200
    target.reload()
    assert target.rol == 'administrador'


@pytest.mark.django_db
def test_estadisticas_retorna_conteos_correctos(client: Client, admin_headers):
    crear_usuario('stat-001', 'stat1@test.com', 'statuser1', plan='pro')
    crear_usuario('stat-002', 'stat2@test.com', 'statuser2', bloqueado=True)
    resp = client.get('/api/admin/estadisticas/', **admin_headers)
    assert resp.status_code == 200
    data = resp.json()['datos']
    assert 'total_usuarios' in data
    assert 'administradores' in data
    assert 'plan_pro' in data
    assert 'bloqueados' in data
    assert data['total_usuarios'] >= 1


# ============================================================
# CRUD de usuarios por el administrador
# ============================================================

@pytest.mark.django_db
def test_admin_puede_crear_usuario(client: Client, admin_headers, monkeypatch):
    import json
    from apps.authentication import supabase_admin
    monkeypatch.setattr(
        supabase_admin, 'crear_usuario_auth',
        lambda correo, password, metadata=None: ('nuevo-uid-123', None),
    )
    resp = client.post(
        '/api/admin/usuarios/',
        data=json.dumps({
            'correo': 'nuevo@test.com',
            'nombre_usuario': 'nuevoagente',
            'password': 'secreta123',
            'rol': 'administrador',
            'plan': 'pro',
        }),
        content_type='application/json',
        **admin_headers,
    )
    assert resp.status_code == 201
    data = resp.json()['datos']
    assert data['correo'] == 'nuevo@test.com'
    assert data['rol'] == 'administrador'
    assert data['plan'] == 'pro'
    assert Usuario.objects(id_supabase='nuevo-uid-123').first() is not None


@pytest.mark.django_db
def test_usuario_normal_no_puede_crear(client: Client, user_headers):
    import json
    resp = client.post(
        '/api/admin/usuarios/',
        data=json.dumps({'correo': 'x@test.com', 'nombre_usuario': 'xuser', 'password': 'secreta123'}),
        content_type='application/json',
        **user_headers,
    )
    assert resp.status_code == 403


@pytest.mark.django_db
def test_crear_usuario_correo_duplicado_devuelve_409(client: Client, admin_headers, monkeypatch):
    import json
    from apps.authentication import supabase_admin
    monkeypatch.setattr(supabase_admin, 'crear_usuario_auth', lambda correo, password, metadata=None: ('x', None))
    crear_usuario('dup-1', 'dup@test.com', 'dupuser')
    resp = client.post(
        '/api/admin/usuarios/',
        data=json.dumps({'correo': 'dup@test.com', 'nombre_usuario': 'otrouser', 'password': 'secreta123'}),
        content_type='application/json',
        **admin_headers,
    )
    assert resp.status_code == 409


@pytest.mark.django_db
def test_crear_usuario_password_corta_devuelve_400(client: Client, admin_headers):
    import json
    resp = client.post(
        '/api/admin/usuarios/',
        data=json.dumps({'correo': 'corto@test.com', 'nombre_usuario': 'cortouser', 'password': '123'}),
        content_type='application/json',
        **admin_headers,
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_admin_puede_obtener_detalle_usuario(client: Client, admin_headers):
    target = crear_usuario('det-1', 'det@test.com', 'detuser')
    resp = client.get(f'/api/admin/usuarios/{target.id_supabase}/', **admin_headers)
    assert resp.status_code == 200
    assert resp.json()['datos']['correo'] == 'det@test.com'


@pytest.mark.django_db
def test_obtener_usuario_inexistente_devuelve_404(client: Client, admin_headers):
    resp = client.get('/api/admin/usuarios/no-existe/', **admin_headers)
    assert resp.status_code == 404


@pytest.mark.django_db
def test_admin_puede_editar_usuario(client: Client, admin_headers, monkeypatch):
    import json
    from apps.authentication import supabase_admin
    monkeypatch.setattr(supabase_admin, 'actualizar_usuario_auth', lambda *a, **k: (True, None))
    target = crear_usuario('edit-1', 'edit@test.com', 'edituser')
    resp = client.patch(
        f'/api/admin/usuarios/{target.id_supabase}/',
        data=json.dumps({'rol': 'administrador', 'plan': 'elite', 'nombre_completo': 'Editado'}),
        content_type='application/json',
        **admin_headers,
    )
    assert resp.status_code == 200
    target.reload()
    assert target.rol == 'administrador'
    assert target.plan == 'elite'
    assert target.nombre_completo == 'Editado'


@pytest.mark.django_db
def test_admin_puede_eliminar_usuario(client: Client, admin_headers, monkeypatch):
    from apps.authentication import supabase_admin
    monkeypatch.setattr(supabase_admin, 'eliminar_usuario_auth', lambda id_supabase: (True, None))
    target = crear_usuario('del-1', 'del@test.com', 'deluser')
    resp = client.delete(f'/api/admin/usuarios/{target.id_supabase}/', **admin_headers)
    assert resp.status_code == 200
    assert Usuario.objects(id_supabase='del-1').first() is None


@pytest.mark.django_db
def test_admin_no_puede_eliminarse_a_si_mismo(client: Client, admin_headers, admin_usuario):
    resp = client.delete(f'/api/admin/usuarios/{admin_usuario.id_supabase}/', **admin_headers)
    assert resp.status_code == 400
    assert Usuario.objects(id_supabase=admin_usuario.id_supabase).first() is not None
