import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Spinner } from '../components/ui'

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { usuario, inicializado } = useAuth()

  if (!inicializado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08080a]">
        <Spinner size="lg" className="text-[#ff0055]" />
      </div>
    )
  }

  if (usuario) {
    // Si ya hay usuario, no puede estar en login/registro
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

