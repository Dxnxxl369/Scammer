import { useState } from 'react'
import { DashboardLayout } from '../components/DashboardLayout'
import { Button } from '../components/ui'
import { codigoService } from '../services/codigoService'
import type { ResultadoCodigo } from '../services/codigoService'
import { Code2, Loader2, Cpu, AlertTriangle, ShieldQuestion } from 'lucide-react'

const LENGUAJES = ['auto', 'python', 'javascript', 'typescript', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby', 'sql']

function colorVeredicto(r: ResultadoCodigo): string {
  if (r.estado !== 'OK') return 'text-[var(--text-muted)] border-[var(--border-color)]'
  if (r.probabilidadIA >= 60) return 'text-[#ff0055] border-[#ff0055]/40 bg-[#ff0055]/5'
  if (r.probabilidadIA <= 40) return 'text-cyan-400 border-cyan-400/40 bg-cyan-400/5'
  return 'text-amber-400 border-amber-400/40 bg-amber-400/5'
}

export function DetectorCodigo() {
  const [codigo, setCodigo] = useState('')
  const [lenguaje, setLenguaje] = useState('auto')
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoCodigo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const analizar = async () => {
    if (!codigo.trim()) return
    setCargando(true)
    setError(null)
    setResultado(null)
    const res = await codigoService.analizar(codigo, lenguaje === 'auto' ? undefined : lenguaje)
    if (res.ok && res.data) setResultado(res.data)
    else setError(res.error || 'No se pudo analizar el código.')
    setCargando(false)
  }

  return (
    <DashboardLayout>
      <div className="animate-in fade-in duration-700 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#ff0055]/15 text-[#ff0055] flex items-center justify-center">
            <Code2 size={24} />
          </div>
          <h2 className="text-4xl font-black italic uppercase tracking-tighter text-[var(--text-main)]">Detector_Código</h2>
        </div>

        {/* Aviso de fiabilidad */}
        <div className="flex items-start gap-3 p-5 mb-8 rounded-2xl border border-amber-400/30 bg-amber-400/5">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
            La detección de código generado por IA <span className="text-amber-400 font-bold">no es 100% fiable</span>: el código
            corto o muy idiomático (un CRUD estándar, por ejemplo) puede dar falsos positivos. Tomá el resultado como un
            indicio con su nivel de confianza, <span className="text-[var(--text-main)] font-bold">nunca como una acusación
            definitiva</span>.
          </p>
        </div>

        {/* Entrada */}
        <div className="cyber-card p-6 border-[var(--border-color)] bg-white/[0.02]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <label className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Pegá el código a analizar</label>
            <select
              value={lenguaje}
              onChange={(e) => setLenguaje(e.target.value)}
              className="bg-[var(--bg)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl px-4 py-2 text-xs focus:border-[var(--accent)] outline-none appearance-none cursor-pointer"
            >
              {LENGUAJES.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </select>
          </div>

          <textarea
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            spellCheck={false}
            placeholder="// Pegá aquí una función o archivo…"
            className="w-full h-72 bg-[var(--bg)] border border-[var(--border-color)] rounded-xl p-4 text-[13px] font-mono text-[var(--text-main)] placeholder:text-[var(--text-muted)]/30 focus:border-[var(--accent)] outline-none transition-all resize-y"
          />

          <div className="flex items-center justify-between mt-4">
            <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-widest">{codigo.length} caracteres</span>
            <Button onClick={analizar} loading={cargando} disabled={!codigo.trim()}>
              <Cpu size={16} /> Analizar
            </Button>
          </div>
        </div>

        {/* Estado de carga */}
        {cargando && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 text-[var(--accent)] animate-spin mb-4" />
            <p className="text-[var(--accent)] text-[10px] font-black tracking-[0.4em] uppercase">Midiendo perplejidad…</p>
          </div>
        )}

        {/* Error */}
        {error && !cargando && (
          <div className="cyber-card mt-6 p-6 border border-red-500/30 bg-red-500/5 text-center">
            <p className="text-red-400 text-xs font-black uppercase tracking-widest">{error}</p>
          </div>
        )}

        {/* Resultado */}
        {resultado && !cargando && (
          <div className="cyber-card mt-6 p-8 border-[var(--border-color)] animate-in fade-in slide-in-from-bottom-2 duration-500">
            {resultado.estado === 'INSUFICIENTE' ? (
              <div className="flex items-center gap-3 text-[var(--text-muted)]">
                <ShieldQuestion className="w-6 h-6" />
                <p className="text-sm font-bold">{resultado.detalles}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <span className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border ${colorVeredicto(resultado)}`}>
                    {resultado.veredicto}
                  </span>
                  <span className="text-3xl font-black tabular-nums text-[var(--text-main)]">{resultado.probabilidadIA.toFixed(0)}<span className="text-base text-[var(--text-muted)]">% IA</span></span>
                </div>

                {/* Barra de probabilidad */}
                <div className="h-2.5 w-full rounded-full bg-white/5 overflow-hidden mb-6">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${resultado.probabilidadIA >= 60 ? 'bg-[#ff0055]' : resultado.probabilidadIA <= 40 ? 'bg-cyan-400' : 'bg-amber-400'}`}
                    style={{ width: `${Math.max(4, resultado.probabilidadIA)}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 text-[11px]">
                  {resultado.perplejidad != null && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-[var(--border-color)]">
                      <p className="text-[var(--text-muted)] uppercase tracking-widest font-black mb-1">Perplejidad</p>
                      <p className="text-xl font-black text-[var(--text-main)] tabular-nums">{resultado.perplejidad}</p>
                    </div>
                  )}
                  {resultado.lenguaje && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-[var(--border-color)]">
                      <p className="text-[var(--text-muted)] uppercase tracking-widest font-black mb-1">Lenguaje</p>
                      <p className="text-xl font-black text-[var(--text-main)] uppercase">{resultado.lenguaje}</p>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-[var(--text-muted)] mt-5 leading-relaxed">{resultado.detalles}</p>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
