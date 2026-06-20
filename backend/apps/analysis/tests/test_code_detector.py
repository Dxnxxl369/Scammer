"""
Tests de la lógica del detector de código (Vía B).

Solo ejercitan funciones puras / ramas que NO cargan el modelo de Hugging Face,
por lo que corren sin torch ni descargas. La inferencia real (perplejidad) se
prueba aparte / manualmente.
"""
from apps.analysis.code_detector import (
    _puntuar,
    detectar,
    ESTADO_INSUFICIENTE,
    PPL_LOW,
    PPL_HIGH,
)


def test_perplejidad_baja_es_probable_ia():
    prob, veredicto = _puntuar(PPL_LOW - 0.5)
    assert prob >= 60
    assert veredicto == 'CÓDIGO SINTÉTICO'


def test_perplejidad_alta_es_probable_humano():
    prob, veredicto = _puntuar(PPL_HIGH + 1.0)
    assert prob <= 40
    assert veredicto == 'CÓDIGO HUMANO'


def test_zona_media_es_inconcluso():
    medio = (PPL_LOW + PPL_HIGH) / 2
    prob, veredicto = _puntuar(medio)
    assert 40 < prob < 60
    assert veredicto == 'INCONCLUSO'


def test_probabilidad_acotada_0_100():
    assert _puntuar(0.0)[0] == 100.0
    assert _puntuar(9999.0)[0] == 0.0


def test_mayor_perplejidad_menor_probabilidad_ia():
    # Monotonicidad: a más perplejidad, menos probabilidad de IA
    assert _puntuar(PPL_LOW)[0] >= _puntuar(PPL_HIGH)[0]


def test_fragmento_corto_es_insuficiente():
    # No debe intentar cargar el modelo para fragmentos demasiado cortos
    res = detectar('x = 1')
    assert res['estado'] == ESTADO_INSUFICIENTE
    assert res['perplejidad'] is None
