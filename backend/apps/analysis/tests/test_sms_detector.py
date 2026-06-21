"""
Tests de la heurística del detector de smishing. No usan red ni APIs externas.
"""
from apps.analysis.sms_detector import (
    detectar,
    extraer_urls,
    _evaluar,
    ESTADO_INSUFICIENTE,
)


def test_extrae_urls():
    urls = extraer_urls('Mira esto http://bit.ly/abc y tambien www.banco-falso.xyz/login')
    assert any('bit.ly' in u for u in urls)
    assert any('banco-falso.xyz' in u for u in urls)


def test_mensaje_corto_insuficiente():
    r = detectar('hola')
    assert r['estado'] == ESTADO_INSUFICIENTE


def test_smishing_clasico_alto_riesgo():
    msg = ('URGENTE: tu cuenta del BCP sera bloqueada. Verifica ahora tu clave y OTP '
           'en http://bcp-seguro.xyz/login')
    r = detectar(msg)
    assert r['probabilidad_ia'] >= 60
    assert r['veredicto'] == 'FRAUDE PROBABLE'
    assert len(r['banderas']) >= 3


def test_mensaje_legitimo_bajo_riesgo():
    r = detectar('Hola, nos vemos manana a las 3 en la oficina para revisar el informe.')
    assert r['probabilidad_ia'] < 30
    assert r['veredicto'] == 'PROBABLEMENTE LEGÍTIMO'


def test_acortador_es_bandera():
    puntaje, banderas = _evaluar('Reclama tu premio aqui http://bit.ly/xyz')
    assert puntaje > 0
    assert any('acortado' in b.lower() for b in banderas)


def test_suplantacion_de_marca():
    puntaje, banderas = _evaluar('Ingresa a https://paypal-verificacion.top para confirmar')
    assert any('suplantaci' in b.lower() for b in banderas)


def test_dominio_oficial_no_marca_suplantacion():
    # paypal.com es el dominio oficial: no debe marcarse como suplantación
    _, banderas = _evaluar('Tu recibo de https://www.paypal.com/receipt esta listo')
    assert not any('suplantaci' in b.lower() for b in banderas)
