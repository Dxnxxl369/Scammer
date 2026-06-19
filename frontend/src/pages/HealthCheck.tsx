import { useEffect, useState } from 'react'
import { anonimoService } from '../services/anonimoService'

type ServiceStatus = 'ok' | 'error' | 'loading'

interface HealthData {
  backend: string
  mongodb: string
  supabase: string
}

function StatusBadge({ status, label }: { status: ServiceStatus; label: string }) {
  const isOk = status === 'ok'
  const isLoading = status === 'loading'

  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900 border border-gray-800">
      <span className="text-gray-300 font-medium capitalize">{label}</span>
      <span
        className={`flex items-center gap-2 text-sm font-semibold px-3 py-1 rounded-full ${
          isLoading
            ? 'bg-gray-700 text-gray-400'
            : isOk
            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
            : 'bg-red-500/10 text-red-400 border border-red-500/30'
        }`}
      >
        {isLoading ? (
          <span className="size-2 rounded-full bg-gray-400 animate-pulse" />
        ) : isOk ? (
          '✅'
        ) : (
          '❌'
        )}
        {isLoading ? 'verificando...' : status}
      </span>
    </div>
  )
}

export default function HealthCheck() {
  const [data, setData] = useState<HealthData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const idSesionAnonimo = anonimoService.obtenerDeCookie()

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8002/api'
    fetch(`${apiUrl}/health/`)
      .then((res) => res.json())
      .then((json: HealthData) => setData(json))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const getStatus = (value?: string): ServiceStatus => {
    if (loading) return 'loading'
    if (!value) return 'error'
    return value === 'ok' ? 'ok' : 'error'
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-white">Estado del sistema</h1>
          <p className="text-gray-500 text-sm">Verificando conexión con los servicios</p>
        </div>

        <div className="space-y-3">
          <StatusBadge label="backend" status={getStatus(data?.backend)} />
          <StatusBadge label="mongodb" status={getStatus(data?.mongodb)} />
          <StatusBadge label="supabase" status={getStatus(data?.supabase)} />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
            No se pudo conectar al backend: {error}
          </div>
        )}

        {!loading && data && (
          <p className="text-center text-gray-600 text-xs">
            Última verificación: {new Date().toLocaleTimeString()}
          </p>
        )}

        {idSesionAnonimo && (
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 text-center">
            <p className="text-gray-500 text-xs">Sesión anónima</p>
            <p className="text-gray-400 text-xs font-mono break-all">{idSesionAnonimo}</p>
          </div>
        )}
      </div>
    </div>
  )
}
