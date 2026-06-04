import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockRegistrar = vi.fn()

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ registrar: mockRegistrar, usuario: null, anonimo: null, cerrarSesion: vi.fn() }),
}))

vi.mock('../../utils/supabase', () => ({
  supabase: { auth: {} },
}))

import { Registro } from '../Registro'

describe('Registro', () => {
  beforeEach(() => vi.clearAllMocks())

  it('valida nombre_usuario con caracteres inválidos', async () => {
    render(<MemoryRouter><Registro /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText(/nombre de usuario/i), { target: { value: 'user name' } })
    fireEvent.change(screen.getByLabelText(/correo/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText(/^contraseña$/i), { target: { value: 'Pass1234' } })
    fireEvent.change(screen.getByLabelText(/confirmar/i), { target: { value: 'Pass1234' } })
    fireEvent.submit(screen.getByRole('button', { name: /crear cuenta/i }))
    await waitFor(() => expect(screen.getByText(/solo minúsculas/i)).toBeDefined())
    expect(mockRegistrar).not.toHaveBeenCalled()
  })

  it('valida password corto', async () => {
    render(<MemoryRouter><Registro /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText(/nombre de usuario/i), { target: { value: 'user1' } })
    fireEvent.change(screen.getByLabelText(/correo/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText(/^contraseña$/i), { target: { value: '123' } })
    fireEvent.change(screen.getByLabelText(/confirmar/i), { target: { value: '123' } })
    fireEvent.submit(screen.getByRole('button', { name: /crear cuenta/i }))
    await waitFor(() => expect(screen.getByText(/mínimo 8/i)).toBeDefined())
  })

  it('valida passwords no coinciden', async () => {
    render(<MemoryRouter><Registro /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText(/nombre de usuario/i), { target: { value: 'user1' } })
    fireEvent.change(screen.getByLabelText(/correo/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText(/^contraseña$/i), { target: { value: 'Pass1234' } })
    fireEvent.change(screen.getByLabelText(/confirmar/i), { target: { value: 'Pass9999' } })
    fireEvent.submit(screen.getByRole('button', { name: /crear cuenta/i }))
    await waitFor(() => expect(screen.getByText(/no coinciden/i)).toBeDefined())
  })

  it('llama registrar con datos correctos', async () => {
    mockRegistrar.mockResolvedValue({ exito: true, datos: {} })
    render(<MemoryRouter><Registro /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText(/nombre de usuario/i), { target: { value: 'user1' } })
    fireEvent.change(screen.getByLabelText(/correo/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText(/^contraseña$/i), { target: { value: 'Pass1234' } })
    fireEvent.change(screen.getByLabelText(/confirmar/i), { target: { value: 'Pass1234' } })
    fireEvent.submit(screen.getByRole('button', { name: /crear cuenta/i }))
    await waitFor(() => expect(mockRegistrar).toHaveBeenCalled())
  })
})
