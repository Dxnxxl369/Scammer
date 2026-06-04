import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/DashboardLayout'
import { useNotifications } from '../../contexts/NotificationContext'
import { 
  ScrollText, 
  Loader2, 
  User, 
  Globe, 
  Clock, 
  Zap, 
  FileText, 
  Image as ImageIcon, 
  CreditCard, 
  UserPlus, 
  AlertCircle, 
  Filter, 
  ShieldAlert,
  Activity,
  LogOut,
  FileType,
  Code,
  Video,
  Mic,
  Key,
  AlertTriangle
} from 'lucide-react'

interface LogEntry {
  id: string
  usuario: string
  usuario_id: string
  usuario_nombre?: string
  usuario_email?: string
  accion: string
  modulo: string
  ip: string
  fecha: string
  estado: string
  detalles: string
}

export function AdminBitacora() {
  const { logs, wsConnected } = useNotifications()
  const [filtro, setFiltro] = useState('')

  const filteredLogs = logs.filter((log: LogEntry) => 
    log.accion?.toLowerCase().includes(filtro.toLowerCase()) ||
    log.modulo?.toLowerCase().includes(filtro.toLowerCase()) ||
    log.usuario_nombre?.toLowerCase().includes(filtro.toLowerCase()) ||
    log.detalles?.toLowerCase().includes(filtro.toLowerCase())
  )

  const getLogConfig = (log: LogEntry) => {
    const accion = log.accion.toLowerCase()
    const modulo = (log.modulo || '').toLowerCase()
    const detalles = log.detalles?.toLowerCase() || ''
    const estado = (log.estado || '').toUpperCase()

    // 1. LOGOUT (Gris/Slate)
    if (accion.includes('cierre') || accion.includes('logout')) {
      return {
        className: 'logout-b',
        color: '#64748b',
        icon: <LogOut size={18} />,
        tag: 'LOGOUT',
        bg: 'rgba(100, 116, 139, 0.1)'
      }
    }

    // 2. REGISTRO / PAGOS (Esmeralda)
    if (modulo.includes('registro') || modulo.includes('pago') || modulo.includes('finanza')) {
      return {
        className: 'exito',
        color: '#10b981',
        icon: modulo.includes('registro') ? <UserPlus size={18} /> : <Zap size={18} />,
        tag: modulo.includes('pago') || modulo.includes('finanza') ? 'FINANZAS' : 'CREACIÓN',
        bg: 'rgba(16, 185, 129, 0.1)'
      }
    }

    // 3. SEGURIDAD / ERRORES (Rojo Profundo / Naranja)
    if (modulo.includes('seguridad') || estado === 'ERROR') {
      const isError = estado === 'ERROR'
      return {
        className: isError ? 'error-card' : 'alerta',
        color: isError ? '#ef4444' : '#f59e0b',
        icon: isError ? <ShieldAlert size={18} /> : <AlertTriangle size={18} />,
        tag: isError ? 'ERROR_SISTEMA' : 'ADVERTENCIA',
        bg: isError ? 'rgba(127, 29, 29, 0.2)' : 'rgba(245, 158, 11, 0.1)'
      }
    }

    // 4. ANÁLISIS PESADO (Rosa/Rojo Brillante)
    if (modulo.includes('análisis') || modulo.includes('analisis') || accion.includes('análisis') || accion.includes('analisis')) {
      if (detalles.includes('pesado') || accion.includes('imagen') || accion.includes('video') || accion.includes('audio') || accion.includes('voz') || detalles.includes('imagen') || detalles.includes('video') || detalles.includes('audio')) {
        let icon = <ImageIcon size={18} />
        if (accion.includes('video') || detalles.includes('video')) icon = <Video size={18} />
        if (accion.includes('audio') || accion.includes('voz') || detalles.includes('audio') || detalles.includes('voz')) icon = <Mic size={18} />
        
        return {
          className: 'pesado',
          color: '#ff0055',
          icon: icon,
          tag: 'PESADO',
          bg: 'rgba(255, 0, 85, 0.1)'
        }
      }

      // 5. ANÁLISIS LIVIANO (Celeste) - Fallback para análisis
      let icon = <FileText size={18} />
      if (accion.includes('documento') || detalles.includes('documento') || accion.includes('pdf')) icon = <FileType size={18} />
      if (accion.includes('código') || accion.includes('codigo') || detalles.includes('código')) icon = <Code size={18} />
      if (accion.includes('sesión') || accion.includes('sesion')) icon = <Key size={18} />

      return {
        className: 'liviano',
        color: '#00f2ff',
        icon: icon,
        tag: accion.includes('sesión') || accion.includes('sesion') ? 'ACCESO' : 'LIVIANO',
        bg: 'rgba(0, 242, 255, 0.1)'
      }
    }

    // Default Fallback
    return {
      className: '',
      color: '#ffffff',
      icon: <ScrollText size={18} />,
      tag: (log.modulo || 'SISTEMA').toUpperCase(),
      bg: 'rgba(255, 255, 255, 0.05)'
    }
  }

  return (
    <DashboardLayout>
      <style>{`
        .entry-card {
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 18px;
          padding: 18px 22px;
          display: grid;
          grid-template-columns: 44px 1fr auto;
          gap: 16px;
          align-items: center;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .entry-card::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          border-radius: 3px 0 0 3px;
        }
        .entry-card.liviano::before { background: #00f2ff; box-shadow: 0 0 8px rgba(0,242,255,0.4); }
        .entry-card.pesado::before { background: #ff0055; box-shadow: 0 0 8px rgba(255,0,85,0.4); }
        .entry-card.exito::before { background: #10b981; box-shadow: 0 0 8px rgba(16,185,129,0.4); }
        .entry-card.error-card::before { background: #7f1d1d; box-shadow: 0 0 8px rgba(127,29,29,0.4); }
        .entry-card.alerta::before { background: #f59e0b; box-shadow: 0 0 8px rgba(245,158,11,0.4); }
        .entry-card.logout-b::before { background: #64748b; }
        
        .sector-label {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255,255,255,0.4);
        }
        .sector-label::after {
          content: '';
          flex: 1;
          height: 1px;
          opacity: 0.12;
          background: currentColor;
        }
      `}</style>

      <div className="animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-[var(--text-main)]">Definición_Cromática</h2>
            <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mt-2">Protocolo Visual · Bitácora Forense</p>
          </div>
          <div className="flex items-center gap-4">
             <div className={`flex items-center gap-3 px-4 py-2 rounded-full border transition-all ${wsConnected ? 'bg-cyan-400/10 border-cyan-400/30 text-cyan-400' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                <Activity size={14} className={wsConnected ? 'animate-pulse' : ''} />
                <span className="text-[9px] font-black uppercase tracking-widest">{wsConnected ? 'Túnel_Sincronizado' : 'Túnel_Caído'}</span>
             </div>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="cyber-card p-6 mb-10 border-white/5 bg-white/[0.01]">
            <div className="relative">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-4 h-4" />
                <input 
                    type="text"
                    placeholder="Filtrar por acción, módulo o agente..."
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-[var(--text-main)] focus:border-[var(--accent)] outline-none transition-all font-medium uppercase placeholder:text-white/10"
                />
            </div>
        </div>

        <div className="space-y-8">
          <div className="sector-group">
            <div className="sector-label">Registro_Eventos_Recientes</div>
            
            <div className="space-y-3">
              {filteredLogs.map((log: LogEntry) => {
                const config = getLogConfig(log)
                return (
                  <div key={log.id} className={`entry-card hover:bg-white/[0.03] ${config.className}`}>
                    {/* COL 1: ICON BOX */}
                    <div 
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" 
                      style={{ backgroundColor: config.bg, color: config.color }}
                    >
                      {config.icon}
                    </div>

                    {/* COL 2: CONTENT */}
                    <div>
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-[12px] font-extrabold uppercase tracking-wide text-[var(--text-main)]">{log.accion}</span>
                        <span 
                          className="text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest"
                          style={{ backgroundColor: config.bg, color: config.color }}
                        >
                          {config.tag}
                        </span>
                      </div>
                      <div className="flex items-center gap-5 flex-wrap">
                        <span className="flex items-center gap-1.5 text-[9px] font-bold text-[var(--text-muted)] uppercase">
                          <User size={11} style={{ color: config.color }} /> Agente <span className="text-white/60 font-mono">{log.usuario_nombre || `Anon_#${log.usuario_id?.slice(-6).toUpperCase()}`}</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-[9px] font-bold text-[var(--text-muted)] uppercase">
                          <Globe size={11} /> IP <span className="text-white/60 font-mono">{log.ip || '0.0.0.0'}</span>
                        </span>
                      </div>
                    </div>

                    {/* COL 3: TIMESTAMP & STATUS */}
                    <div className="text-right flex flex-col items-end gap-1.5 min-w-[80px]">
                      <span className="text-[11px] font-bold text-white/50 font-mono tracking-tighter">
                        {new Date(log.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span 
                        className="text-[7.5px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest"
                        style={{ backgroundColor: config.bg, color: config.color }}
                      >
                        {log.estado}
                      </span>
                    </div>
                  </div>
                )
              })}

              {filteredLogs.length === 0 && (
                <div className="py-20 text-center cyber-card border-dashed border-white/5">
                  <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[0.5em] opacity-20">Sector de Memoria Vacío</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
