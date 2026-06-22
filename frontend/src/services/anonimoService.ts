import type { Anonimo } from '../types/auth'

// ─────────────────────────────────────────────────────────────────────────────
// LÓGICA DE USUARIOS ANÓNIMOS / INVITADOS — DESACTIVADA
// Ya NO existen invitados: todos los usuarios deben estar autenticados.
// Se conserva todo comentado por si se reactiva en el futuro. Los métodos quedan
// como stubs inertes (devuelven null / no hacen nada) para no romper los imports
// de los archivos que todavía los referencian.
// (El import de `api`/`RespuestaApi` se quitó porque al comentar ya no se usan.)
// ─────────────────────────────────────────────────────────────────────────────

const COOKIE_NAME = 'id_sesion_anonimo'
// const COOKIE_HOURS = 1

export const anonimoService = {
  async crearSesion(): Promise<Anonimo | null> {
    // DESACTIVADO — ya no se crean sesiones anónimas.
    /*
    try {
      const response = await api.post<RespuestaApi<Anonimo>>('/anonimos/sesion/')
      const anonimo = response.data.datos
      if (anonimo) this.guardarEnCookie(anonimo.id_sesion)
      return anonimo || null
    } catch {
      return null
    }
    */
    return null
  },

  async obtenerSesion(_idSesion: string): Promise<Anonimo | null> {
    // DESACTIVADO.
    /*
    try {
      const response = await api.get<RespuestaApi<Anonimo>>(`/anonimos/sesion/${_idSesion}/`)
      return response.data.datos || null
    } catch {
      return null
    }
    */
    return null
  },

  async incrementarIntentos(_idSesion: string): Promise<Anonimo | null> {
    // DESACTIVADO.
    /*
    try {
      const response = await api.post<RespuestaApi<Anonimo>>(`/anonimos/sesion/${_idSesion}/intento/`)
      return response.data.datos || null
    } catch {
      return null
    }
    */
    return null
  },

  obtenerDeCookie(): string | null {
    const match = document.cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
    return match ? match[1] : null
  },

  guardarEnCookie(_idSesion: string): void {
    // DESACTIVADO — no creamos cookies de invitado.
    /*
    const fecha = new Date()
    fecha.setTime(fecha.getTime() + COOKIE_HOURS * 60 * 60 * 1000)
    document.cookie = `${COOKIE_NAME}=${_idSesion}; expires=${fecha.toUTCString()}; path=/; SameSite=Lax`
    */
  },

  borrarCookie(): void {
    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  },

  async asegurarSesion(): Promise<Anonimo | null> {
    // DESACTIVADO — ya no se asegura/crea sesión anónima.
    /*
    const idExistente = this.obtenerDeCookie()
    if (idExistente) {
      const sesion = await this.obtenerSesion(idExistente)
      if (sesion) return sesion
      this.borrarCookie()
    }
    return await this.crearSesion()
    */
    return null
  },
}
