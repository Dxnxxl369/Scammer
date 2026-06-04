import { useState } from 'react'
import { Button, Input, Card, CardHeader, CardBody, CardFooter, Alert, Spinner, Label } from '../components/ui'

export function DesignSystem() {
  const [inputVal, setInputVal] = useState('')

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6 space-y-12">
      <h1 className="text-3xl font-bold text-slate-900">Design System</h1>

      {/* Buttons */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-800">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
        <Button fullWidth>Full Width</Button>
      </section>

      {/* Inputs */}
      <section className="space-y-4 max-w-md">
        <h2 className="text-xl font-semibold text-slate-800">Inputs</h2>
        <Input label="Normal" placeholder="Escribe algo..." value={inputVal} onChange={e => setInputVal(e.target.value)} />
        <Input label="Con error" error="Este campo es requerido" placeholder="Con error" />
        <Input label="Con helper" helperText="Texto de ayuda" placeholder="Con helper" />
        <Input label="Requerido" required placeholder="Requerido" />
      </section>

      {/* Cards */}
      <section className="space-y-4 max-w-sm">
        <h2 className="text-xl font-semibold text-slate-800">Cards</h2>
        <Card>
          <CardHeader><h3 className="font-semibold text-slate-900">Card Header</h3></CardHeader>
          <CardBody><p className="text-slate-600">Card body content goes here.</p></CardBody>
          <CardFooter><p className="text-sm text-slate-500">Card footer</p></CardFooter>
        </Card>
      </section>

      {/* Alerts */}
      <section className="space-y-3 max-w-lg">
        <h2 className="text-xl font-semibold text-slate-800">Alerts</h2>
        <Alert variant="info" title="Información">Mensaje informativo.</Alert>
        <Alert variant="success" title="Éxito">Operación completada.</Alert>
        <Alert variant="warning" title="Advertencia">Ten cuidado con esto.</Alert>
        <Alert variant="error" title="Error">Algo salió mal.</Alert>
        <Alert variant="info" onClose={() => {}}>Con botón cerrar.</Alert>
      </section>

      {/* Spinners */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-800">Spinners</h2>
        <div className="flex items-center gap-6">
          <Spinner size="sm" className="text-indigo-600" />
          <Spinner size="md" className="text-indigo-600" />
          <Spinner size="lg" className="text-indigo-600" />
        </div>
      </section>

      {/* Labels */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-800">Labels</h2>
        <Label>Label normal</Label>
        <Label required>Label requerido</Label>
      </section>
    </div>
  )
}
