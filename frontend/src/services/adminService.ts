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

  async estadisticas(): Promise<Estadisticas | null> {
    try {
      const r = await api.get<RespuestaApi<Estadisticas>>('/admin/estadisticas/')
      return r.data.datos || null
    } catch {
      return null
    }
  },
}
