import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useWebSocket } from '../hooks/useWebSocket'
import { api } from '../services/api'
import type { RespuestaApi } from '../types/auth'
import { Bell, X, Zap, CreditCard, AlertTriangle, UserPlus, Microscope, FileSearch } from 'lucide-react'

export interface NotificationItem {
  id: string
  titulo: string
  mensaje: string
  tipo: 'pago' | 'seguridad' | 'registro' | 'sistema' | 'analisis_pesado' | 'analisis_liviano'
  analisis_id?: string
  leido: boolean
  fecha: string
  _pref?: { 
    mostrar: boolean,
    notificar: boolean, 
    sonar: boolean 
  }
}

interface NotificationContextType {
  notifs: NotificationItem[]
  unreadCount: number
  marcarTodasLeidas: () => Promise<void>
  marcarUnaLeida: (id: string) => Promise<void>
  wsConnected: boolean
  logs: any[]
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [notifs, setNotifs] = useState<NotificationItem[]>([])
  const [toasts, setToasts] = useState<NotificationItem[]>([])
  const [logs, setLogs] = useState<any[]>([])

  const audioAlert = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3")

  // 1. WebSocket de Notificaciones
  const port = window.location.port || '80'
  const storedUserId = localStorage.getItem(`scammer-user-id-${port}`)
  
  const { isConnected: wsNotifConnected } = useWebSocket({
    url: (storedUserId && storedUserId !== 'undefined') 
      ? `/ws/notificaciones/?user_id=${storedUserId}` 
      : '' as any,
    onMessage: (data: any) => {
      if (data.type === 'connection_established' || !usuario) return
      
      const newNotif = data as NotificationItem
      if (newNotif._pref?.mostrar !== false) {
        setNotifs(prev => [newNotif, ...prev])
      }
      
      if (newNotif._pref?.notificar) {
        setToasts(prev => [...prev, newNotif])
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== newNotif.id))
        }, 8000)
      }

      if (newNotif._pref?.sonar) {
        audioAlert.currentTime = 0
        audioAlert.play().catch(() => {})
      }
    }
  })

  // 2. Túnel Admin
  const { isConnected: wsAdminConnected } = useWebSocket({
    url: usuario?.rol === 'administrador' ? '/ws/admin/bitacora/' : null as any,
    onMessage: (data: any) => {
      if (usuario?.rol !== 'administrador') return
      if (data.type === 'presence_update') {
          window.dispatchEvent(new CustomEvent('presence_change', { detail: data.data }));
          return
      }
      if (data.id || data.accion || data.modulo) {
          setLogs(prev => [data, ...prev].slice(0, 100))
      }
    }
  })

  useEffect(() => {
    if (!usuario) {
      setNotifs([])
      setLogs([])
      setToasts([])
      return
    }

    const cargarTodo = async () => {
        try {
            const resNotifs = await api.get<RespuestaApi<NotificationItem[]>>('/analisis/notificaciones/')
            if (resNotifs.data.datos) setNotifs(resNotifs.data.datos)

            if (usuario.rol === 'administrador') {
                const resLogs = await api.get<RespuestaApi<any[]>>('/analisis/admin/bitacora/')
                if (resLogs.data.datos) setLogs(resLogs.data.datos)
            }
        } catch (e) {
            console.error("[NOTIF] Fallo en carga inicial:", e)
        }
    }
    cargarTodo()
  }, [usuario?.id_supabase])

  const marcarTodasLeidas = async () => {
    try {
      await api.post('/analisis/notificaciones/')
      setNotifs(prev => prev.map(n => ({ ...n, leido: true })))
    } catch (e) { console.error(e) }
  }

  const marcarUnaLeida = async (id: string) => {
    try {
      await api.patch(`/analisis/notificaciones/${id}/leida/`)
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, leido: true } : n))
    } catch (e) { console.error(e) }
  }

  const handleToastClick = (toast: NotificationItem) => {
    if (toast.analisis_id) {
      sessionStorage.setItem('scammer-pending-analysis-id', toast.analisis_id)
      navigate('/historial')
    }
    setToasts(prev => prev.filter(t => t.id !== toast.id))
    marcarUnaLeida(toast.id)
  }

  const unreadCount = notifs.filter(n => !n.leido).length

  return (
    <NotificationContext.Provider value={{ 
        notifs, 
        unreadCount, 
        marcarTodasLeidas, 
        marcarUnaLeida, 
        wsConnected: wsNotifConnected,
        logs
    }}>
      {children}
      
      <div className="fixed top-24 right-10 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            onClick={() => handleToastClick(toast)}
            className="w-80 cyber-card p-4 rounded-2xl border border-[var(--accent)]/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-[var(--card-bg)] backdrop-blur-3xl animate-in slide-in-from-right-10 duration-300 pointer-events-auto flex items-start gap-4 cursor-pointer hover:border-[var(--accent)] transition-all group"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              toast.tipo === 'pago' ? 'bg-emerald-500/10 text-emerald-500' : 
              toast.tipo === 'seguridad' ? 'bg-red-500/10 text-red-500' : 
              toast.tipo === 'registro' ? 'bg-amber-500/10 text-amber-500' : 
              toast.tipo === 'analisis_pesado' ? 'bg-[var(--accent)]/10 text-[var(--accent)]' :
              'bg-cyan-400/10 text-cyan-400'
            }`}>
              {toast.tipo === 'pago' ? <CreditCard size={18}/> : 
               toast.tipo === 'seguridad' ? <AlertTriangle size={18}/> : 
               toast.tipo === 'registro' ? <UserPlus size={18}/> : 
               toast.tipo === 'analisis_pesado' ? <Microscope size={18} /> :
               <Zap size={18}/>}
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-main)] mb-1 truncate group-hover:text-[var(--accent)] transition-colors">{toast.titulo}</h5>
              <p className="text-[10px] text-[var(--text-muted)] leading-tight uppercase font-medium line-clamp-2">{toast.mensaje}</p>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setToasts(prev => prev.filter(t => t.id !== toast.id)); }}
              className="p-1 hover:bg-white/5 rounded-lg text-[var(--text-muted)] transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotifications debe usarse dentro de NotificationProvider')
  return context
}
