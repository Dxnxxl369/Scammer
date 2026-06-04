import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Input } from '../Input'

describe('Input', () => {
  it('muestra label', () => {
    render(<Input label="Correo" />)
    expect(screen.getByText('Correo')).toBeDefined()
  })

  it('muestra error', () => {
    render(<Input label="Campo" error="Campo requerido" />)
    expect(screen.getByText('Campo requerido')).toBeDefined()
  })

  it('muestra helperText si no hay error', () => {
    render(<Input label="Campo" helperText="Texto de ayuda" />)
    expect(screen.getByText('Texto de ayuda')).toBeDefined()
  })

  it('aria-invalid es true cuando hay error', () => {
    render(<Input label="Campo" error="Error" />)
    const input = screen.getByRole('textbox')
    expect(input.getAttribute('aria-invalid')).toBe('true')
  })

  it('aria-invalid es false cuando no hay error', () => {
    render(<Input label="Campo" />)
    const input = screen.getByRole('textbox')
    expect(input.getAttribute('aria-invalid')).toBe('false')
  })
})
