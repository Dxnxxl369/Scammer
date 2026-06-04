import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockUsuario = {
  id: '1', id_supabase: 'sup1', correo: 'a@b.com', nombre_usuario: 'user1',
  nombre_completo: 'Juan Pérez', rol: 'usuario' as const, plan: 'gratis' as const,
  pais: 'BO', activo: true, bloqueado: false, intentos_usados: 3, fecha_creacion: '',
}

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ usuario: mockUsuario, anonimo: null, cerrarSesion: vi.fn() }),
}))

vi.mock('../../utils/supabase', () => ({ supabase: { auth: {} } }))

import { Dashboard } from '../Dashboard'

describe('Dashboard', () => {
  it('muestra nombre del usuario', () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    expect(screen.getByText(/Juan Pérez/i)).toBeDefined()
  })

  it('muestra plan e intentos', () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    expect(screen.getByText('gratis')).toBeDefined()
    expect(screen.getByText('3 / 10')).toBeDefined()
  })
})
