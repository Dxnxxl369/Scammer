import pytest
from datetime import datetime, timedelta
from apps.authentication.services import UsuarioService, AnonimoService
from apps.authentication.models import Usuario, Anonimo


def test_crear_usuario_desde_supabase_exitoso():
    u, err = UsuarioService.crear_desde_supabase('sup-1', 'a@b.com', 'userA')
    assert err is None
    assert u is not None
    assert u.correo == 'a@b.com'


def test_crear_usuario_correo_duplicado_devuelve_error():
    UsuarioService.crear_desde_supabase('sup-1', 'dup@b.com', 'userA')
    _, err = UsuarioService.crear_desde_supabase('sup-2', 'dup@b.com', 'userB')
    assert err == 'CORREO_DUPLICADO'


def test_crear_usuario_username_duplicado_devuelve_error():
    UsuarioService.crear_desde_supabase('sup-1', 'a@b.com', 'mismo')
    _, err = UsuarioService.crear_desde_supabase('sup-2', 'b@b.com', 'mismo')
    assert err == 'NOMBRE_USUARIO_DUPLICADO'


def test_obtener_por_supabase_id_existente():
    UsuarioService.crear_desde_supabase('sup-abc', 'x@b.com', 'xuser')
    u = UsuarioService.obtener_por_supabase_id('sup-abc')
    assert u is not None
    assert u.id_supabase == 'sup-abc'


def test_obtener_por_supabase_id_inexistente_devuelve_none():
    u = UsuarioService.obtener_por_supabase_id('no-existe')
    assert u is None


def test_actualizar_usuario_solo_campos_permitidos():
    UsuarioService.crear_desde_supabase('sup-1', 'a@b.com', 'userA')
    u, err = UsuarioService.actualizar('sup-1', {'nombre_completo': 'Juan', 'correo': 'hacked@b.com'})
    assert err is None
    assert u.nombre_completo == 'Juan'
    assert u.correo == 'a@b.com'


def test_incrementar_intentos_aumenta_contador():
    UsuarioService.crear_desde_supabase('sup-1', 'a@b.com', 'userA')
    UsuarioService.incrementar_intentos('sup-1')
    u = UsuarioService.obtener_por_supabase_id('sup-1')
    assert u.intentos_usados == 1


def test_existe_correo_true_y_false():
    UsuarioService.crear_desde_supabase('sup-1', 'exist@b.com', 'userA')
    assert UsuarioService.existe_correo('exist@b.com') is True
    assert UsuarioService.existe_correo('noexiste@b.com') is False


def test_crear_sesion_anonima_genera_uuid():
    a = AnonimoService.crear_sesion()
    assert a.id_sesion is not None
    assert len(a.id_sesion) == 36


def test_crear_sesion_anonima_tiene_fecha_expiracion():
    a = AnonimoService.crear_sesion()
    assert a.fecha_expiracion > datetime.utcnow()


def test_incrementar_intentos_anonimo():
    a = AnonimoService.crear_sesion()
    AnonimoService.incrementar_intentos(a.id_sesion)
    actualizado = AnonimoService.obtener_por_id_sesion(a.id_sesion)
    assert actualizado.intentos_usados == 1
