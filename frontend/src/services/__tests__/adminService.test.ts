// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { adminService } from '../adminService'
import * as apiModule from '../api'

vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
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

  it('crearUsuario hace POST /admin/usuarios/ y retorna ok', async () => {
    const usuario = { id_supabase: 'uid-9', correo: 'a@b.com', nombre_usuario: 'agente', rol: 'usuario', plan: 'gratis' }
    mockApi.post = vi.fn().mockResolvedValue({ data: { exito: true, mensaje: 'Usuario creado correctamente', datos: usuario } })

    const res = await adminService.crearUsuario({
      correo: 'a@b.com', nombre_usuario: 'agente', password: 'secreta123', rol: 'usuario', plan: 'gratis',
    })

    expect(mockApi.post).toHaveBeenCalledWith('/admin/usuarios/', expect.objectContaining({ correo: 'a@b.com', rol: 'usuario' }))
    expect(res.ok).toBe(true)
    expect(res.usuario).toEqual(usuario)
  })

  it('crearUsuario extrae el mensaje de error del backend', async () => {
    mockApi.post = vi.fn().mockRejectedValue({ response: { data: { error: { mensaje: 'El correo ya está registrado' } } } })
    const res = await adminService.crearUsuario({
      correo: 'a@b.com', nombre_usuario: 'agente', password: 'secreta123', rol: 'usuario', plan: 'gratis',
    })
    expect(res.ok).toBe(false)
    expect(res.mensaje).toBe('El correo ya está registrado')
  })

  it('actualizarUsuario hace PATCH /admin/usuarios/:id/', async () => {
    mockApi.patch = vi.fn().mockResolvedValue({ data: { exito: true, mensaje: 'Usuario actualizado', datos: {} } })
    const res = await adminService.actualizarUsuario('uid-1', { rol: 'administrador' })
    expect(mockApi.patch).toHaveBeenCalledWith('/admin/usuarios/uid-1/', { rol: 'administrador' })
    expect(res.ok).toBe(true)
  })

  it('eliminarUsuario hace DELETE /admin/usuarios/:id/', async () => {
    mockApi.delete = vi.fn().mockResolvedValue({ data: { exito: true, mensaje: 'Usuario eliminado correctamente' } })
    const res = await adminService.eliminarUsuario('uid-1')
    expect(mockApi.delete).toHaveBeenCalledWith('/admin/usuarios/uid-1/')
    expect(res.ok).toBe(true)
  })

  it('eliminarUsuario retorna ok=false en error', async () => {
    mockApi.delete = vi.fn().mockRejectedValue({ response: { data: { error: { mensaje: 'No puedes eliminar tu propia cuenta de administrador.' } } } })
    const res = await adminService.eliminarUsuario('uid-self')
    expect(res.ok).toBe(false)
    expect(res.mensaje).toContain('No puedes eliminar')
  })

  it('obtenerUsuario hace GET /admin/usuarios/:id/', async () => {
    const usuario = { id_supabase: 'uid-1', correo: 'x@y.com' }
    mockApi.get = vi.fn().mockResolvedValue({ data: { exito: true, datos: usuario } })
    const res = await adminService.obtenerUsuario('uid-1')
    expect(mockApi.get).toHaveBeenCalledWith('/admin/usuarios/uid-1/')
    expect(res).toEqual(usuario)
  })
})
