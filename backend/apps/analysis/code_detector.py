"""
Detector de código generado por IA — Vía API de OpenAI.

Analiza fragmentos de código llamando a gpt-4o-mini a través de la API oficial
de OpenAI. Esto es más rápido, fiable y no requiere resolver hosts externos con
parches de DNS. El token se lee de OPENAI_TOKEN en el archivo .env.
"""
import json
import requests
from typing import Optional
from decouple import config

MODELO = config('OPENAI_CODE_MODEL', default='gpt-4o-mini')
MIN_CHARS = config('CODE_DETECTOR_MIN_CHARS', default=80, cast=int)

ESTADO_OK = 'OK'
ESTADO_INSUFICIENTE = 'INSUFICIENTE'
ESTADO_MOTOR = 'MOTOR_NO_DISPONIBLE'

OPENAI_URL = 'https://api.openai.com/v1/chat/completions'


def detectar(codigo: str, lenguaje: Optional[str] = None) -> dict:
    """Analiza un fragmento de código llamando a la API de OpenAI."""
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

    openai_token = config('OPENAI_TOKEN', default=None)
    if not openai_token:
        return {
            'estado': ESTADO_MOTOR,
            'probabilidad_ia': 0.0,
            'perplejidad': None,
            'veredicto': 'MOTOR NO DISPONIBLE',
            'detalles': 'Falta el token de OpenAI (OPENAI_TOKEN) en el archivo .env.',
            'lenguaje': lenguaje,
        }

    headers = {
        'Authorization': f'Bearer {openai_token}',
        'Content-Type': 'application/json',
    }

    system_prompt = (
        "Eres un analizador forense de código. Tu tarea es analizar el código proporcionado "
        "y determinar si fue generado por una Inteligencia Artificial (código sintético/artificial) "
        "o escrito por un humano (código natural).\n"
        "Debes responder ÚNICAMENTE con un objeto JSON válido que contenga exactamente los siguientes campos:\n"
        "{\n"
        "  \"probabilidad_ia\": <float entre 0.0 y 100.0>,\n"
        "  \"veredicto\": \"CÓDIGO SINTÉTICO\" | \"CÓDIGO HUMANO\" | \"INCONCLUSO\",\n"
        "  \"detalles\": \"<explicación breve y concisa de patrones analizados>\"\n"
        "}\n"
        "No incluyas explicaciones previas ni posteriores al JSON. Devuelve únicamente el objeto JSON."
    )

    payload = {
        'model': MODELO,
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': f'Código a analizar (lenguaje sugerido: {lenguaje or "desconocido"}):\n\n{codigo[:6000]}'},
        ],
        'response_format': {'type': 'json_object'},
        'max_tokens': 512,
        'temperature': 0.1,
    }

    try:
        response = requests.post(OPENAI_URL, json=payload, headers=headers, timeout=30)
        if response.status_code != 200:
            return {
                'estado': ESTADO_MOTOR,
                'probabilidad_ia': 0.0,
                'perplejidad': None,
                'veredicto': 'MOTOR NO DISPONIBLE',
                'detalles': f'API de OpenAI respondió con código {response.status_code}: {response.text[:300]}',
                'lenguaje': lenguaje,
            }

        data = response.json()
        content = data['choices'][0]['message']['content'].strip()

        # Limpieza por si el modelo incluye marcas de bloque de código markdown
        if content.startswith('```'):
            lines = content.splitlines()
            if lines[0].startswith('```json') or lines[0].startswith('```'):
                content = '\n'.join(lines[1:-1]).strip()

        res_json = json.loads(content)
        prob = float(res_json.get('probabilidad_ia', 50.0))
        veredicto = str(res_json.get('veredicto', 'INCONCLUSO')).upper().strip()
        detalles = str(res_json.get('detalles', f'Analizado por {MODELO} (OpenAI).'))

        # Normalizar veredicto
        if 'SINT' in veredicto:
            veredicto = 'CÓDIGO SINTÉTICO'
        elif 'HUMAN' in veredicto:
            veredicto = 'CÓDIGO HUMANO'
        else:
            veredicto = 'INCONCLUSO'

        return {
            'estado': ESTADO_OK,
            'probabilidad_ia': round(prob, 2),
            'perplejidad': None,
            'veredicto': veredicto,
            'detalles': detalles,
            'lenguaje': lenguaje,
            'modelo': MODELO,
        }

    except Exception as e:
        return {
            'estado': ESTADO_MOTOR,
            'probabilidad_ia': 0.0,
            'perplejidad': None,
            'veredicto': 'MOTOR NO DISPONIBLE',
            'detalles': f'Error al llamar a la API de OpenAI: {str(e)}',
            'lenguaje': lenguaje,
        }


def analizar_codigo(identificador: str, codigo: str, lenguaje: Optional[str] = None,
                    ip: Optional[str] = None) -> dict:
    """
    Orquesta el análisis de código: consulta la API, descuenta intentos, persiste
    los resultados y notifica a los administradores.
    """
    from .models import Analisis, DatoEntrenamiento
    from .services import BitacoraService, AnalisisService

    resultado = detectar(codigo, lenguaje)
    estado = resultado['estado']

    puntos = []
    if estado == ESTADO_OK:
        puntos = [{
            'titulo': 'Confianza Forense',
            'score': resultado['probabilidad_ia'],
            'descripcion': f"{resultado['probabilidad_ia']:.1f}% probabilidad de IA (OpenAI {MODELO})",
        }]

    payload = {
        'tipo': 'codigo',
        'lenguaje': lenguaje,
        'contenido': codigo[:4000],
        'probabilidadIA': resultado['probabilidad_ia'],
        'perplejidad': None,
        'veredicto': resultado['veredicto'],
        'detalles': resultado['detalles'],
        'puntosCriticos': puntos,
        'estado': estado,
    }

    if estado == ESTADO_OK:
        # Consumir intento liviano
        permitido, err = AnalisisService.verificar_y_descontar_intentos(identificador, es_pesado=False)
        if not permitido:
            raise Exception(err)
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

            # Alimentar el dataset con veredictos confiables
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
