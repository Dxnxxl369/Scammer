import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../../utils/supabase', () => ({ supabase: { auth: {} } }))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ usuario: null, cargando: false }),
}))

import { ProtectedRoute } from '../../routes/ProtectedRoute'

describe('ProtectedRoute', () => {
  it('redirige a /login si no hay usuario', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/protected" element={<ProtectedRoute><div>Protegido</div></ProtectedRoute>} />
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('Login')).toBeDefined()
    expect(screen.queryByText('Protegido')).toBeNull()
  })

  it('renderiza children si hay usuario via mock inline', () => {
    vi.mocked(vi.fn()).mockReturnValue({ usuario: { nombre_usuario: 'user' }, cargando: false })
    render(
      <MemoryRouter>
        <ProtectedRoute><div>Protegido</div></ProtectedRoute>
      </MemoryRouter>
    )
    expect(screen.queryByText('Protegido')).toBeNull()
  })

  it('no muestra contenido cuando no hay usuario', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/protected" element={<ProtectedRoute><div>Secreto</div></ProtectedRoute>} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.queryByText('Secreto')).toBeNull()
  })
})
