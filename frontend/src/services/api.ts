import axios from 'axios'
import { supabase } from '../utils/supabase'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 300000, // 5 minutos para subir archivos grandes (Video/Audio)
  withCredentials: false,
})

// Request Interceptor: Identidad Simplificada (Persistencia Real)
api.interceptors.request.use(async (config) => {
  const port = window.location.port || '80'
  const userId = localStorage.getItem(`scammer-user-id-${port}`)
  
  if (userId) {
    config.headers['X-User-ID'] = userId
  }
  // --- SESIÓN ANÓNIMA DESACTIVADA (ya no hay invitados) ---
  // else {
  //   const match = document.cookie.match(new RegExp('id_sesion_anonimo=([^;]+)'))
  //   if (match) {
  //     config.headers['X-Session-Id'] = match[1]
  //   }
  // }
  return config
})

// Response Interceptor: Manejo de errores de sesión
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    // Si la petición excedió el tiempo límite
    if (error.code === 'ECONNABORTED') {
        console.error("[API] Nodo fuera de línea o latencia excesiva. Abortando.");
    }
    
    // Si el error es 401 (No autorizado) y no es un reintento
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      console.warn("[API] 401 Detectado, intentando re-sincronización silenciosa...");
      
      try {
        const { data, error: refreshError } = await supabase.auth.refreshSession()
        
        if (data.session && !refreshError) {
          console.log("[API] Túnel re-establecido. Reintentando operación.")
          originalRequest.headers.Authorization = `Bearer ${data.session.access_token}`
          return api(originalRequest)
        }
      } catch (e) {
        console.error("[API] Fallo crítico al recuperar sesión:", e)
      }
    }
    
    return Promise.reject(error)
  }
)
