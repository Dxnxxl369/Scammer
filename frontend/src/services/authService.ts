import axios from 'axios'
import { supabase } from '../utils/supabase'
import { api } from './api'
import type { Usuario, DatosRegistro, DatosLogin, ResultadoAuth, RespuestaApi } from '../types/auth'

export const authService = {
  async registrar(datos: DatosRegistro): Promise<ResultadoAuth> {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: datos.correo,
      password: datos.password,
    })

    if (authError) return { exito: false, error: { codigo: 'AUTH_ERROR', mensaje: authError.message } }
    if (!authData.user) return { exito: false, error: { codigo: 'AUTH_ERROR', mensaje: 'No se pudo crear el usuario' } }

    try {
      // Inyectamos el ID manualmente para el registro
      const response = await api.post<RespuestaApi<Usuario>>('/auth/registro/', {
        correo: datos.correo,
        nombre_usuario: datos.nombre_usuario,
        nombre_completo: datos.nombre_completo,
        pais: datos.pais,
      }, {
        headers: { 'X-User-ID': authData.user.id }
      })
      
      // Guardar ID en LocalStorage para persistencia Simple
      const port = window.location.port || '80'
      localStorage.setItem(`scammer-user-id-${port}`, authData.user.id)

      return { exito: true, datos: response.data.datos }
    } catch (apiError: any) {
      // Si falla el registro en el backend, borramos el usuario de Supabase (simulado, requiere admin en vida real)
      return { 
        exito: false, 
        error: { 
          codigo: apiError.response?.data?.error?.codigo || 'API_ERROR', 
          mensaje: apiError.response?.data?.error?.mensaje || 'Error al guardar perfil' 
        } 
      }
    }
  },

  async iniciarSesion(datos: DatosLogin): Promise<ResultadoAuth> {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: datos.correo,
      password: datos.password,
    })

    if (authError) return { exito: false, error: { codigo: 'AUTH_ERROR', mensaje: authError.message } }
    
    try {
      const port = window.location.port || '80'
      const userId = authData.user.id
      
      // Inyectamos el ID manualmente para obtener el perfil (primera vez)
      const response = await api.get<RespuestaApi<Usuario>>('/auth/yo/', {
        headers: { 
          'X-User-ID': userId,
          'Authorization': `Bearer ${authData.session?.access_token}`
        }
      })
      
      // Persistimos el ID para futuras peticiones automáticas
      localStorage.setItem(`scammer-user-id-${port}`, userId)

      return { exito: true, datos: response.data.datos }
    } catch (apiError: any) {
      if (apiError.response?.status === 404) {
        // El usuario existe en Supabase pero no en Mongo (ej: migración manual)
        try {
          const user = authData.user!
          const response = await api.post<RespuestaApi<Usuario>>('/auth/registro/', {
            correo: user.email,
            nombre_usuario: user.email?.split('@')[0],
            nombre_completo: '',
            pais: 'BO',
          })
          return { exito: true, datos: response.data.datos }
        } catch (regError: any) {
          const msg = regError.response?.data?.error?.mensaje || 'Error en sincronización de perfil'
          return { exito: false, error: { codigo: 'SYNC_ERROR', mensaje: `Sincronización fallida: ${msg}` } }
        }
      }
      return { exito: false, error: { codigo: 'API_ERROR', mensaje: 'Error al obtener perfil del servidor' } }
    }
  },

  async iniciarSesionConGoogle(): Promise<void> {
    const origin = window.location.origin
    console.log("DEBUG: Iniciando OAuth con Google. Origin:", origin)
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    })
    
    if (error) {
      console.error("GOOGLE_AUTH_ERROR:", error.message)
      throw error
    }
  },

  async obtenerSesionActual(): Promise<Usuario | null> {
    // Aceptamos identidad simple (header X-User-ID) aunque no haya sesión de Supabase.
    const port = window.location.port || '80'
    const storedUserId = localStorage.getItem(`scammer-user-id-${port}`)

    // IMPORTANTE: si hay identidad simple (X-User-ID) NO llamamos a
    // supabase.auth.getSession(). Un getSession lento o colgado (token expirado +
    // proyecto Supabase inalcanzable) congelaba el arranque y dejaba el spinner
    // "Sincronizando Terminal" en bucle. Con id guardado vamos directo a /auth/yo/.
    if (!storedUserId) {
      let session = null
      try {
        session = (await supabase.auth.getSession()).data.session
      } catch {
        session = null
      }
      // Sin sesión de Supabase NI id guardado => no hay a quién consultar.
      if (!session) return null
    }

    try {
      const response = await api.get<RespuestaApi<Usuario>>('/auth/yo/')
      return response.data.datos || null
    } catch (apiError) {
      // Auto-registro para usuarios de Google que no están en Mongo
      if (axios.isAxiosError(apiError) && apiError.response?.status === 404) {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return null
          
          const response = await api.post<RespuestaApi<Usuario>>('/auth/registro/', {
            correo: user.email,
            nombre_usuario: user.user_metadata?.nombre_usuario || user.email?.split('@')[0],
            nombre_completo: user.user_metadata?.full_name || '',
            pais: 'BO',
          })
          return response.data.datos || null
        } catch (registroError) {
          console.error('Error en auto-registro:', registroError)
          return null
        }
      }
      return null
    }
  },

  async cerrarSesion(): Promise<void> {
    console.log("[AUTH] Iniciando protocolo de purga total...");
    
    // 1. Intentar aviso al backend y Supabase (con timeout para no bloquear)
    try {
      await Promise.race([
        Promise.all([
          api.post('/auth/logout/').catch(() => {}),
          supabase.auth.signOut().catch(() => {})
        ]),
        new Promise(resolve => setTimeout(resolve, 2000)) // Máximo 2s de espera
      ]);
    } catch (e) {
      console.warn("[AUTH] Error en desconexión remota, procediendo con purga local.");
    }

    // 2. PURGA ATÓMICA LOCAL (Ejecución garantizada)
    try {
      // Limpieza de todos los tipos de almacenamiento
      window.localStorage.clear();
      window.sessionStorage.clear();
      
      // Limpieza manual por si clear() falla en algún navegador raro
      const keys = Object.keys(localStorage);
      for (let key of keys) { localStorage.removeItem(key); }

      // 3. Limpieza de cookies
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
      }

      console.log("[AUTH] Purga completada. Reiniciando terminal...");
    } catch (err) {
      console.error("[AUTH] Error crítico durante la purga local:", err);
    } finally {
      // 4. SALIDA DE EMERGENCIA: Redirección dura
      // Usamos replace para que no puedan darle a "atrás"
      window.location.replace('/');
    }
  },

  async recuperarPassword(correo: string): Promise<ResultadoAuth> {
    const { error } = await supabase.auth.resetPasswordForEmail(correo, {
      redirectTo: `${window.location.origin}/recuperar-password/confirmar`,
    })
    if (error) {
      return { exito: false, error: { codigo: 'ERROR', mensaje: error.message } }
    }
    return { exito: true }
  },

  async actualizarPerfil(datos: Partial<Usuario>): Promise<ResultadoAuth> {
    try {
      const response = await api.patch<RespuestaApi<Usuario>>('/auth/yo/', datos)
      return { exito: true, datos: response.data.datos }
    } catch (e: any) {
      return { exito: false, error: { codigo: 'ERROR', mensaje: 'No se pudo actualizar' } }
    }
  }
}
