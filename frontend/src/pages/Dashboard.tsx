import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Card, CardHeader, CardBody } from '../components/ui'
import { Layout } from '../components/Layout'

export function Dashboard() {
  const { usuario } = useAuth()
  if (!usuario) return null
  if (usuario.rol === 'administrador') return <Navigate to="/admin" replace />

  const limites = { gratis: 10, starter: 50, pro: 500, elite: 9999 }
  const limite = limites[usuario.plan as keyof typeof limites] || limites.gratis
  const restantes = Math.max(0, limite - usuario.intentos_livianos)

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">
          Hola, {usuario.nombre_completo || usuario.nombre_usuario}
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader><h3 className="text-sm font-medium text-slate-600">Plan actual</h3></CardHeader>
            <CardBody><p className="text-2xl font-bold text-slate-900 capitalize">{usuario.plan}</p></CardBody>
          </Card>
          <Card>
            <CardHeader><h3 className="text-sm font-medium text-slate-600">Análisis Livianos</h3></CardHeader>
            <CardBody><p className="text-2xl font-bold text-slate-900">{usuario.intentos_livianos} / {limite}</p></CardBody>
          </Card>
          <Card>
            <CardHeader><h3 className="text-sm font-medium text-slate-600">Disponibles</h3></CardHeader>
            <CardBody><p className="text-2xl font-bold text-emerald-600">{restantes}</p></CardBody>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
