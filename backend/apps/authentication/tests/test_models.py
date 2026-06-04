import pytest
from datetime import datetime, timedelta
from mongoengine.errors import NotUniqueError, ValidationError
from apps.authentication.models import Usuario, Anonimo


def make_usuario(**kwargs):
    defaults = dict(
        id_supabase='sup-001',
        correo='test@example.com',
        nombre_usuario='testuser',
    )
    defaults.update(kwargs)
    u = Usuario(**defaults)
    u.save()
    return u


def test_crear_usuario_valido_se_guarda():
    u = make_usuario()
    assert u.id is not None
    assert Usuario.objects.count() == 1


def test_correo_duplicado_lanza_excepcion():
    make_usuario()
    with pytest.raises(NotUniqueError):
        make_usuario(id_supabase='sup-002', nombre_usuario='otro')


def test_nombre_usuario_duplicado_lanza_excepcion():
    make_usuario()
    with pytest.raises(NotUniqueError):
        make_usuario(id_supabase='sup-002', correo='otro@example.com')


def test_id_supabase_duplicado_lanza_excepcion():
    make_usuario()
    with pytest.raises(NotUniqueError):
        make_usuario(correo='otro@example.com', nombre_usuario='otrouser')


def test_rol_por_defecto_es_usuario():
    u = make_usuario()
    assert u.rol == 'usuario'


def test_plan_por_defecto_es_gratis():
    u = make_usuario()
    assert u.plan == 'gratis'


def test_correo_se_guarda_lowercase():
    u = Usuario(id_supabase='sup-x', correo='UPPER@EXAMPLE.COM', nombre_usuario='upper')
    u.save()
    assert u.correo == 'upper@example.com'


def test_nombre_usuario_se_guarda_lowercase():
    u = Usuario(id_supabase='sup-x', correo='a@b.com', nombre_usuario='MyUser')
    u.save()
    assert u.nombre_usuario == 'myuser'


def test_to_dict_retorna_estructura_correcta():
    u = make_usuario()
    d = u.to_dict()
    for key in ('id', 'id_supabase', 'correo', 'nombre_usuario', 'rol', 'plan', 'activo', 'bloqueado', 'intentos_usados'):
        assert key in d


def test_crear_anonimo_valido_se_guarda():
    a = Anonimo(
        id_sesion='sesion-001',
        fecha_expiracion=datetime.utcnow() + timedelta(days=30),
    )
    a.save()
    assert a.id is not None


def test_anonimo_id_sesion_unico():
    exp = datetime.utcnow() + timedelta(days=30)
    Anonimo(id_sesion='sesion-dup', fecha_expiracion=exp).save()
    with pytest.raises(NotUniqueError):
        Anonimo(id_sesion='sesion-dup', fecha_expiracion=exp).save()
