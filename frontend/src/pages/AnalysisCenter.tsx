import { useState, useRef, useEffect } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useAnonimo } from '../hooks/useAnonimo'
import { useTheme } from '../contexts/ThemeContext'
import { analysisService } from '../services/analysisService'
import type { AnalisisResultado } from '../services/analysisService'
import { codigoService } from '../services/codigoService'
import { 
  ShieldCheck, 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  Zap, 
  Search, 
  Activity, 
  TrendingUp, 
  Download, 
  AlertTriangle, 
  Database, 
  BrainCircuit, 
  Fingerprint, 
  X,
  Code,
  Globe,
  Video,
  Music,
  Loader2,
  FileCode,
  Lock,
  DownloadCloud
} from 'lucide-react'
import { DashboardLayout } from '../components/DashboardLayout'
import { EvidencePlayer } from '../components/ui/EvidencePlayer'

const PLAN_LIMITS = {
  gratis: { livianos: 20, pesados: 5 },
  starter: { livianos: 20, pesados: 5 },
  pro: { livianos: 999999, pesados: 50 },
  elite: { livianos: 999999, pesados: 999999 },
}

type TabType = 'INTELIGENCIA' | 'ARCHIVOS' | 'IMAGEN' | 'VIDEO' | 'AUDIO' | 'RED' | 'CODIGO'

export function AnalysisCenter() {
  const { usuario } = useAuth()
  const { theme } = useTheme()
  const { restantesLivianos, restantesPesados, recargar: recargarAnonimo } = useAnonimo()
  
  const [cargando, setCargando] = useState(false)
  const [mensajeCarga, setMensajeCarga] = useState('')
  const [resultado, setResultado] = useState<AnalisisResultado | null>(null)
  const [vista, setVista] = useState<'dashboard' | 'results'>('dashboard')
  const [tabActiva, setTabActiva] = useState<TabType>('INTELIGENCIA')
  
  const [texto, setTexto] = useState('')
  const [codigo, setCodigo] = useState('')
  const [lenguaje, setLenguaje] = useState('auto')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [showLimitModal, setShowLimitModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (usuario?.rol === 'administrador') return <Navigate to="/admin" replace />

  const getTries = () => {
    // Cualquier usuario logueado (aunque el `plan` aún no haya llegado en el
    // arranque en caliente) usa límites de usuario, NUNCA los de invitado.
    if (usuario) {
      // Preferir los valores reales que manda el backend (límites del admin).
      if (usuario.limites && usuario.restantes) {
        return {
          livianos: usuario.restantes.livianos ?? 0,
          pesados: usuario.restantes.pesados ?? 0,
          totalLivianos: usuario.limites.livianos || 1,
          totalPesados: usuario.limites.pesados || 1,
        }
      }
      const plan = usuario.plan || 'gratis'
      const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.gratis
      return {
        livianos: Math.max(0, limits.livianos - (usuario.intentos_livianos || 0)),
        pesados: Math.max(0, limits.pesados - (usuario.intentos_pesados || 0)),
        totalLivianos: limits.livianos,
        totalPesados: limits.pesados
      }
    }
    return {
      livianos: restantesLivianos || 0,
      pesados: restantesPesados || 0,
      totalLivianos: 4,
      totalPesados: 3
    }
  }

  const { livianos, pesados, totalLivianos, totalPesados } = getTries()

  // Formato: ilimitado se muestra como ∞; y las barras se limitan a 0-100%.
  const fmtCuota = (n: number) => (!Number.isFinite(n) ? '0' : n >= 999999 ? '∞' : String(n))
  const pct = (a: number, b: number) => {
    const v = (a / (b || 1)) * 100
    return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0
  }
  const planActual = usuario?.plan || (usuario ? 'gratis' : 'visitante')

  const getFileType = (file: File | null): 'imagen' | 'video' | 'audio' | 'documento' | 'codigo' | 'otro' => {
    if (!file) return 'otro'
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const type = file.type.toLowerCase()

    if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) return 'imagen'
    if (type.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video'
    if (type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio'
    if (['pdf', 'docx', 'doc', 'txt'].includes(ext)) return 'documento'
    if (['py', 'js', 'ts', 'jsx', 'tsx', 'cpp', 'c', 'java', 'html', 'css', 'json', 'php', 'sql'].includes(ext)) return 'codigo'
    
    return 'otro'
  }

  const handleAnalizar = async () => {
    const esPesado = ['IMAGEN', 'VIDEO', 'AUDIO'].includes(tabActiva)
    if (!esPesado && livianos <= 0) return setShowLimitModal(true)
    if (esPesado && pesados <= 0) return setShowLimitModal(true)

    setCargando(true)
    setMensajeCarga('Preparando entorno seguro...')
    let progressionInterval = setInterval(() => {
      setMensajeCarga(prev => {
        if (prev.includes('Preparando')) return 'Subiendo evidencia cifrada a Supabase...'
        if (prev.includes('Subiendo')) {
            if (tabActiva === 'AUDIO') return 'Analizando firma vocal en ElevenLabs Classifier...'
            return 'Conectando con Motor Neuronal Sightengine...'
        }
        if (prev.includes('Sightengine') || prev.includes('ElevenLabs')) return 'Esperando veredicto (esto puede demorar)...'
        return prev
      })
    }, 4000)

    try {
      let res: AnalisisResultado

      if (tabActiva === 'CODIGO') {
        const r = await codigoService.analizar(codigo, lenguaje === 'auto' ? undefined : lenguaje)
        if (!r.ok || !r.data) {
          if (r.error === 'LIMITE_ALCANZADO' || r.error?.includes('LIMITE')) setShowLimitModal(true)
          else alert(r.error || 'Error en el análisis de código.')
          return
        }
        if (r.data.estado !== 'OK') {
          alert(r.data.detalles)
          return
        }
        const d = r.data
        setResultado({
          id: d.id || 'CODIGO',
          tipo: 'codigo',
          probabilidadIA: d.probabilidadIA,
          veredicto: d.veredicto,
          detalles: d.detalles,
          puntosCriticos: (d.puntosCriticos || []).map(p => ({ titulo: p.titulo, descripcion: p.descripcion ?? '', score: p.score })),
          fecha: d.fecha || new Date().toISOString(),
          contenido: d.contenido ?? codigo,
        })
        setVista('results')
        if (!usuario) await recargarAnonimo()
        return
      }

      if (tabActiva === 'INTELIGENCIA' && texto.trim()) {
        res = await analysisService.analizarTexto(texto)
      } 
      else if (tabActiva === 'ARCHIVOS' && archivo) {
        res = await analysisService.analizarArchivo(archivo)
      }
      else if (tabActiva === 'IMAGEN' && archivo) {
        res = await analysisService.analizarImagen(archivo)
      }
      else if (tabActiva === 'VIDEO' && archivo) {
        res = await analysisService.analizarVideo(archivo)
      }
      else if (tabActiva === 'AUDIO' && archivo) {
        res = await analysisService.analizarAudio(archivo)
      }
      else if (tabActiva === 'RED' && url) {
        res = await analysisService.analizarUrl(url)
      } 
      else {
        alert('Complete los campos.')
        clearInterval(progressionInterval)
        setCargando(false)
        return
      }

      clearInterval(progressionInterval)
      setResultado(res)
      setVista('results')
      if (!usuario) await recargarAnonimo()
    } catch (error: any) {
      clearInterval(progressionInterval)
      console.error("[UI] Error al analizar:", error);
      if (error.response?.data?.error?.codigo === 'LIMITE_ALCANZADO') setShowLimitModal(true)
      else alert(error.response?.data?.error?.mensaje || 'Error en el protocolo de análisis o conexión perdida (Timeout). Revise F12 (Consola) para más detalles.')
    } finally {
      clearInterval(progressionInterval)
      setCargando(false)
    }
  }

  const renderDashboard = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 mb-6">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse"></span>
          <span className="text-[9px] font-black text-[var(--accent)] tracking-widest uppercase">Estatus: Terminal Forense Activa</span>
        </div>
        <h1 className="text-6xl font-black mb-4 tracking-tighter uppercase leading-[0.9] text-[var(--text-main)] italic">
          Ingesta de <br /> <span className="accent-text">Evidencias</span>
        </h1>
        <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[0.4em] max-w-xl leading-loose">Seleccione el vector de entrada para iniciar el escaneo neuronal.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 cyber-card p-1 pb-10 relative overflow-hidden group">
          <div className="scan-line hidden group-hover:block" style={{ background: 'var(--accent)', boxShadow: '0 0 15px var(--accent)' }}></div>
          
          <div className="flex p-4 gap-2 border-b border-[var(--border-color)] bg-black/10">
            {(['INTELIGENCIA', 'ARCHIVOS', 'IMAGEN', 'VIDEO', 'AUDIO', 'RED', 'CODIGO'] as TabType[]).map(t => (
                <button 
                  key={t}
                  onClick={() => { setTabActiva(t); setArchivo(null); }}
                  className={`flex-1 py-4 rounded-xl text-[9px] font-black tracking-widest flex flex-col items-center gap-2 transition-all ${tabActiva === t ? 'bg-[var(--accent)] text-white shadow-[0_0_20px_rgba(255,0,85,0.3)]' : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-main)]'}`}
                >
                  {t === 'INTELIGENCIA' && <FileText size={16} />}
                  {t === 'ARCHIVOS' && <FileCode size={16} />}
                  {t === 'IMAGEN' && <ImageIcon size={16} />}
                  {t === 'VIDEO' && <Video size={16} />}
                  {t === 'AUDIO' && <Music size={16} />}
                  {t === 'RED' && <Globe size={16} />}
                  {t === 'CODIGO' && <Code size={16} />}
                  {t === 'RED' ? 'SITIOS WEB' : t === 'AUDIO' ? 'VOZ/AUDIO' : t === 'CODIGO' ? 'CÓDIGO' : t}
                </button>
            ))}
          </div>

          <div className="px-10 py-12 flex flex-col items-center justify-center min-h-[450px]">
            {tabActiva === 'INTELIGENCIA' && (
              <textarea 
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Pegue rastro digital de texto para análisis de perplejidad..." 
                className="w-full h-72 bg-white/[0.03] border border-[var(--border-color)] rounded-[32px] p-8 text-[var(--text-main)] text-lg font-bold placeholder:opacity-10 focus:outline-none focus:border-[var(--accent)] transition-all resize-none custom-scrollbar"
              />
            )}

            {(tabActiva === 'ARCHIVOS' || tabActiva === 'IMAGEN' || tabActiva === 'VIDEO' || tabActiva === 'AUDIO') && (
              <div className="w-full">
                {!archivo ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[var(--border-color)] rounded-[40px] p-24 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all cursor-pointer text-center group/drop"
                  >
                    <UploadCloud className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-6 group-hover/drop:scale-110 group-hover/drop:text-[var(--accent)] transition-all" />
                    <h3 className="font-black uppercase tracking-[0.2em] text-[var(--text-main)] text-xl mb-2">Cargar {tabActiva === 'AUDIO' ? 'VOZ' : tabActiva}</h3>
                    <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest leading-relaxed">
                        {tabActiva === 'ARCHIVOS' && 'PDF, DOCX, PY, JS, JAVA, CPP'}
                        {tabActiva === 'IMAGEN' && 'JPG, JPEG, PNG, WEBP'}
                        {tabActiva === 'VIDEO' && 'MP4, MOV, AVI, WEBM'}
                        {tabActiva === 'AUDIO' && 'MP3, WAV, OGG, M4A'}
                    </p>
                  </div>
                ) : (
                  <div className="cyber-card p-10 border-[var(--accent)]/30 bg-[var(--accent)]/5 flex items-center justify-between group animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-[var(--accent)]/20 rounded-2xl flex items-center justify-center text-[var(--accent)]">
                        {getFileType(archivo) === 'codigo' && <FileCode size={32} />}
                        {getFileType(archivo) === 'documento' && <FileText size={32} />}
                        {getFileType(archivo) === 'video' && <Video size={32} />}
                        {getFileType(archivo) === 'imagen' && <ImageIcon size={32} />}
                        {getFileType(archivo) === 'audio' && <Music size={32} />}
                        {getFileType(archivo) === 'otro' && <Database size={32} />}
                      </div>
                      <div>
                        <p className="text-[var(--text-main)] font-black uppercase tracking-widest">{archivo.name}</p>
                        <p className="text-[var(--text-muted)] text-[10px] font-black">{(archivo.size / 1024 / 1024).toFixed(2)} MB • {getFileType(archivo).toUpperCase()}</p>
                      </div>
                    </div>
                    <button onClick={() => setArchivo(null)} className="p-4 hover:bg-white/10 rounded-2xl transition-all cursor-pointer"><X className="text-[var(--text-muted)]" /></button>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={(e) => setArchivo(e.target.files?.[0] || null)} 
                  className="hidden" 
                  accept={
                    tabActiva === 'IMAGEN' ? 'image/*' : 
                    tabActiva === 'VIDEO' ? 'video/*' : 
                    tabActiva === 'AUDIO' ? 'audio/*' :
                    tabActiva === 'ARCHIVOS' ? '.pdf,.docx,.doc,.py,.js,.ts,.cpp,.java' : '*'
                  }
                />
              </div>
            )}

            {tabActiva === 'RED' && (
              <div className="w-full space-y-6">
                 <div className="relative">
                    <Globe className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={24} />
                    <input 
                        type="text" 
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://articulo-noticia-o-blog.com/..."
                        className="w-full bg-white/[0.03] border border-[var(--border-color)] rounded-3xl py-6 pl-16 pr-8 text-[var(--text-main)] font-bold outline-none focus:border-[var(--accent)] transition-all"
                    />
                 </div>
                 <p className="text-[9px] text-[var(--text-muted)] text-center font-black uppercase tracking-[0.3em]">El sistema extraerá el contenido semántico del enlace para auditoría.</p>
              </div>
            )}

            {tabActiva === 'CODIGO' && (
              <div className="w-full space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">Pegue código fuente para análisis de perplejidad</p>
                  <select
                    value={lenguaje}
                    onChange={(e) => setLenguaje(e.target.value)}
                    className="bg-white/[0.03] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-[var(--accent)] cursor-pointer appearance-none shrink-0"
                  >
                    {['auto', 'python', 'javascript', 'typescript', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby', 'sql'].map(l => (
                      <option key={l} value={l}>{l.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  spellCheck={false}
                  placeholder="// Pegue una función o archivo de código fuente..."
                  className="w-full h-72 bg-white/[0.03] border border-[var(--border-color)] rounded-[32px] p-8 text-[var(--text-main)] text-[13px] font-mono placeholder:opacity-10 focus:outline-none focus:border-[var(--accent)] transition-all resize-none custom-scrollbar"
                />
                <p className="text-[9px] text-[var(--text-muted)] text-center font-black uppercase tracking-[0.3em] leading-relaxed">
                  La detección de código IA no es 100% fiable: tómelo como indicio, no como acusación.
                </p>
              </div>
            )}

            <button 
              onClick={handleAnalizar}
              disabled={cargando || (tabActiva === 'INTELIGENCIA' ? !texto.trim() : tabActiva === 'RED' ? !url.trim() : tabActiva === 'CODIGO' ? !codigo.trim() : !archivo)}
              className="btn-primary mt-12 px-20 py-6 rounded-2xl text-xs font-black tracking-[0.4em] uppercase transition-all flex items-center gap-3 disabled:opacity-10 cursor-pointer"
              style={{ background: theme === 'light' ? 'var(--text-main)' : 'white', color: theme === 'light' ? 'var(--bg)' : 'black' }}
            >
              {cargando ? <><Loader2 size={16} className="animate-spin" /> Analizando Vector...</> : <><Zap size={16} /> Ejecutar Protocolo</>}
            </button>
          </div>

          {cargando && (
            <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center z-50">
              <Loader2 size={64} className="text-[var(--accent)] animate-spin mb-6" />
              <p className="text-[var(--accent)] text-[10px] font-black tracking-[0.6em] animate-pulse uppercase text-center">
                  {mensajeCarga || 'Iniciando Protocolo...'}
              </p>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="cyber-card p-10 relative overflow-hidden border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-10 border-b border-[var(--border-color)] pb-4">
              <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] italic">Cuota de Operación</h4>
              <span className="text-[10px] font-black uppercase tracking-widest italic accent-text">Plan: {planActual}</span>
            </div>
            <div className="space-y-8">
              <div>
                <div className="flex justify-between items-end mb-3">
                  <span className="text-[10px] font-black text-[var(--text-main)] tracking-widest uppercase italic">Analizador Liviano</span>
                  <span className="text-3xl font-black italic accent-text">{fmtCuota(livianos)}</span>
                </div>
                <div className="w-full bg-black/10 h-2 rounded-full p-[2px]">
                  <div className="bg-cyan-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(34,211,238,0.5)]" style={{ width: `${pct(livianos, totalLivianos)}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-end mb-3">
                  <span className="text-[10px] font-black text-[var(--text-main)] tracking-widest uppercase italic">Analizador Pesado</span>
                  <span className="text-3xl font-black italic accent-text">{fmtCuota(pesados)}</span>
                </div>
                <div className="w-full bg-black/10 h-2 rounded-full p-[2px]">
                  <div className="bg-[var(--accent)] h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_var(--accent-glow)]" style={{ width: `${pct(pesados, totalPesados)}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="cyber-card p-10 bg-white/[0.02] border-[var(--border-color)]">
             <h4 className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest mb-6 border-b border-[var(--border-color)] pb-4 italic">Soporte Técnico</h4>
             <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3"><FileText size={14} className="text-cyan-400"/> <span className="text-[9px] font-black text-[var(--text-muted)] uppercase">PDF/DOCX</span></div>
                <div className="flex items-center gap-3"><Code size={14} className="text-cyan-400"/> <span className="text-[9px] font-black text-[var(--text-muted)] uppercase">CODE/PY</span></div>
                <div className="flex items-center gap-3"><ImageIcon size={14} className="text-[var(--accent)]"/> <span className="text-[9px] font-black text-[var(--text-muted)] uppercase">JPG/PNG</span></div>
                <div className="flex items-center gap-3"><Video size={14} className="text-[var(--accent)]"/> <span className="text-[9px] font-black text-[var(--text-muted)] uppercase">MP4/MOV</span></div>
             </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderResults = () => {
    if (!resultado) return null
    const isVideo = resultado.tipo === 'video'
    
    // Extraer datos forenses específicos si es video
    const audioForense = isVideo ? resultado.puntosCriticos.find(p => p.titulo.includes('Audio')) : null
    const videoForense = isVideo ? resultado.puntosCriticos.find(p => p.titulo.includes('Visual')) : null

    return (
      <div className="animate-in fade-in zoom-in-95 duration-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-3 h-3 bg-[var(--accent)] rounded-full shadow-[0_0_100px_var(--accent-glow)]"></span>
              <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.5em]">Reporte Técnico Final</span>
            </div>
            <h1 className="text-6xl font-black text-[var(--text-main)] uppercase tracking-tighter italic leading-none">ID_#{resultado.id.slice(-8).toUpperCase()}</h1>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setVista('dashboard')} className="bg-[var(--accent)] text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[var(--accent)]/20 hover:scale-105 transition-all">
              Nuevo Escaneo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 space-y-10">
            {/* LÓGICA DE VISUALIZACIÓN DE SCORE */}
            <div className="cyber-card p-12 flex flex-col items-center justify-center text-center relative overflow-hidden border-[var(--border-color)]">
              {isVideo ? (
                /* VISTA DUAL PARA VIDEO (Estilo muestra.html) */
                <div className="w-full space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/20 p-6 rounded-[32px] border border-white/5">
                      <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-2">Forense Audio</span>
                      <span className={`text-4xl font-black italic block mb-1 ${audioForense?.label === 'NATURAL' ? 'text-emerald-400' : 'text-[var(--accent)]'}`}>
                        {audioForense?.score || 0}%
                      </span>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${audioForense?.label === 'NATURAL' ? 'text-emerald-500/50' : 'text-[var(--accent)]/50'}`}>
                        {audioForense?.label || 'DESC.'}
                      </span>
                    </div>
                    <div className="bg-black/20 p-6 rounded-[32px] border border-white/5">
                      <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-2">Forense Visual</span>
                      <span className={`text-4xl font-black italic block mb-1 ${videoForense?.label === 'NATURAL' ? 'text-emerald-400' : 'text-[var(--accent)]'}`}>
                        {videoForense?.score || 0}%
                      </span>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${videoForense?.label === 'NATURAL' ? 'text-emerald-500/50' : 'text-[var(--accent)]/50'}`}>
                        {videoForense?.label || 'DESC.'}
                      </span>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-white/5">
                    <h5 className={`text-sm font-black uppercase tracking-widest mb-2 ${resultado.probabilidadIA > 50 ? 'text-[var(--accent)]' : 'text-emerald-500'}`}>{resultado.veredicto}</h5>
                    <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-relaxed">Análisis Híbrido Multimodal Finalizado</p>
                  </div>
                </div>
              ) : (
                /* VISTA CIRCULAR PARA OTROS TIPOS */
                <>
                  <div className="relative w-64 h-64 mb-10">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="128" cy="128" r="115" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="3" />
                      <circle cx="128" cy="128" r="115" fill="none" stroke={resultado.probabilidadIA > 50 ? "var(--accent)" : "#10b981"} strokeWidth="12" strokeDasharray="722.5" strokeDashoffset={722.5 - (722.5 * resultado.probabilidadIA) / 100} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-7xl font-black italic text-[var(--text-main)]">{Math.round(resultado.probabilidadIA)}%</span>
                      <span className="text-[9px] font-black tracking-[0.4em] text-[var(--text-muted)] mt-2 uppercase">Prob. IA</span>
                    </div>
                  </div>
                  <h5 className={`text-sm font-black uppercase tracking-widest mb-2 ${resultado.probabilidadIA > 50 ? 'text-[var(--accent)]' : 'text-emerald-500'}`}>{resultado.veredicto}</h5>
                  <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{resultado.detalles}</p>
                </>
              )}
            </div>

            {/* REPRODUCTOR DE EVIDENCIA (Solo para multimedia) */}
            {['imagen', 'audio', 'video'].includes(resultado.tipo) && (
              <EvidencePlayer 
                tipo={resultado.tipo} 
                url={resultado.contenido} 
                planUsuario={usuario?.plan || 'gratis'} 
              />
            )}
          </div>

          <div className="lg:col-span-7 cyber-card p-12 space-y-10 border-[var(--border-color)] overflow-hidden">
            <div>
              <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.4em] mb-8">Diagnóstico_Motor</h3>
              <div className="p-10 bg-[var(--bg)] border-l-8 border-[var(--accent)] rounded-r-3xl border border-[var(--border-color)] shadow-xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-[var(--accent)]/5 translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                <p className="text-2xl italic font-black leading-relaxed text-[var(--text-main)] relative z-10">"{resultado.detalles}"</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {resultado.puntosCriticos.map((p, i) => (
                <div key={i} className="p-8 bg-white/[0.03] rounded-[32px] border border-[var(--border-color)] group hover:border-[var(--accent)] transition-all">
                   <div className="flex items-center justify-between mb-6">
                      <BrainCircuit className="text-[var(--accent)] w-8 h-8" />
                      {p.label && <span className={`text-[8px] font-black px-3 py-1 rounded-full border ${p.label === 'NATURAL' ? 'border-emerald-500/30 text-emerald-500' : 'border-[var(--accent)]/30 text-[var(--accent)]'}`}>{p.label}</span>}
                   </div>
                   <h5 className="text-xs font-black text-[var(--text-main)] uppercase tracking-widest mb-2 italic">{p.titulo}</h5>
                   <p className="text-[11px] text-[var(--text-muted)] font-black leading-relaxed uppercase tracking-widest">{p.descripcion}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto pb-20">
        {vista === 'dashboard' ? renderDashboard() : renderResults()}
      </div>
      {showLimitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8" style={{ backgroundColor: 'var(--modal-overlay)', backdropFilter: 'blur(25px)' }}>
          <div className="max-w-md w-full cyber-card p-16 text-center border-[var(--accent)]/40 bg-[var(--card-bg)] shadow-[0_0_100px_rgba(255,0,85,0.2)]">
            <ShieldCheck className="w-20 h-20 text-[var(--accent)] mx-auto mb-10" />
            <h2 className="text-4xl font-black mb-6 italic uppercase text-[var(--text-main)] tracking-tighter">Acceso Restringido</h2>
            <p className="text-[var(--text-muted)] text-sm font-black mb-12 uppercase tracking-[0.2em] leading-relaxed">Ha superado el límite de escaneos autorizados para su nivel.</p>
            <div className="space-y-4">
              <Link to="/planes" onClick={() => setShowLimitModal(false)} className="w-full py-6 bg-[var(--accent)] text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] block text-center shadow-xl shadow-[var(--accent)]/20">Ascender de Nivel</Link>
              <button onClick={() => setShowLimitModal(false)} className="w-full py-6 bg-white/5 text-[var(--text-muted)] rounded-2xl text-[11px] font-black tracking-widest uppercase hover:text-[var(--text-main)] transition-all border border-white/5">Regresar</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

