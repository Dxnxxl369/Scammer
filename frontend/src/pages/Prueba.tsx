import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useAnonimo } from '../hooks/useAnonimo'
import { Layout } from '../components/Layout'
import { Card, CardHeader, CardBody, Button, Alert } from '../components/ui'
import { LimiteAlcanzado } from '../components/LimiteAlcanzado'

export function Prueba() {
  const { usuario } = useAuth()
  const { anonimo, intentosRestantes, limiteAlcanzado, incrementarIntento } = useAnonimo()
  const [resultado, setResultado] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const ejecutarPrueba = async () => {
    setCargando(true)
    setResultado(null)

    if (!usuario && anonimo) {
      const r = await incrementarIntento()
      if (!r.ok) {
        setResultado('Límite alcanzado')
        setCargando(false)
        return
      }
    }

    await new Promise((r) => setTimeout(r, 1500))
    setResultado('✅ Análisis completado')
    setCargando(false)
  }

  if (!usuario && limiteAlcanzado) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12 px-4">
          <LimiteAlcanzado />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold text-slate-900">Prueba de análisis</h1>
            {!usuario && (
              <p className="text-sm text-slate-600 mt-1">
                Tienes {intentosRestantes} intentos restantes
              </p>
            )}
          </CardHeader>
          <CardBody className="space-y-4">
            {resultado && <Alert variant="success">{resultado}</Alert>}

            <Button onClick={ejecutarPrueba} loading={cargando} fullWidth>
              Ejecutar análisis de prueba
            </Button>
          </CardBody>
        </Card>
      </div>
    </Layout>
  )
}
