import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'

vi.mock('../../utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}))

vi.mock('../../services/authService', () => ({
  authService: {
    obtenerSesionActual: vi.fn().mockResolvedValue(null),
    cerrarSesion: vi.fn().mockResolvedValue(undefined),
    iniciarSesion: vi.fn(),
    registrar: vi.fn(),
    actualizarPerfil: vi.fn(),
  },
}))

vi.mock('../../services/anonimoService', () => ({
  anonimoService: {
    asegurarSesion: vi.fn().mockResolvedValue({
      id_sesion: 'anon-123',
      intentos_usados: 0,
    }),
    borrarCookie: vi.fn(),
    obtenerDeCookie: vi.fn().mockReturnValue(null),
  },
}))

function TestConsumer() {
  const { usuario, anonimo, cargando } = useAuth()
  if (cargando) return <div>cargando</div>
  return (
    <div>
      <div data-testid="usuario">{usuario ? usuario.correo : 'null'}</div>
      <div data-testid="anonimo">{anonimo ? anonimo.id_sesion : 'null'}</div>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => vi.clearAllMocks())

  it('test_AuthContext_usuario_inicial_null', async () => {
    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.queryByText('cargando')).toBeNull())
    expect(screen.getByTestId('usuario').textContent).toBe('null')
  })

  it('test_AuthContext_carga_anonimo_si_no_hay_sesion', async () => {
    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.queryByText('cargando')).toBeNull())
    expect(screen.getByTestId('anonimo').textContent).toBe('anon-123')
  })

  it('test_useAuth_lanza_error_fuera_de_provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow('useAuth debe usarse dentro de AuthProvider')
    consoleError.mockRestore()
  })
})
