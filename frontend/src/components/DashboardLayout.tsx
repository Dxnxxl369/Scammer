import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useState, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNotifications } from '../contexts/NotificationContext'
import { useTheme } from '../contexts/ThemeContext'
import { 
  Search, 
  History, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  Activity, 
  Users, 
  ScrollText, 
  BarChart, 
  LayoutDashboard,
  ShieldAlert,
  Sun,
  Moon,
  Bell,
  Zap,
  Inbox,
  AlertTriangle,
  CreditCard,
  UserPlus
} from 'lucide-react'

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { usuario, cerrarSesion } = useAuth()
  const { notifs, unreadCount, marcarTodasLeidas, marcarUnaLeida, wsConnected } = useNotifications()
  const { theme, toggleTheme } = useTheme()
  const { pathname } = useLocation()
  
  const [showNotifs, setShowNotifs] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pago' | 'seguridad' | 'registro'>('all')
  
  const filteredNotifs = notifs.filter(n => filter === 'all' || n.tipo === filter)

  const getNavItems = () => {
    if (usuario?.rol === 'administrador') {
      return [
        { label: 'Panel Control', icon: <LayoutDashboard size={20} />, path: '/admin' },
        { label: 'Directorio', icon: <Users size={20} />, path: '/admin/usuarios' },
        { label: 'Bitácora', icon: <ScrollText size={20} />, path: '/admin/bitacora' },
        { label: 'Finanzas', icon: <BarChart size={20} />, path: '/admin/reportes' },
        { label: 'Planes', icon: <Activity size={20} />, path: '/admin/planes' },
      ]
    }
    if (usuario) {
      return [
        { label: 'Analizador', icon: <Search size={20} />, path: '/dashboard' },
        { label: 'Historial', icon: <History size={20} />, path: '/historial' },
        { label: 'Planes', icon: <Activity size={20} />, path: '/planes' },
      ]
    }
    return [
      { label: 'Analizador', icon: <Search size={20} />, path: '/dashboard' },
      { label: 'Suscripciones', icon: <Activity size={20} />, path: '/planes' },
    ]
  }

  return (
    <div className={`min-h-screen gradient-bg ${theme === 'dark' ? 'dark-mode-gradient' : 'light-mode-gradient'} text-[var(--text-main)] flex overflow-hidden transition-all duration-500`}>
      <aside className="w-[100px] bg-[var(--sidebar-bg)] backdrop-blur-3xl border-r border-white/5 flex flex-col items-center py-12 gap-10 relative z-20 transition-all duration-500">
        <Link to="/" className={`w-12 h-12 rounded-2xl shadow-[0_0_20px_rgba(255,0,85,0.4)] flex items-center justify-center text-white font-black text-xl mb-4 transform hover:scale-110 transition-all ${usuario?.rol === 'administrador' ? 'bg-cyan-500 shadow-cyan-500/40' : 'bg-[#ff0055]'}`}>
          S
        </Link>
        <nav className="flex-1 flex flex-col gap-6">
          {getNavItems().map((item) => (
            <Link key={item.path} to={item.path} title={item.label} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group ${pathname === item.path ? 'bg-[var(--text-main)] text-[var(--bg)] shadow-[0_0_30px_rgba(255,255,255,0.1)] scale-110' : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-main)]'}`}>
              {item.icon}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-6 mt-auto border-t border-white/5 pt-10">
          <button onClick={toggleTheme} className="w-12 h-12 rounded-2xl border border-white/5 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all hover:bg-white/5 cursor-pointer">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {usuario && (
            <Link 
              to={usuario.rol === 'administrador' ? '/admin/notificaciones' : '/perfil'} 
              className={`w-12 h-12 rounded-2xl border border-white/5 flex items-center justify-center transition-all cursor-pointer ${pathname === '/perfil' || pathname === '/admin/notificaciones' ? 'bg-[#ff0055] text-white shadow-[0_0_15px_rgba(255,0,85,0.3)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
            >
              <Settings size={20} />
            </Link>
          )}
          {usuario ? <button onClick={cerrarSesion} className="w-12 h-12 rounded-2xl border border-white/5 flex items-center justify-center text-red-500/30 hover:text-red-500 transition-all hover:bg-red-500/10 cursor-pointer"><LogOut size={20} /></button> : <Link to="/login" className="w-12 h-12 rounded-2xl border border-[#ff0055]/30 flex items-center justify-center text-[#ff0055] hover:bg-[#ff0055] hover:text-white transition-all"><ShieldAlert size={20} /></Link>}
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative z-10 custom-scrollbar">
        <header className="h-24 border-b border-white/5 px-12 flex items-center justify-between sticky top-0 bg-[var(--sidebar-bg)] backdrop-blur-xl z-[90] transition-all duration-500">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-full ${usuario?.rol === 'administrador' ? 'border-cyan-500/20' : ''}`}>
              <ShieldCheck size={16} className={usuario?.rol === 'administrador' ? 'text-cyan-400' : 'text-[#ff0055]'} />
              <span className={`text-[10px] font-black italic uppercase tracking-widest ${usuario?.rol === 'administrador' ? 'text-cyan-400' : 'text-[var(--text-main)]'}`}>
                {usuario?.rol === 'administrador' ? 'ADMIN_ROOT' : (usuario?.plan || 'VISITANTE_TEMPORAL')}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            {usuario && (
              <div className="relative">
                {/* Capa de cierre inteligente (tras el panel) */}
                {showNotifs && (
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setShowNotifs(false)}
                  ></div>
                )}

                <button 
                  onClick={() => setShowNotifs(!showNotifs)}
                  className={`relative p-3 rounded-xl transition-all cursor-pointer z-50 ${showNotifs ? 'bg-[var(--accent)] text-white shadow-[0_0_20px_var(--accent-glow)]' : 'hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ff0055] text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-[var(--bg)] animate-bounce shadow-[0_0_100px_var(--accent-glow)]">
                      {unreadCount}
                    </span>
                  )}
                  {wsConnected && (
                    <div className="absolute bottom-0 right-0 w-2 h-2 bg-cyan-400 rounded-full border border-[var(--bg)] shadow-[0_0_5px_cyan]"></div>
                  )}
                </button>

                {showNotifs && (
                  <div className="absolute top-16 right-0 w-[420px] bg-[var(--card-bg)] backdrop-blur-3xl border border-[var(--border-color)] rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                    <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-white/[0.02]">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)] flex items-center gap-2">
                        <Inbox size={14} className="text-cyan-400" /> Comunicaciones
                      </h4>
                      <div className="flex gap-2">
                        {usuario.rol === 'administrador' && (
                           <Link to="/admin/notificaciones" onClick={() => setShowNotifs(false)} className="p-2 hover:bg-white/5 rounded-lg text-[var(--text-muted)] hover:text-white transition-all cursor-pointer z-50 relative">
                             <Settings size={14}/>
                           </Link>
                        )}
                        <button onClick={marcarTodasLeidas} className="text-[8px] font-black text-cyan-400 uppercase tracking-widest hover:text-white px-3 py-1.5 rounded-md bg-cyan-400/10 cursor-pointer transition-all z-50 relative">Marcar Leídas</button>
                      </div>
                    </div>

                    <div className="px-6 py-3 border-b border-[var(--border-color)] flex gap-6 text-[9px] font-black uppercase tracking-widest bg-black/10 relative z-40">
                        <button onClick={() => setFilter('all')} className={`transition-all cursor-pointer hover:text-[var(--accent)] relative z-50 ${filter === 'all' ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] pb-1' : 'text-[var(--text-muted)]'}`}>Todas</button>
                        <button onClick={() => setFilter('pago')} className={`transition-all cursor-pointer hover:text-emerald-500 relative z-50 ${filter === 'pago' ? 'text-emerald-500 border-b-2 border-emerald-500 pb-1' : 'text-[var(--text-muted)]'}`}>Pagos</button>
                        <button onClick={() => setFilter('registro')} className={`transition-all cursor-pointer hover:text-amber-500 relative z-50 ${filter === 'registro' ? 'text-amber-500 border-b-2 border-amber-500 pb-1' : 'text-[var(--text-muted)]'}`}>Registros</button>
                        <button onClick={() => setFilter('seguridad')} className={`transition-all cursor-pointer hover:text-[#ff0055] relative z-50 ${filter === 'seguridad' ? 'text-[#ff0055] border-b-2 border-[#ff0055] pb-1' : 'text-[var(--text-muted)]'}`}>Alertas</button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2 bg-black/5 relative z-40">
                      {filteredNotifs.length === 0 ? (
                        <div className="py-14 text-center opacity-20 text-[10px] font-black uppercase tracking-[0.3em]">Sector sin mensajes</div>
                      ) : (
                        filteredNotifs.map(n => (
                          <div 
                            key={n.id} 
                            onClick={() => marcarUnaLeida(n.id)}
                            className={`p-4 rounded-xl mb-1 cursor-pointer transition-all border-l-2 flex gap-4 relative z-50 ${n.leido ? 'opacity-30 grayscale-[0.5]' : 'bg-white/[0.04] border-l-[var(--accent)] hover:bg-white/[0.08]'}`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.tipo === 'pago' ? 'bg-emerald-500/10 text-emerald-500' : n.tipo === 'seguridad' ? 'bg-red-500/10 text-red-500' : n.tipo === 'registro' ? 'bg-amber-500/10 text-amber-500' : 'bg-cyan-400/10 text-cyan-400'}`}>
                                {n.tipo === 'pago' ? <CreditCard size={14}/> : n.tipo === 'seguridad' ? <AlertTriangle size={14}/> : n.tipo === 'registro' ? <UserPlus size={14}/> : <Zap size={14}/>}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                   <p className={`text-[10px] font-black uppercase tracking-tight ${n.leido ? 'text-[var(--text-muted)]' : 'text-[var(--text-main)]'}`}>{n.titulo}</p>
                                   <span className="text-[8px] opacity-30 font-bold">{new Date(n.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                <p className={`text-[10px] font-medium leading-tight line-clamp-2 uppercase ${n.leido ? 'text-[var(--text-muted)]/50' : 'text-[var(--text-muted)]'}`}>{n.mensaje}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-[var(--text-main)] tracking-tight uppercase leading-none mb-1">{usuario ? usuario.nombre_usuario : 'Invitado_Sujeto'}</p>
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest italic">{usuario ? usuario.correo : 'Sesión_No_Enlazada'}</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${usuario ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/20 animate-pulse'}`}></div>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-xl text-[var(--text-main)] shadow-2xl relative overflow-hidden group">
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${usuario?.rol === 'administrador' ? 'bg-gradient-to-br from-cyan-500/20 to-transparent' : 'bg-gradient-to-br from-[#ff0055]/20 to-transparent'}`}></div>
                <span className="relative">{usuario ? usuario.nombre_usuario?.[0].toUpperCase() : '?'}</span>
              </div>
            </div>
          </div>
        </header>
        <div className="p-12 max-w-[1400px] mx-auto w-full">{children}</div>
      </main>
    </div>
  )
}
