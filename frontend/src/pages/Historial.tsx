import { useEffect, useState } from 'react'
import { DashboardLayout } from '../components/DashboardLayout'
import { analysisService } from '../services/analysisService'
import type { AnalisisResultado } from '../services/analysisService'
import { Clock, ChevronRight, Search, FileText, Image as ImageIcon, X, Download, ShieldCheck, Video, Code } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useTheme } from '../contexts/ThemeContext'
import { EvidencePlayer } from '../components/ui/EvidencePlayer'
import { useAuth } from '../hooks/useAuth'

export function Historial() {
  const { usuario } = useAuth()
  const { theme } = useTheme()
  const [historial, setHistorial] = useState<AnalisisResultado[]>([])
  const [cargando, setCargando] = useState(true)
  const [selectedItem, setSelectedItem] = useState<AnalisisResultado | null>(null)

  useEffect(() => {
    analysisService.obtenerHistorial()
      .then(data => {
        setHistorial(data)
        // LÓGICA DE NAVEGACIÓN DIRECTA (Desde Notificación)
        const pendingId = sessionStorage.getItem('scammer-pending-analysis-id')
        if (pendingId) {
          const item = data.find(i => i.id === pendingId)
          if (item) setSelectedItem(item)
          sessionStorage.removeItem('scammer-pending-analysis-id')
        }
      })
      .finally(() => setCargando(false))
  }, [])

  const getIcon = (tipo: string) => {
    switch (tipo) {
        case 'imagen': return <ImageIcon size={20} />
        case 'video': return <Video size={20} />
        case 'codigo': return <Code size={20} />
        default: return <FileText size={20} />
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 text-[var(--text-main)]">
        <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-[var(--text-main)] mb-2 tracking-tighter uppercase leading-none italic">
              Archivo <br /> <span className="accent-text">Histórico</span>
            </h1>
            <p className="text-[var(--text-muted)] text-[10px] font-black tracking-[0.3em] uppercase">Registros Forenses Almacenados</p>
          </div>
          <div className="bg-white/5 border border-[var(--border-color)] rounded-2xl px-6 py-3 flex items-center gap-4 text-[var(--text-muted)] w-full md:w-auto focus-within:border-[var(--accent)] transition-all">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="BUSCAR HASH O ID..." 
              className="bg-transparent border-none outline-none text-[10px] font-black tracking-widest uppercase placeholder:opacity-20 w-full md:w-48 text-[var(--text-main)]" 
            />
          </div>
        </div>

        {cargando ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white/[0.02] border border-[var(--border-color)] rounded-3xl animate-pulse"></div>
            ))}
          </div>
        ) : historial.length === 0 ? (
          <div className="cyber-card p-20 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-[25px] flex items-center justify-center mx-auto mb-8 border border-[var(--border-color)]">
              <Clock className="text-[var(--text-muted)] opacity-20" size={32} />
            </div>
            <h3 className="text-[var(--text-main)] font-black text-xl mb-2 uppercase tracking-tighter italic">Sin Evidencias</h3>
            <p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-widest leading-relaxed">Aún no has procesado ningún análisis en este terminal.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {historial.map((item) => (
              <div 
                key={item.id} 
                onClick={() => setSelectedItem(item)}
                className="group bg-[var(--card-bg)] hover:bg-white/[0.05] border border-[var(--border-color)] hover:border-[var(--accent)]/30 rounded-3xl p-6 flex items-center gap-6 transition-all duration-500 cursor-pointer"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl border ${item.probabilidadIA > 50 ? 'bg-[var(--accent)]/10 border-[var(--accent)]/20 text-[var(--accent)]' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                  {getIcon(item.tipo)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">ID: {item.id.slice(-8).toUpperCase()}</span>
                    <span className="w-1 h-1 rounded-full bg-[var(--border-color)]"></span>
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-tighter opacity-60">
                      {format(new Date(item.fecha), "dd MMM yyyy · HH:mm", { locale: es })}
                    </span>
                  </div>
                  <h4 className="text-[var(--text-main)] font-black uppercase tracking-tight leading-tight group-hover:text-[var(--accent)] transition-colors italic">{item.veredicto}</h4>
                </div>

                <div className="text-right mr-4 hidden sm:block">
                  <div className="text-2xl font-black italic text-[var(--text-main)] leading-none mb-1">{Math.round(item.probabilidadIA)}%</div>
                  <div className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">IA_PROB</div>
                </div>

                <div className="w-10 h-10 rounded-xl bg-white/5 border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-[var(--accent)] group-hover:text-white group-hover:border-transparent transition-all">
                  <ChevronRight size={18} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Detalle de Evidencia */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300" style={{ backgroundColor: 'var(--modal-overlay)', backdropFilter: 'blur(25px)' }}>
          <div className="max-w-4xl w-full cyber-card p-0 overflow-hidden relative shadow-[0_0_100px_rgba(0,0,0,0.5)] border-[var(--border-color)] bg-[var(--card-bg)]">
            <div className={`h-1.5 w-full ${selectedItem.probabilidadIA > 50 ? 'bg-[var(--accent)]' : 'bg-emerald-500'}`}></div>
            
            <div className="p-8 md:p-12">
              <div className="flex justify-between items-start mb-10 text-[var(--text-main)]">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedItem.probabilidadIA > 50 ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">Expediente_#{selectedItem.id.slice(-8).toUpperCase()}</h3>
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{selectedItem.tipo} · {format(new Date(selectedItem.fecha), "PPPP", { locale: es })}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-[var(--text-muted)]">
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Contenido Analizado */}
                <div className="lg:col-span-7 space-y-6">
                  <h4 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.4em]">Contenido Analizado</h4>
                  <div className="bg-[var(--bg)] border border-[var(--border-color)] rounded-3xl p-8 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {(selectedItem.contenido?.includes('[ELIMINADO]') || selectedItem.contenido?.includes('[PURGADO]')) ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-4 opacity-30 text-center">
                            <X size={48} className="text-[var(--accent)]" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">Evidencia Eliminada por Política de Plan</span>
                            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10 mt-2">
                                <FileText size={14} />
                                <span className="text-[9px] font-black tracking-tighter uppercase">{selectedItem.nombreArchivo || 'evidencia'}.{selectedItem.extension || 'bin'}</span>
                            </div>
                            <p className="text-[9px] font-bold text-[var(--text-muted)] max-w-xs mt-2">Eleva tu acreditación a PRO o ELITE para conservar archivos multimedia.</p>
                        </div>
                    ) : (selectedItem.tipo === 'texto' || selectedItem.tipo === 'codigo' || selectedItem.tipo === 'url' || selectedItem.tipo === 'documento') ? (
                      <p className="text-[var(--text-main)] font-black leading-relaxed italic whitespace-pre-wrap text-sm">
                        {selectedItem.contenido}
                      </p>
                    ) : (
                      <EvidencePlayer 
                        tipo={selectedItem.tipo as 'imagen' | 'audio' | 'video'} 
                        url={selectedItem.contenido} 
                        planUsuario={usuario?.plan || 'gratis'} 
                      />
                    )}
                  </div>
                  </div>

                  {/* Resultado y Veredicto */}

                <div className="lg:col-span-5 space-y-8">
                   <div className="cyber-card p-10 flex flex-col items-center text-center bg-white/[0.02] border-[var(--border-color)]">
                      {selectedItem.tipo === 'video' ? (
                        <div className="w-full space-y-4 mb-6">
                          <div className="grid grid-cols-2 gap-2">
                            {selectedItem.puntosCriticos.slice(0,2).map((p, i) => (
                              <div key={i} className="bg-black/20 p-4 rounded-2xl border border-white/5 flex flex-col items-center">
                                <span className="text-[7px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-1 text-center">{p.titulo}</span>
                                <span className={`text-2xl font-black italic block mb-0.5 ${p.label === 'NATURAL' ? 'text-emerald-400' : 'text-[var(--accent)]'}`}>
                                  {p.score || 0}%
                                </span>
                                <span className={`text-[8px] font-black uppercase tracking-widest ${p.label === 'NATURAL' ? 'text-emerald-500/50' : 'text-[var(--accent)]/50'}`}>
                                  {p.label || 'DESC.'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-32 h-32 mb-6">
                          <svg className="w-full h-full -rotate-90">
                            <circle cx="64" cy="64" r="58" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="3" />
                            <circle 
                              cx="64" cy="64" r="58" fill="none" stroke={selectedItem.probabilidadIA > 50 ? 'var(--accent)' : '#10b981'} strokeWidth="8" 
                              strokeDasharray="364.4" 
                              strokeDashoffset={364.4 - (364.4 * selectedItem.probabilidadIA) / 100}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black italic text-[var(--text-main)]">{Math.round(selectedItem.probabilidadIA)}%</span>
                          </div>
                        </div>
                      )}
                      <h5 className={`text-sm font-black uppercase tracking-widest mb-2 ${selectedItem.probabilidadIA > 50 ? 'text-[var(--accent)]' : 'text-emerald-500'}`}>
                        {selectedItem.veredicto}
                      </h5>
                      <p className="text-[9px] font-black text-[var(--text-muted)] uppercase leading-relaxed">
                        {selectedItem.detalles}
                      </p>
                   </div>

                   <div className="space-y-4">
                      {selectedItem.tipo !== 'video' && selectedItem.puntosCriticos.map((p, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-white/5 border border-[var(--border-color)] rounded-2xl">
                          <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${selectedItem.probabilidadIA > 50 ? 'text-[var(--accent)]' : 'text-emerald-500'}`}>
                            <ShieldCheck size={16} />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-[var(--text-main)] uppercase">{p.titulo}</p>
                            <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">{p.descripcion}</p>
                          </div>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
