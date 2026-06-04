import { useState, useEffect } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ShieldCheck, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'

export function Registro() {
  const { registrar, iniciarSesionConGoogle, usuario, cargando: cargandoAuth } = useAuth()
  const navigate = useNavigate()
  const [datos, setDatos] = useState({
    correo: '',
    password: '',
    confirmarPassword: '',
    nombre_usuario: '',
    nombre_completo: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registroExitoso, setRegistroExitoso] = useState(false)

  // Si ya está logueado y no acaba de registrarse, lo mandamos al dashboard
  useEffect(() => {
      if (usuario && !registroExitoso) {
          navigate('/dashboard', { replace: true })
      }
  }, [usuario, registroExitoso, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cargando || registroExitoso) return // Evitar doble submit

    setError(null)
    
    if (datos.password !== datos.confirmarPassword) {
      setError('Los códigos secretos no coinciden.')
      return
    }

    setCargando(true)
    const res = await registrar({
      correo: datos.correo,
      password: datos.password,
      nombre_usuario: datos.nombre_usuario,
      nombre_completo: datos.nombre_completo,
    })
    
    if (res.exito) {
      // Pantalla de éxito visual
      setRegistroExitoso(true)
      setCargando(false)
      // Redirección automática tras 2.5 segundos
      setTimeout(() => {
          navigate('/dashboard')
      }, 2500)
    } else {
      // Mostrar error y permitir reintento
      setError(res.error.mensaje)
      setCargando(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      await iniciarSesionConGoogle()
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión con Google')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDatos({ ...datos, [e.target.name]: e.target.value })
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-8">
      <div className="max-w-2xl w-full cyber-card p-16 animate-in fade-in slide-in-from-bottom-8 duration-700 relative overflow-hidden">
        
        {/* Pantalla de Éxito Superpuesta */}
        {registroExitoso && (
            <div className="absolute inset-0 bg-[var(--card-bg)] z-50 flex flex-col items-center justify-center animate-in fade-in duration-500 backdrop-blur-xl">
                <div className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(16,185,129,0.3)] animate-bounce">
                    <CheckCircle2 size={48} />
                </div>
                <h2 className="text-4xl font-black italic uppercase text-[var(--text-main)] tracking-tighter mb-4">Acceso Concedido</h2>
                <p className="text-[10px] font-black tracking-[0.4em] uppercase text-emerald-500 animate-pulse">Generando credenciales de agente...</p>
                <div className="w-48 h-1 bg-white/10 rounded-full mt-8 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-full origin-left animate-[scale-x_2.5s_ease-out]"></div>
                </div>
            </div>
        )}

        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-[#ff0055] rounded-2xl shadow-[0_0_20px_rgba(255,0,85,0.4)] flex items-center justify-center mb-6">
            <ShieldCheck className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Nueva Reclutación</h1>
          <p className="text-[10px] font-black text-white/30 tracking-[0.4em] uppercase mt-2">Protocolo de Alta Forense</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/40 block uppercase tracking-widest">Nombre Completo</label>
              <input 
                name="nombre_completo"
                value={datos.nombre_completo}
                onChange={handleChange}
                placeholder="Juan Pérez" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#ff0055] input-glow transition-all"
                disabled={cargando}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/40 block uppercase tracking-widest">Usuario</label>
              <input 
                name="nombre_usuario"
                value={datos.nombre_usuario}
                onChange={handleChange}
                required
                placeholder="agente_007" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#ff0055] input-glow transition-all"
                disabled={cargando}
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-white/40 block uppercase tracking-widest">Correo de Recuperación</label>
            <input 
              name="correo"
              type="email"
              value={datos.correo}
              onChange={handleChange}
              required
              placeholder="agente@scammer.ai" 
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#ff0055] input-glow transition-all"
              disabled={cargando}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/40 block uppercase tracking-widest">Código Secreto</label>
              <div className="relative">
                <input 
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={datos.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#ff0055] input-glow transition-all pr-12"
                  disabled={cargando}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors cursor-pointer"
                  disabled={cargando}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/40 block uppercase tracking-widest">Confirmar Código</label>
              <div className="relative">
                <input 
                  name="confirmarPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={datos.confirmarPassword}
                  onChange={handleChange}
                  required
                  placeholder="••••••••" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#ff0055] input-glow transition-all pr-12"
                  disabled={cargando}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors cursor-pointer"
                  disabled={cargando}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-bold uppercase tracking-widest text-center animate-in shake">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={cargando || cargandoAuth || registroExitoso}
            className="w-full py-6 bg-[#ff0055] text-white rounded-2xl text-xs font-black tracking-[0.3em] uppercase hover:shadow-[0_0_30px_rgba(255,0,85,0.4)] transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer"
          >
            {cargando ? <><Loader2 size={16} className="animate-spin" /> Procesando Protocolo...</> : 'Crear Cuenta Forense'}
          </button>
        </form>

        <div className="relative flex items-center justify-center py-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
          <span className="relative bg-[#08080a] px-6 text-[9px] font-black text-white/20 uppercase tracking-widest">Otras Vías</span>
        </div>

        <button 
          onClick={handleGoogleLogin}
          type="button"
          disabled={cargando}
          className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black tracking-widest uppercase flex items-center justify-center gap-4 hover:bg-white/10 transition-all text-white cursor-pointer disabled:opacity-50"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5 grayscale" alt="Google" /> Continuar con Google
        </button>

        <div className="text-center pt-10">
          <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">
            ¿Ya tienes autorización? <Link to="/login" className="text-[#ff0055] hover:underline ml-2 cursor-pointer">Identificarse</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
