import { DashboardLayout } from '../../components/DashboardLayout'
import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import type { RespuestaApi } from '../../types/auth'
import { Save, DollarSign, Zap, Cpu } from 'lucide-react'

interface PlanConfig {
  plan: string
  precio: number
  precio_centavos: number
  moneda: string
  limite_livianos: number
  limite_pesados: number
  activo: boolean
}

const NOMBRES: Record<string, string> = {
  gratis: 'GRATIS',
  starter: 'STARTER',
  pro: 'PRO',
  elite: 'ELITE',
}

export function AdminPlanes() {
  const [planes, setPlanes] = useState<PlanConfig[]>([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null)

  const cargar = () => {
    setCargando(true)
    api.get<RespuestaApi<PlanConfig[]>>('/pagos/planes/')
      .then(res => { setPlanes(res.data.datos || []); setCargando(false) })
      .catch(() => setCargando(false))
  }
  useEffect(() => { cargar() }, [])

  const editar = (plan: string, campo: keyof PlanConfig, valor: number) => {
    setPlanes(prev => prev.map(p => (p.plan === plan ? { ...p, [campo]: valor } : p)))
  }

  const guardar = async (p: PlanConfig) => {
    setGuardando(p.plan)
    setMsg(null)
    try {
      await api.put(`/admin/planes/${p.plan}/`, {
        precio_centavos: Math.round((p.precio || 0) * 100),
        moneda: p.moneda || 'usd',
        limite_livianos: p.limite_livianos,
        limite_pesados: p.limite_pesados,
      })
      setMsg({ texto: `Plan ${NOMBRES[p.plan] || p.plan} guardado. Ya aplica para todos los usuarios de ese plan.`, ok: true })
      cargar()
    } catch {
      setMsg({ texto: 'No se pudo guardar. Verificá que seas administrador.', ok: false })
    } finally {
      setGuardando(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="animate-in fade-in duration-700">
        <div className="mb-12">
          <h2 className="text-4xl font-black italic uppercase tracking-tighter text-[var(--text-main)]">Config_Planes</h2>
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.4em] mt-2 italic">
            Definí el precio y los límites de cada plan
          </p>
        </div>

        {msg && (
          <div className={`mb-8 px-6 py-4 rounded-xl text-sm font-bold border ${msg.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            {msg.texto}
          </div>
        )}

        {cargando ? (
          <p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-widest italic">Cargando planes…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {planes.map(p => (
              <div key={p.plan} className="cyber-card p-8 border-[var(--border-color)]">
                <div className="flex items-center justify-between mb-8 border-b border-[var(--border-color)] pb-4">
                  <h3 className="text-2xl font-black italic uppercase tracking-tight accent-text">{NOMBRES[p.plan] || p.plan}</h3>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] italic">
                    {p.plan === 'gratis' ? 'Sin costo' : 'De pago'}
                  </span>
                </div>

                <div className="space-y-6">
                  <label className="block">
                    <span className="flex items-center gap-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest italic mb-2">
                      <DollarSign size={12} /> Precio mensual (USD)
                    </span>
                    <input
                      type="number" min={0} step="0.01" disabled={p.plan === 'gratis'}
                      value={p.precio}
                      onChange={e => editar(p.plan, 'precio', parseFloat(e.target.value) || 0)}
                      className="w-full bg-black/20 border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)] font-bold disabled:opacity-40"
                    />
                  </label>

                  <label className="block">
                    <span className="flex items-center gap-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest italic mb-2">
                      <Zap size={12} /> Análisis livianos (texto / SMS)
                    </span>
                    <input
                      type="number" min={0} step="1"
                      value={p.limite_livianos}
                      onChange={e => editar(p.plan, 'limite_livianos', parseInt(e.target.value) || 0)}
                      className="w-full bg-black/20 border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)] font-bold"
                    />
                  </label>

                  <label className="block">
                    <span className="flex items-center gap-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest italic mb-2">
                      <Cpu size={12} /> Análisis pesados (llamada / audio / imagen / video)
                    </span>
                    <input
                      type="number" min={0} step="1"
                      value={p.limite_pesados}
                      onChange={e => editar(p.plan, 'limite_pesados', parseInt(e.target.value) || 0)}
                      className="w-full bg-black/20 border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)] font-bold"
                    />
                  </label>

                  <p className="text-[9px] text-[var(--text-muted)] italic">Tip: usá 999999 para “ilimitado”.</p>

                  <button
                    onClick={() => guardar(p)} disabled={guardando === p.plan}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-[var(--accent)] text-white rounded-xl text-[11px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] transition-transform disabled:opacity-50"
                  >
                    <Save size={14} /> {guardando === p.plan ? 'Guardando…' : 'Guardar plan'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
