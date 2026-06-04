import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAnonimo } from '../useAnonimo'
import * as anonimoServiceModule from '../../services/anonimoService'
import type { Anonimo } from '../../types/auth'

const makeAnonimo = (intentos = 0): Anonimo => ({
  id: 'id-123',
  id_sesion: 'sesion-abc',
  ip: null,
  navegador: null,
  pais: null,
  intentos_usados: intentos,
  fecha_creacion: '2026-01-01T00:00:00Z',
  fecha_expiracion: '2026-02-01T00:00:00Z',
})

describe('useAnonimo', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('test_useAnonimo_crea_sesion_si_no_hay_cookie', async () => {
    vi.spyOn(anonimoServiceModule.anonimoService, 'obtenerDeCookie').mockReturnValue(null)
    vi.spyOn(anonimoServiceModule.anonimoService, 'crearSesion').mockResolvedValue(makeAnonimo(0))

    const { result } = renderHook(() => useAnonimo())

    await waitFor(() => expect(result.current.cargando).toBe(false))

    expect(result.current.anonimo).not.toBeNull()
    expect(result.current.intentosRestantes).toBe(3)
  })

  it('test_useAnonimo_recupera_sesion_de_cookie', async () => {
    vi.spyOn(anonimoServiceModule.anonimoService, 'obtenerDeCookie').mockReturnValue('sesion-abc')
    vi.spyOn(anonimoServiceModule.anonimoService, 'obtenerSesion').mockResolvedValue(makeAnonimo(1))

    const { result } = renderHook(() => useAnonimo())

    await waitFor(() => expect(result.current.cargando).toBe(false))

    expect(result.current.anonimo?.id_sesion).toBe('sesion-abc')
    expect(result.current.intentosRestantes).toBe(2)
  })

  it('test_incrementar_intento_actualiza_estado', async () => {
    vi.spyOn(anonimoServiceModule.anonimoService, 'obtenerDeCookie').mockReturnValue('sesion-abc')
    vi.spyOn(anonimoServiceModule.anonimoService, 'obtenerSesion').mockResolvedValue(makeAnonimo(0))
    vi.spyOn(anonimoServiceModule.anonimoService, 'incrementarIntentos').mockResolvedValue(makeAnonimo(1))

    const { result } = renderHook(() => useAnonimo())
    await waitFor(() => expect(result.current.cargando).toBe(false))

    let resp!: { ok: boolean; restantes: number }
    await act(async () => {
      resp = await result.current.incrementarIntento()
    })

    expect(resp.ok).toBe(true)
    expect(resp.restantes).toBe(2)
    expect(result.current.anonimo?.intentos_usados).toBe(1)
  })

  it('test_limite_alcanzado_devuelve_true_en_3', async () => {
    vi.spyOn(anonimoServiceModule.anonimoService, 'obtenerDeCookie').mockReturnValue('sesion-abc')
    vi.spyOn(anonimoServiceModule.anonimoService, 'obtenerSesion').mockResolvedValue(makeAnonimo(3))

    const { result } = renderHook(() => useAnonimo())
    await waitFor(() => expect(result.current.cargando).toBe(false))

    expect(result.current.limiteAlcanzado).toBe(true)
    expect(result.current.intentosRestantes).toBe(0)
  })

  it('test_intentos_restantes_calcula_correctamente', async () => {
    vi.spyOn(anonimoServiceModule.anonimoService, 'obtenerDeCookie').mockReturnValue('sesion-abc')
    vi.spyOn(anonimoServiceModule.anonimoService, 'obtenerSesion').mockResolvedValue(makeAnonimo(2))

    const { result } = renderHook(() => useAnonimo())
    await waitFor(() => expect(result.current.cargando).toBe(false))

    expect(result.current.intentosRestantes).toBe(1)
    expect(result.current.limiteAlcanzado).toBe(false)
  })
})
