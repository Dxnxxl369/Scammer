import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Spinner } from '../components/ui'

export function AdminRoute({ children }: { children: ReactNode }) {
  const { usuario, cargando, inicializado } = useAuth()
  
  // Soporte para Identidad Simple en el F5
  const port = window.location.port || '80'
  const hasPersistentSession = !!localStorage.getItem(`scammer-user-id-${port}`)

  if (cargando || !inicializado) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#08080a]">
        <Spinner size="lg" className="text-cyan-400 mb-4" />
        <p className="text-[8px] font-black uppercase tracking-[0.5em] text-cyan-400 animate-pulse">Verificando Nivel Root...</p>
      </div>
    )
  }

  if (!usuario && !hasPersistentSession) {
    return <Navigate to="/login" replace />
  }

  if (usuario && usuario.rol !== 'administrador') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
