"""Endpoints de reportes (datos agregados para graficar en el frontend).

- ReportesUsuarioView: reportes del PROPIO usuario sobre sus análisis.
- ReportesAdminView:   reportes de TODO el sistema (solo admin).

probabilidad_ia está en escala 0-100; se considera "IA" cuando es > 50.
Para volúmenes chicos/medianos cargamos en memoria con .only(); si la base
creciera mucho conviene migrar a pipelines de agregación de Mongo.
"""
from datetime import datetime, timedelta
import json

import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import Analisis
from apps.authentication.models import Usuario, Pago
from apps.authentication.permissions import EsAdmin
from apps.authentication.services import UsuarioService
from apps.authentication.responses import respuesta_exitosa, respuesta_error


def _serie_por_dia(fechas, dias=30):
    """Devuelve [{fecha, cantidad}] por día para los últimos N días."""
    hoy = datetime.utcnow().date()
    inicio = hoy - timedelta(days=dias - 1)
    conteo = {}
    for d in fechas:
        if not d:
            continue
        fd = d.date() if hasattr(d, 'date') else d
        if fd < inicio or fd > hoy:
            continue
        clave = fd.isoformat()
        conteo[clave] = conteo.get(clave, 0) + 1
    serie = []
    for i in range(dias):
        dia = inicio + timedelta(days=i)
        clave = dia.isoformat()
        serie.append({'fecha': clave, 'cantidad': conteo.get(clave, 0)})
    return serie


class ReportesUsuarioView(APIView):
    """Reportes del propio usuario sobre sus análisis."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = UsuarioService.obtener_por_supabase_id(request.user.id)
        if not usuario:
            return respuesta_error('NO_ENCONTRADO', 'Usuario no encontrado', status.HTTP_404_NOT_FOUND)

        analisis = list(
            Analisis.objects(id_supabase=usuario.id_supabase).only('tipo', 'probabilidad_ia', 'fecha_creacion')
        )

        por_tipo = {}
        prob_acum = {}
        ia = 0
        humano = 0
        for a in analisis:
            t = a.tipo or 'otro'
            por_tipo[t] = por_tipo.get(t, 0) + 1
            prob_acum.setdefault(t, []).append(a.probabilidad_ia or 0)
            if (a.probabilidad_ia or 0) > 50:
                ia += 1
            else:
                humano += 1

        analisis_por_tipo = [{'tipo': t, 'cantidad': c} for t, c in sorted(por_tipo.items(), key=lambda x: -x[1])]
        prob_promedio_por_tipo = [
            {'tipo': t, 'promedio': round(sum(v) / len(v), 1) if v else 0}
            for t, v in sorted(prob_acum.items(), key=lambda x: -len(x[1]))
        ]
        por_dia = _serie_por_dia([a.fecha_creacion for a in analisis])

        return respuesta_exitosa({
            'total': len(analisis),
            'veredictos': {'ia': ia, 'humano': humano},
            'analisis_por_tipo': analisis_por_tipo,
            'prob_promedio_por_tipo': prob_promedio_por_tipo,
            'analisis_por_dia': por_dia,
            'plan': usuario.plan,
            'intentos_livianos': usuario.intentos_livianos,
            'intentos_pesados': usuario.intentos_pesados,
        }, mensaje='Reportes del usuario')


class ReportesAdminView(APIView):
    """Reportes de todo el sistema (solo admin)."""
    permission_classes = [EsAdmin]

    def get(self, request):
        analisis = list(
            Analisis.objects().only('id_supabase', 'tipo', 'probabilidad_ia', 'fecha_creacion')
        )

        por_tipo = {}
        por_usuario = {}
        ia = 0
        humano = 0
        for a in analisis:
            t = a.tipo or 'otro'
            por_tipo[t] = por_tipo.get(t, 0) + 1
            por_usuario[a.id_supabase] = por_usuario.get(a.id_supabase, 0) + 1
            if (a.probabilidad_ia or 0) > 50:
                ia += 1
            else:
                humano += 1

        analisis_por_tipo = [{'tipo': t, 'cantidad': c} for t, c in sorted(por_tipo.items(), key=lambda x: -x[1])]
        analisis_por_dia = _serie_por_dia([a.fecha_creacion for a in analisis])

        top = sorted(por_usuario.items(), key=lambda x: -x[1])[:8]
        top_usuarios = []
        for uid, cant in top:
            u = Usuario.objects(id_supabase=uid).only('nombre_usuario').first()
            top_usuarios.append({'usuario': u.nombre_usuario if u else (uid[:8] if uid else '—'), 'cantidad': cant})

        planes = {
            'gratis': Usuario.objects(plan='gratis').count(),
            'starter': Usuario.objects(plan='starter').count(),
            'pro': Usuario.objects(plan='pro').count(),
            'elite': Usuario.objects(plan='elite').count(),
        }

        ingresos = {}
        for p in Pago.objects(estado='completado').only('plan', 'monto_centavos'):
            ingresos[p.plan] = ingresos.get(p.plan, 0) + (p.monto_centavos or 0)
        ingresos_por_plan = [{'plan': k, 'monto': round(v / 100, 2)} for k, v in ingresos.items()]

        usuarios_por_dia = _serie_por_dia(
            [u.fecha_creacion for u in Usuario.objects().only('fecha_creacion')]
        )

        return respuesta_exitosa({
            'total_analisis': len(analisis),
            'veredictos': {'ia': ia, 'humano': humano},
            'analisis_por_tipo': analisis_por_tipo,
            'analisis_por_dia': analisis_por_dia,
            'top_usuarios': top_usuarios,
            'planes': planes,
            'ingresos_por_plan': ingresos_por_plan,
            'usuarios_por_dia': usuarios_por_dia,
        }, mensaje='Reportes del sistema')


# ════════════════════════════════════════════════════════════════════════════
# REPORTES POR VOZ / TEXTO con OpenAI (Whisper para transcribir, GPT para
# interpretar el pedido en lenguaje natural). Sin paquete `openai`: usamos la
# API REST con requests, igual que el resto de servicios del proyecto.
# ════════════════════════════════════════════════════════════════════════════

USER_METRICS = ['analisis_por_tipo', 'veredictos', 'analisis_por_dia', 'prob_promedio_por_tipo']
ADMIN_METRICS = ['planes', 'ingresos_por_plan', 'top_usuarios', 'usuarios_por_dia']

_DESC_METRICAS = {
    'analisis_por_tipo': 'cantidad de análisis por tipo de contenido (texto, audio, imagen, video, sms, llamada, etc.)',
    'veredictos': 'cuántos análisis dieron IA detectada vs origen humano/genuino',
    'analisis_por_dia': 'cantidad de análisis por día (evolución temporal)',
    'prob_promedio_por_tipo': 'probabilidad promedio de IA (%) por tipo de contenido',
    'planes': 'cantidad de usuarios por plan (gratis/starter/pro/elite)',
    'ingresos_por_plan': 'ingresos en USD por plan',
    'top_usuarios': 'usuarios con más análisis (ranking)',
    'usuarios_por_dia': 'usuarios nuevos registrados por día',
}


def _openai_chat_json(system, user):
    """Llama a GPT pidiendo respuesta JSON. Devuelve dict o None."""
    key = getattr(settings, 'OPENAI_API_KEY', '') or ''
    if not key:
        return None
    try:
        r = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
            json={
                'model': getattr(settings, 'OPENAI_CHAT_MODEL', 'gpt-4o-mini'),
                'messages': [
                    {'role': 'system', 'content': system},
                    {'role': 'user', 'content': user},
                ],
                'response_format': {'type': 'json_object'},
                'temperature': 0.1,
            },
            timeout=30,
        )
        r.raise_for_status()
        return json.loads(r.json()['choices'][0]['message']['content'])
    except Exception as e:
        print(f'[REPORTES-IA] Error en GPT (intención): {e}')
        return None


def _openai_resumen(titulo, datos):
    """Un resumen de 1-2 frases del reporte. Best-effort; '' si no hay key/falla."""
    key = getattr(settings, 'OPENAI_API_KEY', '') or ''
    if not key:
        return ''
    try:
        r = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
            json={
                'model': getattr(settings, 'OPENAI_CHAT_MODEL', 'gpt-4o-mini'),
                'messages': [
                    {'role': 'system', 'content': 'Sos un analista de datos. Resumí en 1 o 2 frases, en español, claras y concretas, lo que muestran los datos de un reporte. Sin markdown, sin listas.'},
                    {'role': 'user', 'content': f'Reporte: "{titulo}". Datos: {json.dumps(datos, ensure_ascii=False)}'},
                ],
                'temperature': 0.3,
            },
            timeout=30,
        )
        r.raise_for_status()
        return (r.json()['choices'][0]['message']['content'] or '').strip()
    except Exception as e:
        print(f'[REPORTES-IA] Error en GPT (resumen): {e}')
        return ''


def _openai_whisper(archivo):
    """Transcribe un archivo de audio con Whisper. Devuelve texto o None."""
    key = getattr(settings, 'OPENAI_API_KEY', '') or ''
    if not key:
        return None
    try:
        contenido = archivo.read()
        r = requests.post(
            'https://api.openai.com/v1/audio/transcriptions',
            headers={'Authorization': f'Bearer {key}'},
            files={'file': (archivo.name or 'audio.webm', contenido, getattr(archivo, 'content_type', None) or 'audio/webm')},
            data={'model': getattr(settings, 'OPENAI_WHISPER_MODEL', 'whisper-1'), 'language': 'es'},
            timeout=60,
        )
        r.raise_for_status()
        return r.json().get('text', '')
    except Exception as e:
        print(f'[REPORTES-IA] Error en Whisper: {e}')
        return None


def _fallback_keywords(consulta, disponibles):
    """Si no hay OpenAI o devolvió algo inválido: elegir métrica por palabras clave."""
    c = (consulta or '').lower()

    def usar(m, chart, titulo):
        metrica = m if m in disponibles else 'analisis_por_tipo'
        return {'metrica': metrica, 'chart': chart, 'titulo': titulo, 'rango_dias': 30}

    if any(k in c for k in ['ia', 'human', 'veredicto', 'genuin', 'falso', 'real']):
        return usar('veredictos', 'dona', 'IA vs Humano')
    if any(k in c for k in ['ingreso', 'plata', 'dinero', 'revenue', 'factur', 'venta']):
        return usar('ingresos_por_plan', 'barras', 'Ingresos por plan')
    if 'top' in c or 'ranking' in c or 'mejor' in c:
        return usar('top_usuarios', 'barras', 'Top usuarios')
    if any(k in c for k in ['plan', 'suscrip']):
        return usar('planes', 'dona', 'Usuarios por plan')
    if any(k in c for k in ['probab', 'porcentaje', 'promedio', 'score']):
        return usar('prob_promedio_por_tipo', 'barras', 'Probabilidad de IA por tipo')
    if any(k in c for k in ['registr', 'crecimiento', 'nuevos usuarios', 'altas']):
        return usar('usuarios_por_dia', 'linea', 'Usuarios nuevos por día')
    if any(k in c for k in ['dia', 'día', 'tiempo', 'evolu', 'activ', 'semana', 'mes', 'historial']):
        return usar('analisis_por_dia', 'linea', 'Actividad por día')
    return usar('analisis_por_tipo', 'barras', 'Análisis por tipo')


def _interpretar(consulta, es_admin):
    """Pide a GPT mapear la consulta a una métrica; si falla, palabras clave."""
    disponibles = USER_METRICS + (ADMIN_METRICS if es_admin else [])
    lista = '\n'.join(f'- {m}: {_DESC_METRICAS[m]}' for m in disponibles)
    system = (
        'Convertís un pedido de reporte (en español) en una métrica concreta.\n'
        f'Métricas disponibles:\n{lista}\n\n'
        'Respondé SOLO un JSON con esta forma exacta: '
        '{"metrica": <una de la lista>, "rango_dias": <entero, por defecto 30>, '
        '"chart": "dona"|"barras"|"linea", "titulo": <título corto en español>}. '
        'Para distribuciones o comparaciones de pocas categorías usá "dona" o "barras"; '
        'para evolución en el tiempo usá "linea".'
    )
    spec = _openai_chat_json(system, consulta)
    if not spec or spec.get('metrica') not in disponibles:
        spec = _fallback_keywords(consulta, disponibles)
    try:
        spec['rango_dias'] = max(1, min(365, int(spec.get('rango_dias') or 30)))
    except (TypeError, ValueError):
        spec['rango_dias'] = 30
    if spec.get('chart') not in ('dona', 'barras', 'linea'):
        spec['chart'] = 'barras'
    if not spec.get('titulo'):
        spec['titulo'] = spec['metrica'].replace('_', ' ').title()
    return spec


def _datos_metrica(metrica, usuario, es_admin, rango_dias=30):
    """Calcula los datos de la métrica. Devuelve (datos:list, chart_sugerido:str)."""
    uid = usuario.id_supabase

    if metrica in USER_METRICS:
        analisis = list(Analisis.objects(id_supabase=uid).only('tipo', 'probabilidad_ia', 'fecha_creacion'))
        if metrica == 'veredictos':
            ia = sum(1 for a in analisis if (a.probabilidad_ia or 0) > 50)
            return [{'label': 'IA detectada', 'value': ia}, {'label': 'Origen humano', 'value': len(analisis) - ia}], 'dona'
        if metrica == 'analisis_por_dia':
            return _serie_por_dia([a.fecha_creacion for a in analisis], rango_dias), 'linea'
        if metrica == 'prob_promedio_por_tipo':
            acc = {}
            for a in analisis:
                acc.setdefault(a.tipo or 'otro', []).append(a.probabilidad_ia or 0)
            return [{'label': t, 'value': round(sum(v) / len(v), 1) if v else 0} for t, v in sorted(acc.items(), key=lambda x: -len(x[1]))], 'barras'
        # analisis_por_tipo (default user)
        d = {}
        for a in analisis:
            d[a.tipo or 'otro'] = d.get(a.tipo or 'otro', 0) + 1
        return [{'label': t, 'value': c} for t, c in sorted(d.items(), key=lambda x: -x[1])], 'barras'

    if es_admin and metrica in ADMIN_METRICS:
        if metrica == 'planes':
            return [{'label': p.capitalize(), 'value': Usuario.objects(plan=p).count()} for p in ['gratis', 'starter', 'pro', 'elite']], 'dona'
        if metrica == 'ingresos_por_plan':
            ing = {}
            for p in Pago.objects(estado='completado').only('plan', 'monto_centavos'):
                ing[p.plan] = ing.get(p.plan, 0) + (p.monto_centavos or 0)
            return [{'label': k, 'value': round(v / 100, 2)} for k, v in ing.items()], 'barras'
        if metrica == 'top_usuarios':
            cnt = {}
            for a in Analisis.objects().only('id_supabase'):
                cnt[a.id_supabase] = cnt.get(a.id_supabase, 0) + 1
            top = sorted(cnt.items(), key=lambda x: -x[1])[:8]
            out = []
            for u_id, c in top:
                u = Usuario.objects(id_supabase=u_id).only('nombre_usuario').first()
                out.append({'label': u.nombre_usuario if u else (u_id[:8] if u_id else '—'), 'value': c})
            return out, 'barras'
        if metrica == 'usuarios_por_dia':
            return _serie_por_dia([u.fecha_creacion for u in Usuario.objects().only('fecha_creacion')], rango_dias), 'linea'

    # Fallback: análisis por tipo del usuario
    d = {}
    for a in Analisis.objects(id_supabase=uid).only('tipo'):
        d[a.tipo or 'otro'] = d.get(a.tipo or 'otro', 0) + 1
    return [{'label': t, 'value': c} for t, c in sorted(d.items(), key=lambda x: -x[1])], 'barras'


class ConsultarReporteView(APIView):
    """Genera un reporte a partir de un pedido en lenguaje natural (texto)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        usuario = UsuarioService.obtener_por_supabase_id(request.user.id)
        if not usuario:
            return respuesta_error('NO_ENCONTRADO', 'Usuario no encontrado', status.HTTP_404_NOT_FOUND)

        consulta = (request.data.get('consulta') or '').strip()
        if not consulta:
            return respuesta_error('SIN_CONSULTA', 'Escribí o dictá qué reporte querés', status.HTTP_400_BAD_REQUEST)

        es_admin = usuario.rol == 'administrador'
        spec = _interpretar(consulta, es_admin)
        datos, chart_sugerido = _datos_metrica(spec['metrica'], usuario, es_admin, spec.get('rango_dias', 30))
        chart = spec.get('chart') or chart_sugerido
        resumen = _openai_resumen(spec['titulo'], datos)

        return respuesta_exitosa({
            'consulta': consulta,
            'metrica': spec['metrica'],
            'titulo': spec['titulo'],
            'chart': chart,
            'datos': datos,
            'resumen': resumen,
        }, mensaje='Reporte generado')


class TranscribirAudioView(APIView):
    """Transcribe un audio con Whisper y devuelve el texto (para pedir reportes hablando)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        archivo = request.FILES.get('audio')
        if not archivo:
            return respuesta_error('SIN_AUDIO', 'No se recibió audio', status.HTTP_400_BAD_REQUEST)
        texto = _openai_whisper(archivo)
        if texto is None:
            return respuesta_error('WHISPER_ERROR', 'No se pudo transcribir (revisá que OPENAI_API_KEY esté configurada)', status.HTTP_502_BAD_GATEWAY)
        return respuesta_exitosa({'texto': texto}, mensaje='Transcripción lista')
