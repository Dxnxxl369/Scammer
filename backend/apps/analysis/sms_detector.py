"""
Detector de smishing (SMS fraudulento).

Para SMS la pregunta útil no es "¿lo escribió una IA?" (los detectores de texto
fallan en mensajes cortos) sino "¿es un fraude?". Combina dos grupos de señales:

  1. El ENLACE: acortadores que ocultan el destino, dominios con IP, homógrafos
     (xn--), TLDs poco comunes, falta de HTTPS y suplantación de marca.
  2. El CONTENIDO/intención: urgencia/amenaza, pedido de datos sensibles
     (clave/OTP/tarjeta), ganchos de premio y llamados a hacer clic.

Devuelve un puntaje de riesgo 0-100, un veredicto y las BANDERAS concretas que
disparó (no un binario). Multilingüe (es/en) con términos de contexto boliviano.

Opcional: si se configura SMS_SAFE_BROWSING_KEY (Google Safe Browsing) se
consulta la reputación de las URLs; si no, se usa solo la heurística.
"""
import re
from typing import Optional
from decouple import config

SAFE_BROWSING_KEY = config('SMS_SAFE_BROWSING_KEY', default='')

ESTADO_OK = 'OK'
ESTADO_INSUFICIENTE = 'INSUFICIENTE'
MIN_CHARS = 8

# --- Señales ---
ACORTADORES = {
    'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'cutt.ly', 'rebrand.ly',
    'rb.gy', 'shorturl.at', 'tiny.cc', 'bl.ink', 'soo.gd', 'acortar.link', 'acortaurl.com',
}
TLDS_SOSPECHOSOS = (
    '.xyz', '.top', '.tk', '.ml', '.ga', '.cf', '.gq', '.click', '.link', '.zip', '.mov',
    '.country', '.kim', '.work', '.support', '.rest', '.fit', '.icu', '.cyou',
)
MARCAS = [
    'paypal', 'whatsapp', 'netflix', 'amazon', 'apple', 'icloud', 'microsoft', 'google',
    'facebook', 'instagram', 'correos', 'dhl', 'fedex', 'aduana',
    # Bolivia
    'bcp', 'bnb', 'bancosol', 'mercantil', 'bisa', 'asfi', 'segip', 'impuestos',
    'ende', 'tigo', 'entel', 'viva', 'yango',
]
URGENCIA = [
    r'urgente', r'inmediat', r'\bahora\b', r'expir', r'\bvence', r'suspend', r'bloquead',
    r'verific', r'actualiz', r'última oportunidad', r'ultima oportunidad', r'\bcaduc',
    r'urgent', r'immediat', r'expire', r'\bverify', r'\bupdate', r'restring',
]
CREDENCIALES = [
    r'contraseñ', r'\bclave\b', r'\bcódigo\b', r'\bcodigo\b', r'\botp\b', r'\bpin\b', r'\bcvv\b',
    r'\btarjeta\b', r'datos de tu cuenta', r'\btransfer', r'\bdeuda\b', r'número de cuenta',
    r'\bpassword\b', r'\bcard\b', r'verify your', r'confirm your',
]
GANCHOS = [
    r'felicidad', r'\bganaste\b', r'\bganó\b', r'\bpremio\b', r'\bsorteo\b', r'\bgratis\b',
    r'\bregalo\b', r'congratulat', r'you won', r'\bwinner\b', r'\bprize\b', r'\bherencia\b',
    r'\blotería\b', r'\bloteria\b', r'dinero fácil', r'bono\b',
]
CTA = [
    r'haz clic', r'has clic', r'haga clic', r'clic aquí', r'clic aqui', r'\bclick\b',
    r'ingresa a', r'ingrese a', r'verifica aquí', r'confirma aquí', r'tap here', r'click here',
]

URL_RE = re.compile(
    r'(?:https?://|www\.)[^\s]+'
    r'|[a-z0-9\-]+\.(?:com|net|org|info|xyz|top|tk|ml|ga|cf|gq|click|link|io|co|app|live|'
    r'online|site|shop|bo|ru|cn|me|cc|biz|icu|cyou)(?:/[^\s]*)?',
    re.IGNORECASE,
)


def extraer_urls(texto: str) -> list:
    return URL_RE.findall(texto or '')


def _dominio(u: str) -> str:
    u = re.sub(r'^https?://', '', (u or '').strip().lower())
    u = u.split('/')[0].split('?')[0].split(':')[0]
    if u.startswith('www.'):
        u = u[4:]
    return u


def _evaluar(texto: str, remitente: Optional[str] = None) -> tuple:
    """Heurística PURA (sin red): retorna (puntaje 0-100, lista de banderas)."""
    t = (texto or '').lower()
    flags = []
    vistos = set()

    def add(clave, puntos, bandera):
        if clave not in vistos:
            vistos.add(clave)
            flags.append((puntos, bandera))

    urls = extraer_urls(texto)
    if urls:
        add('url', 10, 'Contiene un enlace')
    for u in urls:
        dom = _dominio(u)
        if dom in ACORTADORES or any(dom.endswith('.' + s) for s in ACORTADORES):
            add('short', 25, f'Enlace acortado que oculta el destino real ({dom})')
        if re.match(r'https?://\d{1,3}(\.\d{1,3}){3}', u):
            add('ip', 30, 'Enlace con dirección IP en lugar de un dominio')
        if 'xn--' in dom:
            add('puny', 30, 'Dominio con caracteres engañosos (homógrafos)')
        if dom.endswith(TLDS_SOSPECHOSOS):
            tld = '.' + dom.rsplit('.', 1)[-1]
            add('tld', 18, f'Dominio con extensión poco común ({tld})')
        if u.lower().startswith('http://'):
            add('http', 8, 'Enlace sin cifrado (HTTP)')
        for marca in MARCAS:
            if marca in dom:
                oficial = (
                    dom == marca + '.com' or dom.endswith('.' + marca + '.com')
                    or dom == marca + '.bo' or dom.endswith('.' + marca + '.bo')
                    or dom == marca + '.com.bo' or dom.endswith('.' + marca + '.com.bo')
                )
                if not oficial:
                    add('marca', 22, f"Posible suplantación: aparece '{marca}' en un dominio no oficial")
                break

    if any(re.search(p, t) for p in URGENCIA):
        add('urg', 15, 'Lenguaje de urgencia o amenaza')
    if any(re.search(p, t) for p in CREDENCIALES):
        add('cred', 25, 'Solicita datos sensibles (clave, OTP, tarjeta o cuenta)')
    if any(re.search(p, t) for p in GANCHOS):
        add('gancho', 18, 'Gancho de premio, sorteo o dinero fácil')
    if any(re.search(p, t) for p in CTA):
        add('cta', 10, 'Llamado a hacer clic o ingresar a un sitio')

    puntaje = min(100, sum(p for p, _ in flags))
    return puntaje, [b for _, b in flags]


def _reputacion_urls(urls: list) -> Optional[dict]:
    """Consulta opcional a Google Safe Browsing (si hay key). Falla en silencio."""
    if not urls or not SAFE_BROWSING_KEY:
        return None
    try:
        import requests
        endpoint = f'https://safebrowsing.googleapis.com/v4/threatMatches:find?key={SAFE_BROWSING_KEY}'
        body = {
            'client': {'clientId': 'scammer-saas', 'clientVersion': '1.0'},
            'threatInfo': {
                'threatTypes': ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
                'platformTypes': ['ANY_PLATFORM'],
                'threatEntryTypes': ['URL'],
                'threatEntries': [{'url': u} for u in urls[:10]],
            },
        }
        r = requests.post(endpoint, json=body, timeout=8)
        if r.status_code == 200 and r.json().get('matches'):
            return {'puntos': 40, 'bandera': 'Enlace marcado como malicioso por Google Safe Browsing'}
    except Exception:
        return None
    return None


def detectar(texto: str, remitente: Optional[str] = None) -> dict:
    texto = (texto or '').strip()
    if len(texto) < MIN_CHARS:
        return {
            'estado': ESTADO_INSUFICIENTE, 'probabilidad_ia': 0.0, 'veredicto': 'MENSAJE INSUFICIENTE',
            'detalles': 'El mensaje es demasiado corto para evaluar.', 'banderas': [],
        }
    puntaje, banderas = _evaluar(texto, remitente)
    rep = _reputacion_urls(extraer_urls(texto))
    if rep:
        puntaje = min(100, puntaje + rep['puntos'])
        banderas.append(rep['bandera'])

    if puntaje >= 60:
        veredicto = 'FRAUDE PROBABLE'
    elif puntaje >= 30:
        veredicto = 'SOSPECHOSO'
    else:
        veredicto = 'PROBABLEMENTE LEGÍTIMO'

    if banderas:
        detalle = 'Señales detectadas: ' + '; '.join(banderas) + '.'
    else:
        detalle = 'No se detectaron señales claras de fraude, pero mantené precaución con enlaces y datos.'

    return {
        'estado': ESTADO_OK, 'probabilidad_ia': float(puntaje), 'veredicto': veredicto,
        'detalles': detalle, 'banderas': banderas,
    }


def analizar_sms(identificador: str, texto: str, remitente: Optional[str] = None,
                 ip: Optional[str] = None) -> dict:
    """Orquesta: detecta, consume cuota liviana, persiste, alimenta dataset y bitácora."""
    from .models import Analisis, DatoEntrenamiento
    from .services import BitacoraService, AnalisisService

    res = detectar(texto, remitente)
    estado = res['estado']
    puntos = [{'titulo': 'Señal de fraude', 'descripcion': b} for b in res.get('banderas', [])]

    payload = {
        'tipo': 'sms',
        'remitente': remitente,
        'contenido': texto[:1000],
        'probabilidadIA': res['probabilidad_ia'],
        'veredicto': res['veredicto'],
        'detalles': res['detalles'],
        'puntosCriticos': puntos,
        'banderas': res.get('banderas', []),
        'estado': estado,
    }

    if estado == ESTADO_OK:
        permitido, err = AnalisisService.verificar_y_descontar_intentos(identificador, es_pesado=False)
        if not permitido:
            raise Exception(err)
        try:
            analisis = Analisis(
                id_supabase=identificador, tipo='sms', contenido=texto[:1000],
                probabilidad_ia=res['probabilidad_ia'], veredicto=res['veredicto'],
                detalles=res['detalles'], puntos_criticos=puntos,
            )
            analisis.save()
            payload['id'] = str(analisis.id)
            payload['fecha'] = analisis.fecha_creacion.isoformat()
            prob = res['probabilidad_ia']
            if prob >= 60 or prob <= 20:
                DatoEntrenamiento(contenido=texto[:1000], etiqueta=1 if prob >= 60 else 0,
                                  confianza_original=prob).save()
        except Exception as e:
            print(f'[SMS DETECTOR] Error al persistir: {e}')
        try:
            BitacoraService.registrar(identificador, 'Análisis SMS', 'Sms', ip)
        except Exception as e:
            print(f'[SMS DETECTOR] Error bitácora: {e}')
        try:
            AnalisisService._notificar_admins(
                titulo='Nuevo Análisis: SMS',
                mensaje=f"Veredicto: {res['veredicto']} ({res['probabilidad_ia']:.0f}% riesgo).",
                tipo='analisis_liviano', analisis_id=payload.get('id'),
            )
        except Exception as e:
            print(f'[SMS DETECTOR] Error notificar: {e}')

    return payload
