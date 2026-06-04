import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/DashboardLayout'
import { 
  FileText, 
  Image as ImageIcon,
  ShieldAlert, 
  Zap, 
  UserPlus, 
  Database, 
  Loader2,
  Bell,
  Settings2,
  Check,
  Smartphone,
  Volume2
} from 'lucide-react'
import { api } from '../../services/api'
import type { RespuestaApi } from '../../types/auth'

interface CanalConfig {
  mostrar: boolean
  notificar: boolean
  sonar: boolean
}

interface Preferencias {
  global_push: boolean
  canales: {
    analisis_liviano: CanalConfig
    analisis_pesado: CanalConfig
    seguridad: CanalConfig
    pago: CanalConfig
    registro: CanalConfig
    sistema: CanalConfig
  }
}

export function AdminNotificacionesConfig() {
  const [prefs, setPrefs] = useState<Preferencias | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    api.get<RespuestaApi<Preferencias>>('/analisis/notificaciones/preferencias/')
      .then(res => setPrefs(res.data.datos || null))
      .finally(() => setCargando(false))
  }, [])

  const handleGlobalToggle = () => {
    if (!prefs) return
    setPrefs({ ...prefs, global_push: !prefs.global_push })
  }

  const handleCanalChange = (categoria: keyof Preferencias['canales'], campo: keyof CanalConfig) => {
    if (!prefs) return
    const newPrefs = { ...prefs }
    
    // Si la categoría no existe (ej. usuario antiguo o backend no lo envió), la inicializamos
    if (!newPrefs.canales[categoria]) {
      newPrefs.canales[categoria] = { mostrar: false, notificar: false, sonar: false }
    }
    
    newPrefs.canales[categoria][campo] = !newPrefs.canales[categoria][campo]
    setPrefs(newPrefs)
  }

  const guardar = async () => {
    if (!prefs) return
    setGuardando(true)
    try {
      await api.patch('/analisis/notificaciones/preferencias/', prefs)
      // Feedback visual sin alert molesto
    } catch (e) {
      console.error("Error al guardar:", e)
    } finally {
      setTimeout(() => setGuardando(false), 800)
    }
  }

  if (cargando) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 className="w-12 h-12 text-[#ff0055] animate-spin mb-4" />
        <p className="text-[#ff0055] text-[10px] font-black tracking-widest uppercase">Cargando Protocolos de Alerta...</p>
      </div>
    </DashboardLayout>
  )

  const categorias = [
    { id: 'analisis_liviano', label: 'Análisis_Liviano', sub: 'Texto, Documentos, Código', icon: <FileText size={20}/>, color: 'text-cyan-400', bg: 'bg-cyan-400/10', toggleClass: 'active-cyan' },
    { id: 'analisis_pesado', label: 'Análisis_Pesado', sub: 'Imagen, Video, Audio', icon: <ImageIcon size={20}/>, color: 'text-pink-500', bg: 'bg-pink-500/10', toggleClass: 'active' },
    { id: 'seguridad', label: 'Seguridad_Forense', sub: 'Accesos, Bloqueos, Tokens', icon: <ShieldAlert size={20}/>, color: 'text-red-500', bg: 'bg-red-500/10', toggleClass: 'active' },
    { id: 'pago', label: 'Módulo_Finanzas', sub: 'Suscripciones y Upgrades', icon: <Zap size={20}/>, color: 'text-emerald-500', bg: 'bg-emerald-500/10', toggleClass: 'active-emerald' },
    { id: 'registro', label: 'Reclutamiento', sub: 'Nuevos Agentes en Sistema', icon: <UserPlus size={20}/>, color: 'text-emerald-500', bg: 'bg-emerald-500/10', toggleClass: 'active-emerald' },
  ]

  return (
    <DashboardLayout>
      <style>{`
        .toggle-btn {
            width: 40px; height: 20px; border-radius: 20px;
            background: rgba(255,255,255,0.05); position: relative;
            cursor: pointer; transition: all 0.3s ease;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .toggle-circle {
            width: 14px; height: 14px; background: white;
            border-radius: 50%; position: absolute;
            top: 2px; left: 2px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .toggle-btn.active { background: #ff0055; border-color: #ff0055; }
        .toggle-btn.active-cyan { background: #00f2ff; border-color: #00f2ff; }
        .toggle-btn.active-emerald { background: #10b981; border-color: #10b981; }
        .active .toggle-circle, .active-cyan .toggle-circle, .active-emerald .toggle-circle { left: 22px; }
        
        .channel-row {
            display: grid; grid-template-columns: 1fr 100px 100px 100px;
            align-items: center; padding: 24px 0;
            border-bottom: 1px solid rgba(255,255,255,0.03);
        }
      `}</style>

      <div className="animate-in fade-in duration-700 max-w-5xl mx-auto pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
            <div>
                <h1 className="text-4xl font-black italic uppercase tracking-tighter text-[var(--text-main)]">Alertas_Config</h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-2">Protocolo de Enrutamiento de Notificaciones</p>
            </div>
            <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
                <span className="text-[9px] font-black uppercase text-white/40 tracking-widest">Global_Push</span>
                <div 
                    className={`toggle-btn ${prefs?.global_push ? 'active' : ''}`}
                    onClick={handleGlobalToggle}
                >
                    <div className="toggle-circle"></div>
                </div>
            </div>
        </div>

        <div className="cyber-card p-10 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-[32px]">
            {/* HEADERS */}
            <div className="channel-row mb-4 opacity-30 text-[9px] font-black uppercase tracking-[0.2em]">
                <div className="pl-6">Canal de Transmisión</div>
                <div className="text-center">Mostrar</div>
                <div className="text-center">Push</div>
                <div className="text-center">Sonido</div>
            </div>

            {categorias.map((cat) => {
                const c = cat.id as keyof Preferencias['canales']
                const config = prefs?.canales[c] || { mostrar: false, notificar: false, sonar: false }

                return (
                    <div key={cat.id} className="channel-row group hover:bg-white/[0.01] transition-colors rounded-xl px-2">
                        <div className="flex items-center gap-5 pl-4">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${cat.bg} ${cat.color}`}>
                                {cat.icon}
                            </div>
                            <div>
                                <h4 className={`text-xs font-black uppercase tracking-tight ${cat.color}`}>{cat.label}</h4>
                                <p className="text-[9px] font-bold text-slate-500 uppercase italic mt-1">{cat.sub}</p>
                            </div>
                        </div>

                        {/* Toggles */}
                        <div className="flex justify-center">
                            <div 
                                className={`toggle-btn ${config.mostrar ? cat.toggleClass : ''}`}
                                onClick={() => handleCanalChange(c, 'mostrar')}
                            >
                                <div className="toggle-circle"></div>
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <div 
                                className={`toggle-btn ${config.notificar ? cat.toggleClass : ''}`}
                                onClick={() => handleCanalChange(c, 'notificar')}
                            >
                                <div className="toggle-circle"></div>
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <div 
                                className={`toggle-btn ${config.sonar ? cat.toggleClass : ''}`}
                                onClick={() => handleCanalChange(c, 'sonar')}
                            >
                                <div className="toggle-circle"></div>
                            </div>
                        </div>
                    </div>
                )
            })}

            <div className="mt-16 flex justify-end">
                <button 
                    onClick={guardar}
                    disabled={guardando}
                    className="group relative px-12 py-5 bg-[#ff0055] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] overflow-hidden transition-all hover:scale-105 disabled:opacity-50"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    <span className="relative flex items-center gap-3">
                        {guardando ? <Loader2 size={14} className="animate-spin"/> : <Settings2 size={14}/>}
                        {guardando ? 'Sincronizando...' : 'Sincronizar Protocolos'}
                    </span>
                </button>
            </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="cyber-card p-8 border-cyan-400/20 bg-cyan-400/5 group hover:border-cyan-400/40 transition-all">
                <div className="p-3 bg-cyan-400/10 w-fit rounded-xl text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                    <Bell size={20}/>
                </div>
                <h5 className="text-[10px] font-black uppercase text-cyan-400 mb-2 tracking-widest">Web_Dashboard</h5>
                <p className="text-[11px] text-slate-500 leading-relaxed font-bold uppercase">Controla qué eventos se retienen en la bandeja de entrada forense del terminal web.</p>
            </div>
            <div className="cyber-card p-8 border-pink-500/20 bg-pink-500/5 group hover:border-pink-500/40 transition-all">
                <div className="p-3 bg-pink-500/10 w-fit rounded-xl text-pink-500 mb-6 group-hover:scale-110 transition-transform">
                    <Smartphone size={20}/>
                </div>
                <h5 className="text-[10px] font-black uppercase text-pink-500 mb-2 tracking-widest">Mobile_Enigma</h5>
                <p className="text-[11px] text-slate-500 leading-relaxed font-bold uppercase">Enrutamiento seguro hacia dispositivos móviles encriptados para alertas en tiempo real.</p>
            </div>
            <div className="cyber-card p-8 border-emerald-500/20 bg-emerald-500/5 group hover:border-emerald-500/40 transition-all">
                <div className="p-3 bg-emerald-500/10 w-fit rounded-xl text-emerald-500 mb-6 group-hover:scale-110 transition-transform">
                    <Volume2 size={20}/>
                </div>
                <h5 className="text-[10px] font-black uppercase text-emerald-500 mb-2 tracking-widest">Snd_Feedback</h5>
                <p className="text-[11px] text-slate-500 leading-relaxed font-bold uppercase">Gestión de alertas sonoras tácticas según la importancia del rastro detectado.</p>
            </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
