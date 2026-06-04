import { Link } from 'react-router-dom'
import { Card, CardBody, Button, Alert } from './ui'

export function LimiteAlcanzado() {
  return (
    <Card className="max-w-md mx-auto">
      <CardBody className="text-center space-y-4">
        <Alert variant="warning" title="Has alcanzado tu límite">
          Como visitante puedes hacer hasta 3 análisis por día.
        </Alert>

        <p className="text-slate-600">
          Regístrate gratis para obtener <strong>10 análisis diarios</strong>,
          o actualiza a Pro para tener <strong>500 análisis</strong>.
        </p>

        <div className="flex gap-3 justify-center">
          <Link to="/registro">
            <Button>Crear cuenta gratis</Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary">Iniciar sesión</Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  )
}
