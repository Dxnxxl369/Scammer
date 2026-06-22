"""Endpoints de reportes (datos agregados para graficar en el frontend).

- ReportesUsuarioView: reportes del PROPIO usuario sobre sus análisis.
- ReportesAdminView:   reportes de TODO el sistema (solo admin).

probabilidad_ia está en escala 0-100; se considera "IA" cuando es > 50.
Para volúmenes chicos/medianos cargamos en memoria con .only(); si la base
creciera mucho conviene migrar a pipelines de agregación de Mongo.
"""
from datetime import datetime, timedelta

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
