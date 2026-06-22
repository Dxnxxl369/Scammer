import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../utils/supabase'
import { authService } from '../services/authService'
// import { anonimoService } from '../services/anonimoService' // ANÓNIMO DESACTIVADO
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
          // Sin identidad guardada. ANTES se creaba sesión anónima; ahora NO:
          // todos deben autenticarse, así que dejamos el usuario en null y las
          // rutas protegidas lo mandan a /login.
          console.warn("[AUTH-DEBUG] Sin identidad. Requiere autenticación.");
          localStorage.removeItem(`scammer-user-id-${port}`)
          localStorage.removeItem(`scammer-user-role-${port}`)
          localStorage.removeItem(`scammer-user-name-${port}`)
          // --- ANÓNIMO DESACTIVADO ---
          // const anonimoData = await anonimoService.asegurarSesion()
          // setAnonimo(anonimoData)
          setAnonimo(null)
          setUsuario(null)
        } else {
          console.warn("[AUTH-DEBUG] /auth/yo/ no respondió perfil pero hay ID guardado: mantengo la sesión.");
        }
      } else {
        console.log("[AUTH-DEBUG] No hay sesión. Requiere autenticación.");
        // --- ANÓNIMO DESACTIVADO ---
        // const anonimoData = await anonimoService.asegurarSesion()
        // setAnonimo(anonimoData)
        setAnonimo(null)
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
        // YA NO seteamos un usuario PARCIAL (eso causaba "VISITANTE_TEMPORAL" al
        // recargar: un objeto con id+rol pero sin plan). Mientras carga el perfil
        // COMPLETO mantenemos el spinner (cargando=true / inicializado=false) y la
        // ruta protegida muestra "Autenticando Canal...". Así `usuario` solo puede
        // ser null (cargando) o COMPLETO — nunca parcial/temporal.
        authService.obtenerSesionActual()
          .then(u => {
            console.log('[AUTH-DEBUG] Carga directa de perfil:', u ? `OK ${u.nombre_usuario} (plan=${u.plan})` : 'NULL (id inválido o /auth/yo/ sin perfil)')
            if (u) {
              setUsuario(u)
              localStorage.setItem(`scammer-user-role-${port}`, u.rol)
              localStorage.setItem(`scammer-user-name-${port}`, u.nombre_usuario)
            } else {
              // Sin perfil válido: tratamos como sin sesión (la ruta manda a /login).
              setUsuario(null)
            }
          })
          .catch(e => console.error('[AUTH-DEBUG] Carga directa de perfil falló:', e))
          .finally(() => {
            setCargando(false)
            setInicializado(true)
          })
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
        // OJO: Supabase emite SIGNED_OUT no solo por logout intencional, tambien
        // cuando el access token expira y el refresh falla. La identidad real de
        // la app es X-User-ID (en localStorage, independiente del token de
        // Supabase) y el backend la acepta -> NO debemos cerrar sesion aqui,
        // porque eso echaba al usuario al recargar (F5) volviendolo anonimo.
        // El logout de verdad lo maneja cerrarSesion() (limpia todo + redirige);
        // ese caso ya se filtra arriba con `if (estaCerrandoSesion) return`.
        const sigueElId = localStorage.getItem(`scammer-user-id-${port}`)
        if (sigueElId) {
          console.warn('[AUTH] SIGNED_OUT de Supabase ignorado: la identidad simple (X-User-ID) sigue activa.')
        } else {
          // No hay identidad simple. ANTES caía a invitado; ahora requiere login.
          setUsuario(null)
          // --- ANÓNIMO DESACTIVADO ---
          // const anonimoData = await anonimoService.asegurarSesion()
          // setAnonimo(anonimoData)
          setAnonimo(null)
          setCargando(false)
          setInicializado(true)
        }
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
