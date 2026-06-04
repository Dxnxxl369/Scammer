import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../Button'

describe('Button', () => {
  it('renderiza texto correctamente', () => {
    render(<Button>Haz click</Button>)
    expect(screen.getByRole('button', { name: 'Haz click' })).toBeDefined()
  })

  it('ejecuta onClick al click', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('está deshabilitado cuando loading es true', () => {
    render(<Button loading>Cargando</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('aplica variante primary con clase correcta', () => {
    render(<Button variant="primary">Primary</Button>)
    expect(screen.getByRole('button').className).toContain('bg-indigo-600')
  })

  it('aplica variante danger con clase correcta', () => {
    render(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button').className).toContain('bg-red-600')
  })
})
