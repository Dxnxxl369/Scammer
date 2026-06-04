// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSignUp = vi.fn()
const mockSignIn = vi.fn()
const mockSignOut = vi.fn()
const mockGetSession = vi.fn()
const mockResetPassword = vi.fn()
const mockPost = vi.fn()
const mockGet = vi.fn()

vi.mock('../../utils/supabase', () => ({
  supabase: {
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignIn,
      signOut: mockSignOut,
      getSession: mockGetSession,
      resetPasswordForEmail: mockResetPassword,
    },
  },
}))

vi.mock('../api', () => ({
  api: {
    post: mockPost,
    get: mockGet,
    patch: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}))

describe('authService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('test_registrar_exitoso', async () => {
    mockSignUp.mockResolvedValue({
      data: { session: { access_token: 'tok' } },
      error: null,
    })
    mockPost.mockResolvedValue({
      data: { exito: true, datos: { id_supabase: 'uid', correo: 'a@b.com' } },
    })

    const { authService } = await import('../authService')
    const resultado = await authService.registrar({
      correo: 'a@b.com',
      password: 'Pass1234',
      nombre_usuario: 'user1',
    })

    expect(resultado.exito).toBe(true)
  })

  it('test_registrar_correo_duplicado', async () => {
    mockSignUp.mockResolvedValue({
      data: { session: { access_token: 'tok' } },
      error: null,
    })
    mockPost.mockRejectedValue({
      response: { data: { error: { codigo: 'CORREO_DUPLICADO', mensaje: 'Ya existe' } } },
    })
    mockSignOut.mockResolvedValue({})

    const { authService } = await import('../authService')
    const resultado = await authService.registrar({
      correo: 'dup@b.com',
      password: 'Pass1234',
      nombre_usuario: 'user2',
    })

    expect(resultado.exito).toBe(false)
    if (!resultado.exito) expect(resultado.error.codigo).toBe('CORREO_DUPLICADO')
  })

  it('test_iniciar_sesion_credenciales_invalidas', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } })

    const { authService } = await import('../authService')
    const resultado = await authService.iniciarSesion({ correo: 'a@b.com', password: 'wrong' })

    expect(resultado.exito).toBe(false)
    if (!resultado.exito) expect(resultado.error.codigo).toBe('CREDENCIALES_INVALIDAS')
  })
})
