"""
Detector de código generado por IA — Vía B (perplejidad).

Mide qué tan "predecible" es un fragmento de código bajo un modelo de lenguaje
de código. El código generado por IA tiende a tener BAJA perplejidad (muy
predecible); el código humano idiosincrático tiende a tener perplejidad más
alta.

OJO (honestidad del producto): no es infalible. Código corto o muy idiomático
(por ejemplo un CRUD estándar) puede dar falsos positivos. Por eso devolvemos
probabilidad + perplejidad + una zona "INCONCLUSO", nunca un binario duro, y
marcamos los fragmentos demasiado cortos como no concluyentes.

El modelo se carga de forma PEREZOSA la primera vez que se usa (descarga ~1 GB
desde Hugging Face) y se cachea en memoria. No se importa torch a nivel de
módulo para no encarecer el arranque ni romper entornos sin las dependencias.

Configurable por variables de entorno:
  CODE_DETECTOR_MODEL      (def: Qwen/Qwen2.5-Coder-0.5B)
  CODE_DETECTOR_PPL_LOW    (def: 1.8)  -> <= esto: muy probable IA
  CODE_DETECTOR_PPL_HIGH   (def: 4.0)  -> >= esto: muy probable humano
  CODE_DETECTOR_MIN_CHARS  (def: 80)   -> menos que esto: fragmento insuficiente
  CODE_DETECTOR_MAX_TOKENS (def: 1024) -> truncado para inferencia
"""
from typing import Optional
from decouple import config

MODELO = config('CODE_DETECTOR_MODEL', default='Qwen/Qwen2.5-Coder-0.5B')
PPL_LOW = config('CODE_DETECTOR_PPL_LOW', default=1.8, cast=float)
PPL_HIGH = config('CODE_DETECTOR_PPL_HIGH', default=4.0, cast=float)
MIN_CHARS = config('CODE_DETECTOR_MIN_CHARS', default=80, cast=int)
MAX_TOKENS = config('CODE_DETECTOR_MAX_TOKENS', default=1024, cast=int)

ESTADO_OK = 'OK'
ESTADO_INSUFICIENTE = 'INSUFICIENTE'
ESTADO_MOTOR = 'MOTOR_NO_DISPONIBLE'

_tokenizer = None
_model = None
_torch = None


def _cargar_modelo():
    """Carga perezosa del modelo + tokenizer. Lanza RuntimeError si no se puede."""
    global _tokenizer, _model, _torch
    if _model is not None:
        return
    try:
        import torch
        from transformers import AutoTokenizer, AutoModelForCausalLM
    except Exception as e:  # dependencias ausentes
        raise RuntimeError(f'Dependencias del detector no disponibles: {e}')
    try:
        _torch = torch
        _tokenizer = AutoTokenizer.from_pretrained(MODELO)
        _model = AutoModelForCausalLM.from_pretrained(MODELO)
        _model.eval()
    except Exception as e:  # falla de descarga/carga del modelo
        _tokenizer = _model = _torch = None
        raise RuntimeError(f'No se pudo cargar el modelo "{MODELO}": {e}')


def perplejidad(codigo: str) -> float:
    """Perplejidad media por token del código bajo el modelo de código."""
    _cargar_modelo()
    enc = _tokenizer(codigo, return_tensors='pt', truncation=True, max_length=MAX_TOKENS)
    input_ids = enc.input_ids
    with _torch.no_grad():
        salida = _model(input_ids, labels=input_ids)
    # salida.loss = entropía cruzada media por token (log-perplejidad)
    return float(_torch.exp(salida.loss).item())


def _puntuar(ppl: float) -> tuple[float, str]:
    """
    Convierte perplejidad -> (probabilidad_ia en %, veredicto).
    Función PURA: testeable sin el modelo.
    """
    if PPL_HIGH <= PPL_LOW:
        fraccion = 0.5
    else:
        fraccion = 1.0 - (ppl - PPL_LOW) / (PPL_HIGH - PPL_LOW)
    fraccion = max(0.0, min(1.0, fraccion))
    prob = round(fraccion * 100, 2)
    if prob >= 60:
        veredicto = 'CÓDIGO SINTÉTICO'
    elif prob <= 40:
        veredicto = 'CÓDIGO HUMANO'
    else:
        veredicto = 'INCONCLUSO'
    return prob, veredicto


def detectar(codigo: str, lenguaje: Optional[str] = None) -> dict:
    """Analiza un fragmento de código y devuelve el resultado (sin persistir)."""
    codigo = (codigo or '').strip()
    if len(codigo) < MIN_CHARS:
        return {
            'estado': ESTADO_INSUFICIENTE,
            'probabilidad_ia': 0.0,
            'perplejidad': None,
            'veredicto': 'FRAGMENTO INSUFICIENTE',
            'detalles': f'Se necesitan al menos {MIN_CHARS} caracteres para un juicio fiable.',
            'lenguaje': lenguaje,
        }
    try:
        ppl = perplejidad(codigo)
    except RuntimeError as e:
        return {
            'estado': ESTADO_MOTOR,
            'probabilidad_ia': 0.0,
            'perplejidad': None,
            'veredicto': 'MOTOR NO DISPONIBLE',
            'detalles': str(e),
            'lenguaje': lenguaje,
        }
    prob, veredicto = _puntuar(ppl)
    return {
        'estado': ESTADO_OK,
        'probabilidad_ia': prob,
        'perplejidad': round(ppl, 3),
        'veredicto': veredicto,
        'detalles': (
            f'Perplejidad {ppl:.2f} (umbrales: IA <= {PPL_LOW}, humano >= {PPL_HIGH}). '
            f'Confianza IA: {prob:.1f}%. Umbrales calibrables por entorno.'
        ),
        'lenguaje': lenguaje,
        'modelo': MODELO,
    }


def analizar_codigo(identificador: str, codigo: str, lenguaje: Optional[str] = None,
                    ip: Optional[str] = None) -> dict:
    """
    Orquesta el análisis: detecta, persiste (cuando hay resultado real), alimenta
    el dataset de entrenamiento con veredictos confiables y registra en bitácora.
    Devuelve un dict listo para el frontend.
    """
    from .models import Analisis, DatoEntrenamiento
    from .services import BitacoraService, AnalisisService

    resultado = detectar(codigo, lenguaje)
    estado = resultado['estado']

    puntos = []
    if resultado.get('perplejidad') is not None:
        puntos = [{
            'titulo': 'Perplejidad',
            'score': resultado['perplejidad'],
            'descripcion': f"{resultado['probabilidad_ia']:.1f}% prob. IA",
        }]

    payload = {
        'tipo': 'codigo',
        'lenguaje': lenguaje,
        'contenido': codigo[:4000],
        'probabilidadIA': resultado['probabilidad_ia'],
        'perplejidad': resultado.get('perplejidad'),
        'veredicto': resultado['veredicto'],
        'detalles': resultado['detalles'],
        'puntosCriticos': puntos,
        'estado': estado,
    }

    # Solo persistimos un análisis real (con probabilidad numérica)
    if estado == ESTADO_OK:
        try:
            analisis = Analisis(
                id_supabase=identificador,
                tipo='codigo',
                contenido=codigo[:4000],
                probabilidad_ia=resultado['probabilidad_ia'],
                veredicto=resultado['veredicto'],
                detalles=resultado['detalles'],
                puntos_criticos=puntos,
            )
            analisis.save()
            payload['id'] = str(analisis.id)
            payload['fecha'] = analisis.fecha_creacion.isoformat()

            # Alimentar el dataset SOLO con veredictos confiables (evita ruido del "INCONCLUSO")
            prob = resultado['probabilidad_ia']
            if prob >= 60 or prob <= 40:
                DatoEntrenamiento(
                    contenido=codigo[:8000],
                    etiqueta=1 if prob >= 60 else 0,
                    confianza_original=prob,
                ).save()
        except Exception as e:
            print(f'[CODE DETECTOR] Error al persistir análisis: {e}')

        try:
            BitacoraService.registrar(identificador, 'Análisis CODIGO', 'Codigo', ip)
        except Exception as e:
            print(f'[CODE DETECTOR] Error en bitácora: {e}')

        try:
            AnalisisService._notificar_admins(
                titulo='Nuevo Análisis: CÓDIGO',
                mensaje=f"Veredicto: {resultado['veredicto']} ({resultado['probabilidad_ia']:.1f}% IA).",
                tipo='analisis_liviano',
                analisis_id=payload.get('id'),
            )
        except Exception as e:
            print(f'[CODE DETECTOR] Error al notificar admins: {e}')

    return payload
