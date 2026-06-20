import { api } from './api'
import type { Usuario, RespuestaApi } from '../types/auth'

export interface FiltrosUsuarios {
  rol?: 'administrador' | 'usuario'
  plan?: 'gratis' | 'starter' | 'pro' | 'elite'
  bloqueado?: boolean
  q?: string
  pagina?: number
  por_pagina?: number
}

export interface ListadoUsuarios {
  usuarios: Usuario[]
  total: number
  pagina: number
  por_pagina: number
  total_paginas: number
}

export interface Estadisticas {
  total_usuarios: number
  en_linea: number
  administradores: number
  usuarios_normales: number
  plan_gratis: number
  plan_starter: number
  plan_pro: number
  plan_elite: number
  bloqueados: number
  activos: number
}

export interface CrearUsuarioPayload {
  correo: string
  nombre_usuario: string
  password: string
  nombre_completo?: string
  rol: 'administrador' | 'usuario'
  plan: 'gratis' | 'starter' | 'pro' | 'elite'
  pais?: string
}

export interface ActualizarUsuarioPayload {
  correo?: string
  nombre_usuario?: string
  password?: string
  nombre_completo?: string
  rol?: 'administrador' | 'usuario'
  plan?: 'gratis' | 'starter' | 'pro' | 'elite'
  pais?: string
  activo?: boolean
  bloqueado?: boolean
}

export interface ResultadoOperacion {
  ok: boolean
  mensaje?: string
  usuario?: Usuario
}

function extraerError(err: unknown): string {
  const e = err as { response?: { data?: { error?: { mensaje?: string }; mensaje?: string } } }
  return (
    e?.response?.data?.error?.mensaje ||
    e?.response?.data?.mensaje ||
    'Error de conexión con el servidor.'
  )
}

export const adminService = {
  async listarUsuarios(filtros: FiltrosUsuarios = {}): Promise<ListadoUsuarios | null> {
    const params = new URLSearchParams()
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, String(v))
    })
    try {
      const r = await api.get<RespuestaApi<ListadoUsuarios>>(`/admin/usuarios/?${params}`)
      return r.data.datos || null
    } catch {
      return null
    }
  },

  async bloquear(idSupabase: string): Promise<boolean> {
    try {
      await api.patch(`/admin/usuarios/${idSupabase}/bloquear/`)
      return true
    } catch { return false }
  },

  async desbloquear(idSupabase: string): Promise<boolean> {
    try {
      await api.patch(`/admin/usuarios/${idSupabase}/desbloquear/`)
      return true
    } catch { return false }
  },

  async cambiarPlan(idSupabase: string, plan: 'gratis' | 'starter' | 'pro' | 'elite'): Promise<boolean> {
    try {
      await api.patch(`/admin/usuarios/${idSupabase}/plan/`, { plan })
      return true
    } catch { return false }
  },

  async cambiarRol(idSupabase: string, rol: 'administrador' | 'usuario'): Promise<boolean> {
    try {
      await api.patch(`/admin/usuarios/${idSupabase}/rol/`, { rol })
      return true
    } catch { return false }
  },

  async crearUsuario(payload: CrearUsuarioPayload): Promise<ResultadoOperacion> {
    try {
      const r = await api.post<RespuestaApi<Usuario>>('/admin/usuarios/', payload)
      return { ok: true, mensaje: r.data.mensaje, usuario: r.data.datos }
    } catch (err) {
      return { ok: false, mensaje: extraerError(err) }
    }
  },

  async actualizarUsuario(idSupabase: string, payload: ActualizarUsuarioPayload): Promise<ResultadoOperacion> {
    try {
      const r = await api.patch<RespuestaApi<Usuario>>(`/admin/usuarios/${idSupabase}/`, payload)
      return { ok: true, mensaje: r.data.mensaje, usuario: r.data.datos }
    } catch (err) {
      return { ok: false, mensaje: extraerError(err) }
    }
  },

  async eliminarUsuario(idSupabase: string): Promise<ResultadoOperacion> {
    try {
      const r = await api.delete<RespuestaApi>(`/admin/usuarios/${idSupabase}/`)
      return { ok: true, mensaje: r.data.mensaje }
    } catch (err) {
      return { ok: false, mensaje: extraerError(err) }
    }
  },

  async obtenerUsuario(idSupabase: string): Promise<Usuario | null> {
    try {
      const r = await api.get<RespuestaApi<Usuario>>(`/admin/usuarios/${idSupabase}/`)
      return r.data.datos || null
    } catch { return null }
  },

  async estadisticas(): Promise<Estadisticas | null> {
    try {
      const r = await api.get<RespuestaApi<Estadisticas>>('/admin/estadisticas/')
      return r.data.datos || null
    } catch {
      return null
    }
  },
}
