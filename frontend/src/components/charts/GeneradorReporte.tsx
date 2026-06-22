import { useRef, useState } from 'react'
import { Mic, Send, Square, Loader2, Sparkles } from 'lucide-react'
import { Dona, Barras, Linea, TarjetaReporte } from './Charts'
import type { Punto } from './Charts'
import { api } from '../../services/api'

// Generador de reportes en lenguaje natural: el usuario escribe o dicta su
// pedido, GPT interpreta qué reporte quiere (backend) y se renderiza el gráfico.
export function GeneradorReporte() {
  const [consulta, setConsulta] = useState('')
  const [cargando, setCargando] = useState(false)
  const [grabando, setGrabando] = useState(false)
  const [transcribiendo, setTranscribiendo] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [error, setError] = useState('')

  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const generar = async (texto?: string) => {
    const q = (texto ?? consulta).trim()
    if (!q) return
    setCargando(true)
    setError('')
    setResultado(null)
    try {
      const res = await api.post('/analisis/reportes/consultar/', { consulta: q })
      if (res.data?.exito) setResultado(res.data.datos)
      else setError('No se pudo generar el reporte')
    } catch (e: any) {
      setError(e?.response?.data?.mensaje || 'Error al generar el reporte')
    } finally {
      setCargando(false)
    }
  }

  const subirAudio = async (blob: Blob) => {
    setTranscribiendo(true)
    setError('')
    try {
      const port = window.location.port || '80'
      const userId = localStorage.getItem(`scammer-user-id-${port}`)
      const fd = new FormData()
      fd.append('audio', blob, 'consulta.webm')
      // fetch directo: deja que el navegador ponga el boundary del multipart.
      const r = await fetch(`${import.meta.env.VITE_API_URL}/analisis/reportes/transcribir/`, {
        method: 'POST',
        headers: userId ? { 'X-User-ID': userId } : {},
        body: fd,
      })
      const json = await r.json()
      const texto = json?.datos?.texto || ''
      if (!r.ok || !texto) {
        setError(json?.mensaje || 'No se pudo transcribir el audio')
        return
      }
      setConsulta(texto)
      await generar(texto)
    } catch {
      setError('No se pudo transcribir el audio')
    } finally {
      setTranscribiendo(false)
    }
  }

  const toggleGrabar = async () => {
    if (grabando) {
      mediaRef.current?.stop()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        setGrabando(false)
        subirAudio(new Blob(chunksRef.current, { type: 'audio/webm' }))
      }
      mediaRef.current = mr
      mr.start()
      setGrabando(true)
    } catch {
      setError('No se pudo acceder al micrófono')
    }
  }

  const datos: Punto[] = (resultado?.datos || []).map((x: any) => ({
    label: String(x.label ?? x.fecha ?? x.tipo ?? ''),
    value: x.value ?? x.cantidad ?? 0,
  }))

  return (
    <div className="cyber-card p-6 bg-gradient-to-br from-[#ff0055]/5 to-transparent border border-[#ff0055]/15 rounded-3xl mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-[#ff0055]" />
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">Generá un reporte preguntando (voz o texto)</h3>
      </div>

      <div className="flex gap-2">
        <input
          value={consulta}
          onChange={e => setConsulta(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') generar() }}
          placeholder='Ej: "mostrame mis análisis de audio del último mes" o "IA vs humano"'
          className="flex-1 bg-[#09090b] border border-white/10 rounded-2xl px-5 py-4 text-white text-sm outline-none focus:border-[#ff0055]/40 transition-all"
        />
        <button
          onClick={toggleGrabar}
          disabled={transcribiendo}
          title={grabando ? 'Detener' : 'Hablar'}
          className={`px-5 rounded-2xl border transition-all ${grabando ? 'bg-[#ff0055] border-[#ff0055] text-white animate-pulse' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'} disabled:opacity-40`}
        >
          {transcribiendo ? <Loader2 size={18} className="animate-spin" /> : grabando ? <Square size={18} /> : <Mic size={18} />}
        </button>
        <button
          onClick={() => generar()}
          disabled={cargando || !consulta.trim()}
          title="Generar"
          className="px-5 rounded-2xl bg-[#ff0055] text-white disabled:opacity-30 transition-all"
        >
          {cargando ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>

      {grabando && <p className="text-[9px] text-[#ff0055] font-black uppercase tracking-widest mt-3 animate-pulse">● Grabando… tocá ⬛ para terminar</p>}
      {transcribiendo && <p className="text-[9px] text-white/40 font-black uppercase tracking-widest mt-3">Transcribiendo audio…</p>}
      {error && <p className="text-[10px] text-rose-400 font-bold mt-3">{error}</p>}

      {resultado && (
        <div className="mt-6">
          {resultado.resumen && (
            <p className="text-xs text-white/70 italic mb-4 bg-white/5 border border-white/5 rounded-2xl p-4 leading-relaxed">{resultado.resumen}</p>
          )}
          <TarjetaReporte
            titulo={resultado.titulo || 'Reporte'}
            nombre={resultado.metrica || 'reporte'}
            data={datos}
            formatos={['png', 'svg', 'csv', 'json']}
          >
            {resultado.chart === 'dona'
              ? <Dona data={datos} />
              : resultado.chart === 'linea'
                ? <Linea data={datos} color="#ff0055" />
                : <Barras data={datos} color="#ff0055" />}
          </TarjetaReporte>
        </div>
      )}
    </div>
  )
}
