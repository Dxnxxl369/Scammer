import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AdminRoute } from '../AdminRoute'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../hooks/useAnonimo', () => ({
  useAnonimo: () => ({ anonimo: null, intentosRestantes: 3 }),
}))

import { useAuth } from '../../hooks/useAuth'

const mockUseAuth = vi.mocked(useAuth)

describe('AdminRoute', () => {
  it('redirige a /login si no hay usuario', () => {
    mockUseAuth.mockReturnValue({
      usuario: null,
      anonimo: null,
      cargando: false,
      registrar: vi.fn(),
      iniciarSesion: vi.fn(),
      cerrarSesion: vi.fn(),
      actualizarPerfil: vi.fn(),
      recargarUsuario: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminRoute><div>Contenido admin</div></AdminRoute>
      </MemoryRouter>
    )

    expect(screen.queryByText('Contenido admin')).not.toBeInTheDocument()
  })

  it('redirige a /dashboard si usuario no es admin', () => {
    mockUseAuth.mockReturnValue({
      usuario: {
        id: '1', id_supabase: 'uid-1', correo: 'u@test.com',
        nombre_usuario: 'user1', nombre_completo: null,
        rol: 'usuario', plan: 'gratis', pais: 'BO',
        activo: true, bloqueado: false, intentos_usados: 0,
        fecha_creacion: '2026-01-01',
      },
      anonimo: null,
      cargando: false,
      registrar: vi.fn(),
      iniciarSesion: vi.fn(),
      cerrarSesion: vi.fn(),
      actualizarPerfil: vi.fn(),
      recargarUsuario: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminRoute><div>Contenido admin</div></AdminRoute>
      </MemoryRouter>
    )

    expect(screen.queryByText('Contenido admin')).not.toBeInTheDocument()
  })

  it('renderiza children si usuario es administrador', () => {
    mockUseAuth.mockReturnValue({
      usuario: {
        id: '1', id_supabase: 'uid-1', correo: 'admin@test.com',
        nombre_usuario: 'admin1', nombre_completo: null,
        rol: 'administrador', plan: 'pro', pais: 'BO',
        activo: true, bloqueado: false, intentos_usados: 0,
        fecha_creacion: '2026-01-01',
      },
      anonimo: null,
      cargando: false,
      registrar: vi.fn(),
      iniciarSesion: vi.fn(),
      cerrarSesion: vi.fn(),
      actualizarPerfil: vi.fn(),
      recargarUsuario: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminRoute><div>Contenido admin</div></AdminRoute>
      </MemoryRouter>
    )

    expect(screen.getByText('Contenido admin')).toBeInTheDocument()
  })
})
