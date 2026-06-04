import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Button, Input, Card, CardBody, Alert } from '../components/ui'
import { DashboardLayout } from '../components/DashboardLayout'

export function Perfil() {
  const { usuario, actualizarPerfil } = useAuth()
  const [nombreCompleto, setNombreCompleto] = useState(usuario?.nombre_completo ?? '')
  const [pais, setPais] = useState(usuario?.pais ?? 'BO')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null)

  if (!usuario) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setCargando(true)
    const resultado = await actualizarPerfil({ nombre_completo: nombreCompleto, pais })
    setMensaje(resultado.exito
      ? { tipo: 'success', texto: 'Protocolo de perfil actualizado correctamente' }
      : { tipo: 'error', texto: resultado.error.mensaje }
    )
    setCargando(false)
  }

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-[var(--text-main)] mb-2 tracking-tighter uppercase leading-none italic">
            Configuración <br /> <span className="accent-text">de Identidad</span>
          </h1>
          <p className="text-[var(--text-muted)] text-[10px] font-black tracking-[0.3em] uppercase">Gestión de Credenciales Forenses</p>
        </div>

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[var(--accent)]"></div>
          
          <CardBody className="p-10">
            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="bg-[var(--bg)] border border-[var(--border-color)] p-6 rounded-3xl">
                <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-2">Identificador</span>
                <span className="text-[var(--text-main)] font-bold uppercase tracking-tight">@{usuario.nombre_usuario}</span>
              </div>
              <div className="bg-[var(--bg)] border border-[var(--border-color)] p-6 rounded-3xl">
                <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-2">Nivel_Acceso</span>
                <span className="accent-text font-black uppercase italic tracking-tighter">{usuario.plan || 'GRATIS'}</span>
              </div>
              <div className="col-span-2 bg-[var(--bg)] border border-[var(--border-color)] p-6 rounded-3xl">
                <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-2">Terminal_Email</span>
                <span className="text-[var(--text-main)] font-medium italic opacity-70">{usuario.correo}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {mensaje && (
                <Alert variant={mensaje.tipo === 'success' ? 'success' : 'error'} className={`rounded-2xl text-[10px] font-black uppercase tracking-widest py-4 ${mensaje.tipo === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-[var(--accent)]/10 border-[var(--accent)]/20 text-[var(--accent)]'}`}>
                  {mensaje.texto}
                </Alert>
              )}

              <div className="space-y-6">
                <Input 
                  label="Nombre Completo Operativo"
                  value={nombreCompleto} 
                  onChange={(e) => setNombreCompleto(e.target.value)} 
                  placeholder="Tu nombre completo"
                />

                <Input 
                  label="Jurisdicción (Código ISO Pais)"
                  value={pais} 
                  onChange={(e) => setPais(e.target.value.toUpperCase().slice(0, 2))}
                  maxLength={2} 
                  placeholder="BO"
                />
              </div>

              <Button 
                type="submit" 
                loading={cargando} 
                fullWidth 
                variant="primary"
                size="lg"
                className="mt-4"
              >
                SINCRONIZAR CAMBIOS
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  )
}
