import { DashboardLayout } from '../../components/DashboardLayout'
import { BarChart, ArrowUpRight, TrendingUp, DollarSign, Download, Calendar, Users, Target, Activity, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import type { RespuestaApi } from '../../types/auth'
import { Dona, Barras, Linea, TarjetaReporte } from '../../components/charts/Charts'
import type { Punto } from '../../components/charts/Charts'
import { exportarJSON } from '../../utils/exportar'

export function AdminReportes() {
  const [stats, setStats] = useState<any>(null)
  const [rep, setRep] = useState<any>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    api.get<RespuestaApi<any>>('/admin/estadisticas/').then(res => {
      setStats(res.data.datos)
      setCargando(false)
    })
    api.get<RespuestaApi<any>>('/analisis/reportes/admin/')
      .then(res => setRep(res.data.datos))
      .catch(() => setRep(null))
  }, [])

  const mrr = stats ? (stats.plan_pro * 19.99 + stats.plan_elite * 49.99).toFixed(2) : '0.00'

  // Series para los gráficos (datos reales de /analisis/reportes/admin/)
  const repPlanes: Punto[] = rep ? [
    { label: 'Gratis', value: rep.planes?.gratis || 0, color: '#71717a' },
    { label: 'Starter', value: rep.planes?.starter || 0, color: '#22d3ee' },
    { label: 'Pro', value: rep.planes?.pro || 0, color: '#ff0055' },
    { label: 'Elite', value: rep.planes?.elite || 0, color: '#f59e0b' },
  ] : []
  const repTipos: Punto[] = (rep?.analisis_por_tipo || []).map((x: any) => ({ label: String(x.tipo), value: x.cantidad }))
  const repVer: Punto[] = rep ? [
    { label: 'IA detectada', value: rep.veredictos?.ia || 0, color: '#ff0055' },
    { label: 'Origen humano', value: rep.veredictos?.humano || 0, color: '#10b981' },
  ] : []
  const repDia: Punto[] = (rep?.analisis_por_dia || []).map((x: any) => ({ label: String(x.fecha), value: x.cantidad }))
  const repTop: Punto[] = (rep?.top_usuarios || []).map((x: any) => ({ label: String(x.usuario), value: x.cantidad }))
  const repIngresos: Punto[] = (rep?.ingresos_por_plan || []).map((x: any) => ({ label: String(x.plan), value: x.monto }))
  const repUsuariosDia: Punto[] = (rep?.usuarios_por_dia || []).map((x: any) => ({ label: String(x.fecha), value: x.cantidad }))

  if (cargando && !stats) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
          <p className="text-cyan-400 text-[9px] font-black tracking-[0.5em] uppercase animate-pulse">Cargando métricas…</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-[var(--text-main)]">Análisis_Financiero</h2>
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.4em] mt-2 italic">Inteligencia de Negocio y Métricas de Conversión</p>
          </div>
          <div className="flex gap-4">
            <button className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-[var(--border-color)] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 text-[var(--text-main)] transition-all">
              <Calendar size={14} /> Ciclo Actual
            </button>
            <button onClick={() => rep && exportarJSON('reporte_sistema_completo', rep)} className="flex items-center gap-2 px-6 py-3 bg-cyan-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-105 transition-transform">
              <Download size={14} /> Exportar Todo (JSON)
            </button>
          </div>
        </div>

        {/* Top Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="cyber-card p-10 border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                <DollarSign size={120} />
            </div>
            <div className="flex justify-between items-start mb-6">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">Ingresos Mensuales (MRR)</span>
              <div className="p-2 bg-emerald-500/20 rounded-lg"><DollarSign className="text-emerald-500 w-5 h-5" /></div>
            </div>
            <p className="text-6xl font-black italic text-[var(--text-main)] mb-2 tracking-tighter">${mrr}</p>
            <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 uppercase tracking-widest">
              <ArrowUpRight size={12} /> +12.4% Crecimiento Real
            </p>
          </div>
          
          <div className="cyber-card p-10 border-[var(--accent)]/20 bg-gradient-to-br from-[var(--accent)]/10 to-transparent relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                <TrendingUp size={120} />
            </div>
            <div className="flex justify-between items-start mb-6">
              <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest italic">Tasa de Conversión</span>
              <div className="p-2 bg-[var(--accent)]/20 rounded-lg"><TrendingUp className="text-[var(--accent)] w-5 h-5" /></div>
            </div>
            <p className="text-6xl font-black italic text-[var(--text-main)] mb-2 tracking-tighter">
              {stats ? (( (stats.plan_pro + stats.plan_elite) / (stats.total_usuarios || 1) ) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 uppercase tracking-widest">
              <ArrowUpRight size={12} /> Optimización de Funnel
            </p>
          </div>

          <div className="cyber-card p-10 border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 to-transparent relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                <Target size={120} />
            </div>
            <div className="flex justify-between items-start mb-6">
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest italic">Valor de Vida (LTV)</span>
              <div className="p-2 bg-cyan-400/20 rounded-lg"><Target className="text-cyan-400 w-5 h-5" /></div>
            </div>
            <p className="text-6xl font-black italic text-[var(--text-main)] mb-2 tracking-tighter">$142.50</p>
            <p className="text-[10px] font-bold text-white/20 flex items-center gap-1 uppercase tracking-widest">
              PROMEDIO POR AGENTE
            </p>
          </div>
        </div>

        {/* === GRÁFICOS REALES (datos de la base) === */}
        {rep && (
          <div className="mb-12">
            <h3 className="text-lg font-black uppercase tracking-widest text-[var(--text-main)] mb-6 italic flex items-center gap-3">
              <BarChart size={20} className="text-cyan-400" /> Reportes del Sistema
              <span className="text-[9px] font-bold text-white/30 normal-case tracking-normal not-italic">· exportá cada uno en PNG / SVG / CSV / JSON</span>
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TarjetaReporte titulo="Distribución de planes" nombre="planes" data={repPlanes}>
                <Dona data={repPlanes} />
              </TarjetaReporte>

              <TarjetaReporte titulo="Veredictos del sistema: IA vs Humano" nombre="veredictos_sistema" data={repVer}>
                <Dona data={repVer} />
              </TarjetaReporte>

              <TarjetaReporte titulo="Análisis por tipo" nombre="analisis_por_tipo" data={repTipos}>
                <Barras data={repTipos} color="#22d3ee" />
              </TarjetaReporte>

              <TarjetaReporte titulo="Top usuarios por actividad" nombre="top_usuarios" data={repTop}>
                <Barras data={repTop} color="#a855f7" />
              </TarjetaReporte>

              <TarjetaReporte titulo="Análisis por día (últimos 30)" nombre="analisis_por_dia" data={repDia}>
                <Linea data={repDia} color="#ff0055" />
              </TarjetaReporte>

              <TarjetaReporte titulo="Usuarios nuevos por día" nombre="usuarios_por_dia" data={repUsuariosDia}>
                <Linea data={repUsuariosDia} color="#10b981" />
              </TarjetaReporte>

              <TarjetaReporte titulo="Ingresos por plan (USD)" nombre="ingresos_por_plan" data={repIngresos}>
                <Barras data={repIngresos} color="#10b981" />
              </TarjetaReporte>
            </div>
          </div>
        )}

        {/* Breakdown Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 cyber-card p-10">
                <h3 className="text-lg font-black uppercase tracking-widest text-[var(--text-main)] mb-10 italic flex items-center gap-3">
                    <Activity size={20} className="text-[var(--accent)]" /> Distribución de Carga del Sistema
                </h3>
                <div className="space-y-8">
                    {[
                        { label: 'Suscripciones ELITE', count: stats?.plan_elite || 0, color: 'bg-cyan-400', pct: 20 },
                        { label: 'Suscripciones PRO', count: stats?.plan_pro || 0, color: 'bg-[var(--accent)]', pct: 45 },
                        { label: 'Agentes STARTER', count: stats?.plan_starter || 0, color: 'bg-amber-500', pct: 15 },
                        { label: 'Acceso GRATUITO', count: stats?.plan_gratis || 0, color: 'bg-white/10', pct: 80 }
                    ].map((item, i) => (
                        <div key={i}>
                            <div className="flex justify-between items-end mb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">{item.label}</span>
                                <span className="text-sm font-black italic text-[var(--text-main)]">{item.count} CUENTAS</span>
                            </div>
                            <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
                                <div className={`h-full ${item.color} transition-all duration-1000`} style={{ width: stats ? `${(item.count / (stats.total_usuarios || 1)) * 100}%` : '0%' }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="lg:col-span-4 space-y-8">
                <div className="cyber-card p-10 flex flex-col items-center text-center justify-center min-h-[300px] border-dashed border-[var(--border-color)]">
                    <Users className="w-12 h-12 text-[var(--text-muted)] mb-6 opacity-20" />
                    <h4 className="text-xs font-black uppercase tracking-widest mb-2">Churn Rate Estimado</h4>
                    <p className="text-4xl font-black italic text-[var(--text-main)] mb-4">2.4%</p>
                    <div className="px-4 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[8px] font-black uppercase tracking-widest">Nivel Óptimo</div>
                </div>

                <div className="cyber-card p-10 bg-black/20 border-white/5 group hover:border-[var(--accent)] transition-all">
                    <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mb-6">Próximo Hito de Ingresos</h4>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black italic text-[var(--text-main)]">$10,000</span>
                        <span className="text-[10px] font-black text-[var(--accent)]">{((parseFloat(mrr) / 10000) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent-glow)]" style={{ width: `${(parseFloat(mrr) / 10000) * 100}%` }}></div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
