import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ShieldCheck, Eye, EyeOff } from 'lucide-react'

export function Login() {
  const { iniciarSesion, iniciarSesionConGoogle, usuario, cargando: cargandoAuth } = useAuth()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (usuario) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setError(null)
    const res = await iniciarSesion({ correo, password })
    if (!res.exito) setError(res.error.mensaje)
    setCargando(false)
  }

  const handleGoogleLogin = async () => {
    try {
      await iniciarSesionConGoogle()
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión con Google')
    }
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-8">
      <div className="max-w-xl w-full cyber-card p-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex flex-col items-center mb-12">
          <div className="w-16 h-16 bg-[#ff0055] rounded-2xl shadow-[0_0_20px_rgba(255,0,85,0.4)] flex items-center justify-center mb-6">
            <ShieldCheck className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">Terminal de Acceso</h1>
          <p className="text-[10px] font-black text-white/30 tracking-[0.4em] uppercase mt-2">Seguridad de Nivel Forense</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-white/40 block uppercase tracking-widest">Identidad (Correo)</label>
            <input 
              type="email" 
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              placeholder="agente@scammer.ai" 
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-lg outline-none focus:border-[#ff0055] input-glow transition-all text-white"
            />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-white/40 block uppercase tracking-widest">Código de Acceso</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-lg outline-none focus:border-[#ff0055] input-glow transition-all text-white pr-14"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-bold uppercase tracking-widest text-center animate-shake">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={cargando || cargandoAuth}
            className="w-full py-6 bg-white text-black rounded-2xl text-xs font-black tracking-[0.3em] uppercase hover:bg-[#ff0055] hover:text-white transition-all shadow-xl active:scale-95 disabled:opacity-20"
          >
            {cargando ? 'Validando...' : 'Autenticar Agente'}
          </button>
        </form>

        <div className="relative flex items-center justify-center py-10">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
          <span className="relative bg-[#08080a] px-6 text-[9px] font-black text-white/20 uppercase tracking-widest">Otras Vías</span>
        </div>

        <div className="space-y-4">
          <button 
            onClick={handleGoogleLogin}
            type="button"
            className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black tracking-widest uppercase flex items-center justify-center gap-4 hover:bg-white/10 transition-all text-white"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5 grayscale" alt="Google" /> Continuar con Google
          </button>
          
          <div className="text-center pt-8">
            <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">
              ¿Sin autorización? <Link to="/registro" className="text-[#ff0055] hover:underline ml-2">Obtener Credenciales</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
