import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../contexts/ThemeContext'
import { ShieldCheck, Sun, Moon } from 'lucide-react'

const RUTAS_SIN_NAV = ['/login', '/registro']

export function Layout({ children }: { children: ReactNode }) {
  const { usuario, cerrarSesion } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { pathname } = useLocation()
  const ocultarNav = RUTAS_SIN_NAV.includes(pathname)

  if (ocultarNav) return <>{children}</>

  return (
    <div className={`min-h-screen gradient-bg ${theme === 'dark' ? 'dark-mode-gradient' : 'light-mode-gradient'} text-[var(--text-main)] flex flex-col font-['Space_Grotesk',sans-serif] transition-all duration-500`}>
      <header className="bg-[var(--sidebar-bg)] backdrop-blur-md border-b border-white/5 sticky top-0 z-50 transition-all duration-500">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff0055] rounded-xl shadow-[0_0_20px_rgba(255,0,85,0.4)] flex items-center justify-center">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter uppercase leading-none text-[var(--text-main)]">SCAMMER</span>
              <span className="text-[9px] font-bold text-[var(--text-muted)] tracking-[0.4em] uppercase">Security Engine</span>
            </div>
          </Link>
          <nav className="flex items-center gap-10">
            <button 
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              className="p-2 rounded-xl hover:bg-white/5 transition-all text-[var(--text-muted)] hover:text-[var(--text-main)]"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <Link to="/planes" className="text-[11px] font-black tracking-[0.2em] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all uppercase">Planes</Link>
            {usuario ? (
              <>
                <Link to="/dashboard" className="text-[11px] font-black tracking-[0.2em] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all uppercase">Terminal</Link>
                <div className="h-4 w-px bg-white/10"></div>
                <div className="flex items-center gap-4">
                  <span className="text-[11px] font-black text-[#ff0055] uppercase tracking-widest italic">{usuario.nombre_usuario}</span>
                  <button onClick={cerrarSesion} className="text-[11px] font-black text-[var(--text-muted)] hover:text-red-500 transition-all uppercase tracking-widest underline decoration-[#ff0055]/30 underline-offset-4">Cerrar Sesión</button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-6">
                <Link to="/login" className="text-[11px] font-black tracking-[0.2em] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all uppercase">Identificarse</Link>
                <Link to="/registro" className="bg-white text-black text-[10px] font-black px-8 py-3 rounded-full tracking-[0.2em] hover:bg-[#ff0055] hover:text-white transition-all transform active:scale-95 uppercase">Obtener Credenciales</Link>
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-white/5 py-12 bg-black/40">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col gap-2">
            <div className="text-xl font-black text-white tracking-tighter italic">SCAMMER.AI</div>
            <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">© 2026 Advanced Synthetic Detection Infrastructure</p>
          </div>
          <div className="flex gap-10">
            <a href="#" className="text-[10px] font-black text-white/30 hover:text-[#ff0055] uppercase tracking-[0.2em] transition-all">Protocolos</a>
            <a href="#" className="text-[10px] font-black text-white/30 hover:text-[#ff0055] uppercase tracking-[0.2em] transition-all">Privacidad</a>
            <a href="#" className="text-[10px] font-black text-white/30 hover:text-[#ff0055] uppercase tracking-[0.2em] transition-all">API_Docs</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
