import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Card, CardHeader, CardBody } from '../components/ui'
import { Layout } from '../components/Layout'

export function Dashboard() {
  const { usuario } = useAuth()
  if (!usuario) return null
  if (usuario.rol === 'administrador') return <Navigate to="/admin" replace />

  // Límites reales del backend; si no llegaron, fallback por plan.
  const fallback = {
    gratis: { livianos: 10, pesados: 3 },
    starter: { livianos: 50, pesados: 15 },
    pro: { livianos: 999999, pesados: 50 },
    elite: { livianos: 999999, pesados: 999999 },
  }
  const lim = usuario.limites || fallback[usuario.plan as keyof typeof fallback] || fallback.gratis
  const rest = usuario.restantes || {
    livianos: Math.max(0, lim.livianos - usuario.intentos_livianos),
    pesados: Math.max(0, lim.pesados - usuario.intentos_pesados),
  }
  const fmt = (n: number) => (n >= 999999 ? '∞' : String(n))

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-3xl font-bold text-slate-900">
            Hola, {usuario.nombre_completo || usuario.nombre_usuario}
          </h1>
          <Link
            to="/planes"
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700"
          >
            Mejorar mi plan
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader><h3 className="text-sm font-medium text-slate-600">Plan actual</h3></CardHeader>
            <CardBody><p className="text-2xl font-bold text-slate-900 capitalize">{usuario.plan}</p></CardBody>
          </Card>
          <Card>
            <CardHeader><h3 className="text-sm font-medium text-slate-600">Análisis Livianos restantes</h3></CardHeader>
            <CardBody>
              <p className="text-2xl font-bold text-emerald-600">{fmt(rest.livianos)}</p>
              <p className="text-xs text-slate-500 mt-1">de {fmt(lim.livianos)} este período</p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader><h3 className="text-sm font-medium text-slate-600">Análisis Pesados restantes</h3></CardHeader>
            <CardBody>
              <p className="text-2xl font-bold text-emerald-600">{fmt(rest.pesados)}</p>
              <p className="text-xs text-slate-500 mt-1">de {fmt(lim.pesados)} este período</p>
            </CardBody>
          </Card>
        </div>

        <p className="text-xs text-slate-400">
          Los análisis de llamada, audio, imagen y video cuentan como “pesados”.
        </p>
      </div>
    </Layout>
  )
}
