import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { authService } from '../services/authService'
import { Button, Input, Card, CardHeader, CardBody, Alert } from '../components/ui'
import { Layout } from '../components/Layout'
import { Shield } from 'lucide-react'
export function RecuperarPassword() {
  const [correo, setCorreo] = useState('')
  const [cargando, setCargando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setError(null)
    const resultado = await authService.recuperarPassword(correo)
    if (resultado.exito) setEnviado(true)
    else setError(resultado.error.mensaje)
    setCargando(false)
  }

  return (
    <Layout>
      <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12 relative overflow-hidden font-['Sora',sans-serif]">
        {/* Background Globs */}
        <div className="fixed top-[-200px] right-[-200px] w-[600px] h-[600px] bg-[#ff0055]/10 blur-[150px] rounded-full pointer-events-none z-0"></div>
        <div className="fixed bottom-[-300px] left-[-300px] w-[800px] h-[800px] bg-cyan-500/5 blur-[150px] rounded-full pointer-events-none z-0"></div>

        <Card className="w-full max-w-md relative z-10 overflow-hidden border-white/10 bg-white/[0.03] backdrop-blur-3xl rounded-[40px]">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-[#ff0055]"></div>
          
          <CardHeader className="text-center pt-12 pb-2">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
              Recuperar <br /> <span className="text-[#ff0055]">Acceso</span>
            </h1>
            <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.4em] mt-4">Restablecer credenciales de sistema</p>
          </CardHeader>
          
          <CardBody className="pt-10 px-10 pb-12">
            {enviado ? (
              <div className="space-y-8">
                <Alert variant="success" className="bg-emerald-500/10 border-emerald-500/20 text-emerald-500 rounded-2xl text-[10px] font-black uppercase tracking-widest py-6 flex flex-col items-center gap-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
                    <Shield size={24} />
                  </div>
                  Transmisión exitosa. Revisa tu terminal (email) para continuar con el protocolo.
                </Alert>
                <Link to="/login" className="block">
                  <Button fullWidth className="bg-white/5 text-white border-white/10 hover:bg-white/10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] transition-all">
                    Volver al login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                  <Alert variant="error" className="bg-[#ff0055]/10 border-[#ff0055]/20 text-[#ff0055] rounded-2xl text-[10px] font-black uppercase tracking-widest py-4">
                    {error}
                  </Alert>
                )}
                
                <Input 
                  label="Enlace de Recuperación (Email)" 
                  type="email" 
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)} 
                  required 
                  placeholder="usuario@scammer.ai" 
                  className="bg-white/5 border-white/10 rounded-2xl py-4 focus:border-[#ff0055] focus:ring-[#ff0055]/20"
                />

                <Button 
                  type="submit" 
                  loading={cargando} 
                  fullWidth 
                  className="bg-[#ff0055] text-white font-black py-5 rounded-2xl hover:shadow-[0_0_30px_rgba(255,0,85,0.4)] transition-all border-none uppercase text-[10px] tracking-[0.3em]"
                >
                  SOLICITAR RESTABLECIMIENTO
                </Button>

                <div className="text-center">
                  <Link to="/login" className="text-[9px] font-black text-white/30 hover:text-white transition-colors uppercase tracking-[0.3em] underline underline-offset-8 decoration-white/5">
                    Cancelar y volver
                  </Link>
                </div>
              </form>
            )}
          </CardBody>
        </Card>
      </div>
    </Layout>
  )
}
