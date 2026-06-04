import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Alert } from '../Alert'

describe('Alert', () => {
  it('renderiza con título y contenido', () => {
    render(<Alert title="Título">Contenido del alert</Alert>)
    expect(screen.getByText('Título')).toBeDefined()
    expect(screen.getByText('Contenido del alert')).toBeDefined()
  })

  it('renderiza variante info', () => {
    render(<Alert variant="info">Info</Alert>)
    expect(screen.getByRole('alert').className).toContain('bg-blue-50')
  })

  it('renderiza variante success', () => {
    render(<Alert variant="success">OK</Alert>)
    expect(screen.getByRole('alert').className).toContain('bg-emerald-50')
  })

  it('renderiza variante warning', () => {
    render(<Alert variant="warning">Cuidado</Alert>)
    expect(screen.getByRole('alert').className).toContain('bg-amber-50')
  })

  it('renderiza variante error', () => {
    render(<Alert variant="error">Error</Alert>)
    expect(screen.getByRole('alert').className).toContain('bg-red-50')
  })

  it('llama onClose al click en cerrar', () => {
    const onClose = vi.fn()
    render(<Alert onClose={onClose}>Mensaje</Alert>)
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar alerta' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
