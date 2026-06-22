import { useEffect, useState } from 'react'
import { Loader2, FileBarChart, Inbox } from 'lucide-react'
import { DashboardLayout } from '../components/DashboardLayout'
import { Dona, Barras, Linea, TarjetaReporte } from '../components/charts/Charts'
import type { Punto } from '../components/charts/Charts'
import { GeneradorReporte } from '../components/charts/GeneradorReporte'
import { api } from '../services/api'

export function Reportes() {
  const [data, setData] = useState<any>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    api.get('/analisis/reportes/mios/')
      .then(res => setData(res.data?.datos || null))
      .catch(() => setData(null))
      .finally(() => setCargando(false))
  }, [])

  if (cargando) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-[#ff0055] animate-spin mb-4" />
          <p className="text-[#ff0055] text-[9px] font-black tracking-[0.5em] uppercase animate-pulse">Generando reportes…</p>
        </div>
      </DashboardLayout>
    )
  }

  const d = data || {}
  const veredictos: Punto[] = [
    { label: 'IA detectada', value: d.veredictos?.ia || 0, color: '#ff0055' },
    { label: 'Origen humano', value: d.veredictos?.humano || 0, color: '#10b981' },
  ]
  const porTipo: Punto[] = (d.analisis_por_tipo || []).map((x: any) => ({ label: String(x.tipo), value: x.cantidad }))
  const porDia: Punto[] = (d.analisis_por_dia || []).map((x: any) => ({ label: String(x.fecha), value: x.cantidad }))
  const probTipo: Punto[] = (d.prob_promedio_por_tipo || []).map((x: any) => ({ label: String(x.tipo), value: x.promedio }))

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ff0055]/10 border border-[#ff0055]/20 flex items-center justify-center">
              <FileBarChart className="w-5 h-5 text-[#ff0055]" />
            </div>
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-[var(--text-main)]">Mis Reportes</h2>
          </div>
          <p className="text-[var(--text-muted)] text-[10px] font-black tracking-[0.3em] uppercase">
            Resumen de tus {d.total ?? 0} análisis · usá el ícono ↓ de cada tarjeta para exportar (PNG / CSV)
          </p>
        </div>

        {/* Generador dinámico por voz/texto (OpenAI + Whisper) */}
        <GeneradorReporte />

        {(!d.total) ? (
          <div className="cyber-card p-16 bg-white/[0.02] border border-white/5 rounded-3xl flex flex-col items-center text-center">
            <Inbox className="w-12 h-12 text-white/20 mb-4" />
            <p className="text-white/50 text-sm font-bold">Todavía no generaste análisis.</p>
            <p className="text-white/30 text-xs mt-2">Cuando analices texto, audio, imágenes, etc., acá vas a ver tus reportes con gráficos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TarjetaReporte titulo="Veredictos: IA vs Humano" nombre="mis_veredictos" data={veredictos} formatos={['png', 'csv']}>
              <Dona data={veredictos} />
            </TarjetaReporte>

            <TarjetaReporte titulo="Análisis por tipo" nombre="mis_analisis_por_tipo" data={porTipo} formatos={['png', 'csv']}>
              <Barras data={porTipo} color="#22d3ee" />
            </TarjetaReporte>

            <TarjetaReporte titulo="Actividad (últimos 30 días)" nombre="mi_actividad" data={porDia} formatos={['png', 'csv']}>
              <Linea data={porDia} color="#ff0055" />
            </TarjetaReporte>

            <TarjetaReporte titulo="Probabilidad de IA promedio por tipo (%)" nombre="mi_prob_por_tipo" data={probTipo} formatos={['png', 'csv']}>
              <Barras data={probTipo} color="#f59e0b" />
            </TarjetaReporte>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
