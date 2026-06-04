import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockIniciarSesion = vi.fn()
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ iniciarSesion: mockIniciarSesion, usuario: null, anonimo: null, cerrarSesion: vi.fn() }),
}))

vi.mock('../../utils/supabase', () => ({
  supabase: { auth: { getSession: vi.fn(), onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }) } },
}))

import { Login } from '../Login'

function getSubmitButton() {
  return screen.getAllByRole('button', { name: /iniciar sesión/i }).find(
    (btn) => btn.getAttribute('type') === 'submit'
  )!
}

describe('Login', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renderiza form con email y password', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByLabelText(/correo/i)).toBeDefined()
    expect(screen.getByLabelText(/contraseña/i)).toBeDefined()
  })

  it('llama iniciarSesion al submit', async () => {
    mockIniciarSesion.mockResolvedValue({ exito: true, datos: { nombre_usuario: 'user' } })
    render(<MemoryRouter><Login /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText(/correo/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: '123456' } })
    fireEvent.click(getSubmitButton())
    await waitFor(() => expect(mockIniciarSesion).toHaveBeenCalledWith({ correo: 'a@b.com', password: '123456' }))
  })

  it('muestra error si auth falla', async () => {
    mockIniciarSesion.mockResolvedValue({ exito: false, error: { codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'Credenciales incorrectas' } })
    render(<MemoryRouter><Login /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText(/correo/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'wrong' } })
    fireEvent.click(getSubmitButton())
    await waitFor(() => expect(screen.getByText('Credenciales incorrectas')).toBeDefined())
  })

  it('redirige a /dashboard si éxito', async () => {
    mockIniciarSesion.mockResolvedValue({ exito: true, datos: {} })
    render(<MemoryRouter><Login /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText(/correo/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'pass' } })
    fireEvent.click(getSubmitButton())
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'))
  })
})
