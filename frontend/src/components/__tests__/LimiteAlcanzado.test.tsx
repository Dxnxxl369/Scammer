import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LimiteAlcanzado } from '../LimiteAlcanzado'

function renderComponente() {
  return render(
    <MemoryRouter>
      <LimiteAlcanzado />
    </MemoryRouter>
  )
}

describe('LimiteAlcanzado', () => {
  it('renderiza mensaje de límite', () => {
    renderComponente()
    expect(screen.getByText(/has alcanzado tu límite/i)).toBeInTheDocument()
    expect(screen.getByText(/3 análisis por día/i)).toBeInTheDocument()
  })

  it('tiene botones de registro y login', () => {
    renderComponente()
    const btnRegistro = screen.getByRole('link', { name: /crear cuenta gratis/i })
    const btnLogin = screen.getByRole('link', { name: /iniciar sesión/i })
    expect(btnRegistro).toHaveAttribute('href', '/registro')
    expect(btnLogin).toHaveAttribute('href', '/login')
  })
})
