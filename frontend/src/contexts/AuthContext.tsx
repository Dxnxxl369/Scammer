import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../utils/supabase'
import { authService } from '../services/authService'
import { anonimoService } from '../services/anonimoService'
import type { Usuario, Anonimo, DatosRegistro, DatosLogin, ResultadoAuth } from '../types/auth'

interface AuthContextType {
  usuario: Usuario | null
  anonimo: Anonimo | null
  cargando: boolean
  inicializado: boolean
  registrar: (datos: DatosRegistro) => Promise<ResultadoAuth>
  iniciarSesion: (datos: DatosLogin) => Promise<ResultadoAuth>
  iniciarSesionConGoogle: () => Promise<void>
  cerrarSesion: () => Promise<void>
  actualizarPerfil: (datos: Partial<Usuario>) => Promise<ResultadoAuth>
  recargarUsuario: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [anonimo, setAnonimo] = useState<Anonimo | null>(null)
  const [cargando, setCargando] = useState(true)
  const [inicializado, setInicializado] = useState(false)
  const [estaCerrandoSesion, setEstaCerrandoSesion] = useState(false)
  
  const sincronizandoRef = useRef(false)
  const inicializadoRef = useRef(false)

  // Motor de sincronización silenciosa (Identidad Simple - ULTRA RÁPIDA)
  const sincronizar = useCallback(async (session: any) => {
    if (estaCerrandoSesion || sincronizandoRef.current) return
    sincronizandoRef.current = true
    
    const port = window.location.port || '80'
    const storedUserId = localStorage.getItem(`scammer-user-id-${port}`)

    console.log(`[AUTH-DEBUG] Iniciando sincronización. ID en LocalStorage: ${storedUserId}`);

    try {
      if (storedUserId || session?.user) {
        const idAUsar = storedUserId || session?.user?.id;
        console.log(`[AUTH-DEBUG] Intentando recuperar perfil para ID: ${idAUsar}`);
        
        // Si hay una sesión de Supabase, nos aseguramos de guardar el ID
        if (session?.user) {
          localStorage.setItem(`scammer-user-id-${port}`, session.user.id)
        }

        const usuarioData = await authService.obtenerSesionActual()
        if (usuarioData) {
          console.log(`[AUTH-DEBUG] Perfil recuperado con éxito: ${usuarioData.nombre_usuario} (Rol: ${usuarioData.rol})`);
          setUsuario(usuarioData)
          setAnonimo(null)
          
          // PERSISTENCIA DE ROL PARA EL F5
          localStorage.setItem(`scammer-user-role-${port}`, usuarioData.rol)
          localStorage.setItem(`scammer-user-name-${port}`, usuarioData.nombre_usuario)
          
          document.cookie = 'id_sesion_anonimo=; Max-Age=0; path=/;'
        } else if (!session?.user && !storedUserId) {
          // Solo revertimos a anónimo si NO hay ninguna identidad guardada.
          // Si hay un ID guardado pero /auth/yo/ falló (error transitorio del
          // backend, red, etc.), NO borramos la sesión: mantenemos al usuario
          // logueado para que un F5 no lo eche.
          console.warn("[AUTH-DEBUG] Sin identidad. Cargando modo invitado.");
          localStorage.removeItem(`scammer-user-id-${port}`)
          localStorage.removeItem(`scammer-user-role-${port}`)
          localStorage.removeItem(`scammer-user-name-${port}`)
          const anonimoData = await anonimoService.asegurarSesion()
          setAnonimo(anonimoData)
          setUsuario(null)
        } else {
          console.warn("[AUTH-DEBUG] /auth/yo/ no respondió perfil pero hay ID guardado: mantengo la sesión.");
        }
      } else {
        console.log("[AUTH-DEBUG] No hay sesión detectada. Cargando modo invitado.");
        const anonimoData = await anonimoService.asegurarSesion()
        setAnonimo(anonimoData)
        setUsuario(null)
      }
    } catch (e) {
      console.error("[AUTH-DEBUG] Error crítico en sincronización:", e)
    } finally {
      setCargando(false)
      setInicializado(true)
      inicializadoRef.current = true
      sincronizandoRef.current = false
    }
  }, [estaCerrandoSesion])

  useEffect(() => {
    // 1. ARRANQUE INSTANTÁNEO: No esperamos a nada, si hay ID en LocalStorage, abrimos el terminal
    const port = window.location.port || '80'
    const idPersistente = localStorage.getItem(`scammer-user-id-${port}`);
    const rolPersistente = localStorage.getItem(`scammer-user-role-${port}`);

    if (idPersistente) {
        console.log(`[AUTH-DEBUG] Arranque en Caliente. ID: ${idPersistente}, Rol: ${rolPersistente}`);
        // Simulamos un usuario mínimo para que las rutas no reboten antes de la sincronización
        setUsuario({ id_supabase: idPersistente, rol: rolPersistente || 'usuario' } as any);
        setCargando(false)
        setInicializado(true)
    }

    const arranque = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        await sincronizar(session)
    }
    arranque()

    // 2. Escuchar cambios de estado (Mantenemos Supabase para el Login/Logout real)
    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AUTH] Evento: ${event}`)
      if (estaCerrandoSesion) return
      
      const port = window.location.port || '80'

      if (event === 'SIGNED_IN') {
        if (session?.user) {
          localStorage.setItem(`scammer-user-id-${port}`, session.user.id)
        }
        await sincronizar(session)
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem(`scammer-user-id-${port}`)
        setUsuario(null)
        const anonimoData = await anonimoService.asegurarSesion()
        setAnonimo(anonimoData)
        setCargando(false)
        setInicializado(true)
      }
    })

    return () => {
        subscription.subscription.unsubscribe()
    }
  }, [estaCerrandoSesion, sincronizar])

  const registrar = async (datos: DatosRegistro) => {
    setCargando(true)
    const resultado = await authService.registrar(datos)
    if (resultado.exito && resultado.datos) {
      setUsuario(resultado.datos as Usuario)
      setAnonimo(null)
    }
    setCargando(false)
    return resultado
  }

  const iniciarSesion = async (datos: DatosLogin) => {
    setCargando(true)
    const resultado = await authService.iniciarSesion(datos)
    if (resultado.exito && resultado.datos) {
      setUsuario(resultado.datos as Usuario)
      setAnonimo(null)
    }
    setCargando(false)
    return resultado
  }

  const iniciarSesionConGoogle = async () => {
    await authService.iniciarSesionConGoogle()
  }

  const cerrarSesion = async () => {
    setEstaCerrandoSesion(true)
    setCargando(true)
    try {
      await authService.cerrarSesion()
      setUsuario(null)
      setAnonimo(null)
      setInicializado(false)
      inicializadoRef.current = false
      window.location.href = '/login'
    } catch (e) {
      console.error("Error en salida:", e)
      window.location.href = '/login'
    } finally {
      setEstaCerrandoSesion(false)
      setCargando(false)
    }
  }

  const actualizarPerfil = async (datos: Partial<Usuario>) => {
    const resultado = await authService.actualizarPerfil(datos)
    if (resultado.exito && resultado.datos) setUsuario(resultado.datos as Usuario)
    return resultado
  }

  const recargarUsuario = async () => {
    const usuarioData = await authService.obtenerSesionActual()
    if (usuarioData) setUsuario(usuarioData)
  }

  return (
    <AuthContext.Provider value={{ 
      usuario, 
      anonimo, 
      cargando, 
      inicializado, 
      registrar, 
      iniciarSesion, 
      iniciarSesionConGoogle, 
      cerrarSesion, 
      actualizarPerfil, 
      recargarUsuario 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
