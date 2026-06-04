// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { adminService } from '../adminService'
import * as apiModule from '../api'

vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}))

const mockApi = vi.mocked(apiModule.api)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('adminService', () => {
  it('listarUsuarios llama GET /admin/usuarios/', async () => {
    const payload = {
      data: {
        exito: true,
        datos: { usuarios: [], total: 0, pagina: 1, por_pagina: 20, total_paginas: 0 },
      },
    }
    mockApi.get = vi.fn().mockResolvedValue(payload)

    const result = await adminService.listarUsuarios()

    expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('/admin/usuarios/'))
    expect(result).toEqual(payload.data.datos)
  })

  it('listarUsuarios retorna null en error', async () => {
    mockApi.get = vi.fn().mockRejectedValue(new Error('network'))
    const result = await adminService.listarUsuarios()
    expect(result).toBeNull()
  })

  it('bloquear llama PATCH /admin/usuarios/:id/bloquear/', async () => {
    mockApi.patch = vi.fn().mockResolvedValue({})
    const ok = await adminService.bloquear('uid-123')
    expect(mockApi.patch).toHaveBeenCalledWith('/admin/usuarios/uid-123/bloquear/')
    expect(ok).toBe(true)
  })

  it('desbloquear llama PATCH /admin/usuarios/:id/desbloquear/', async () => {
    mockApi.patch = vi.fn().mockResolvedValue({})
    const ok = await adminService.desbloquear('uid-123')
    expect(mockApi.patch).toHaveBeenCalledWith('/admin/usuarios/uid-123/desbloquear/')
    expect(ok).toBe(true)
  })

  it('cambiarPlan llama PATCH con plan en body', async () => {
    mockApi.patch = vi.fn().mockResolvedValue({})
    const ok = await adminService.cambiarPlan('uid-123', 'pro')
    expect(mockApi.patch).toHaveBeenCalledWith('/admin/usuarios/uid-123/plan/', { plan: 'pro' })
    expect(ok).toBe(true)
  })

  it('cambiarRol llama PATCH con rol en body', async () => {
    mockApi.patch = vi.fn().mockResolvedValue({})
    const ok = await adminService.cambiarRol('uid-123', 'administrador')
    expect(mockApi.patch).toHaveBeenCalledWith('/admin/usuarios/uid-123/rol/', { rol: 'administrador' })
    expect(ok).toBe(true)
  })

  it('estadisticas retorna null en error', async () => {
    mockApi.get = vi.fn().mockRejectedValue(new Error('network'))
    const result = await adminService.estadisticas()
    expect(result).toBeNull()
  })
})
