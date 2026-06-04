import { api } from './api'
import type { Anonimo, RespuestaApi } from '../types/auth'

const COOKIE_NAME = 'id_sesion_anonimo'
const COOKIE_HOURS = 1

export const anonimoService = {
  async crearSesion(): Promise<Anonimo | null> {
    try {
      const response = await api.post<RespuestaApi<Anonimo>>('/anonimos/sesion/')
      const anonimo = response.data.datos
      if (anonimo) this.guardarEnCookie(anonimo.id_sesion)
      return anonimo || null
    } catch {
      return null
    }
  },

  async obtenerSesion(idSesion: string): Promise<Anonimo | null> {
    try {
      const response = await api.get<RespuestaApi<Anonimo>>(`/anonimos/sesion/${idSesion}/`)
      return response.data.datos || null
    } catch {
      return null
    }
  },

  async incrementarIntentos(idSesion: string): Promise<Anonimo | null> {
    try {
      const response = await api.post<RespuestaApi<Anonimo>>(`/anonimos/sesion/${idSesion}/intento/`)
      return response.data.datos || null
    } catch {
      return null
    }
  },

  obtenerDeCookie(): string | null {
    const match = document.cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
    return match ? match[1] : null
  },

  guardarEnCookie(idSesion: string): void {
    const fecha = new Date()
    fecha.setTime(fecha.getTime() + COOKIE_HOURS * 60 * 60 * 1000)
    document.cookie = `${COOKIE_NAME}=${idSesion}; expires=${fecha.toUTCString()}; path=/; SameSite=Lax`
  },

  borrarCookie(): void {
    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  },

  async asegurarSesion(): Promise<Anonimo | null> {
    const idExistente = this.obtenerDeCookie()
    if (idExistente) {
      const sesion = await this.obtenerSesion(idExistente)
      if (sesion) return sesion
      this.borrarCookie()
    }
    return await this.crearSesion()
  },
}
