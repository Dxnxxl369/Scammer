import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardBody, CardFooter } from '../Card'

describe('Card', () => {
  it('renderiza children', () => {
    render(<Card>Contenido</Card>)
    expect(screen.getByText('Contenido')).toBeDefined()
  })

  it('renderiza CardHeader', () => {
    render(<CardHeader>Encabezado</CardHeader>)
    expect(screen.getByText('Encabezado')).toBeDefined()
  })

  it('renderiza CardBody', () => {
    render(<CardBody>Cuerpo</CardBody>)
    expect(screen.getByText('Cuerpo')).toBeDefined()
  })

  it('renderiza CardFooter', () => {
    render(<CardFooter>Pie</CardFooter>)
    expect(screen.getByText('Pie')).toBeDefined()
  })

  it('renderiza todos los subcomponentes juntos', () => {
    render(
      <Card>
        <CardHeader>Header</CardHeader>
        <CardBody>Body</CardBody>
        <CardFooter>Footer</CardFooter>
      </Card>
    )
    expect(screen.getByText('Header')).toBeDefined()
    expect(screen.getByText('Body')).toBeDefined()
    expect(screen.getByText('Footer')).toBeDefined()
  })
})
