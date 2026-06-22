import { useState, useCallback } from 'react'
import type { Anonimo } from '../types/auth'

// ─────────────────────────────────────────────────────────────────────────────
// LÓGICA DE INVITADOS / ANÓNIMOS — DESACTIVADA
// Ya NO hay anónimos: todos los usuarios deben estar autenticados.
// El hook se conserva como stub inerte (siempre 0 / null) para no romper los
// componentes que todavía lo importan (AnalysisCenter, Home, Prueba, etc.).
// ─────────────────────────────────────────────────────────────────────────────

// const LIMITES = { livianos: 4, pesados: 3 }

export function useAnonimo() {
  const [anonimo] = useState<Anonimo | null>(null)
  const [cargando] = useState(false)

  // No-op: ya no se crean/consultan sesiones de invitado.
  const recargar = useCallback(async () => {
    /*
    const port = window.location.port || '80'
    if (localStorage.getItem(`scammer-user-id-${port}`)) { setAnonimo(null); setCargando(false); return }
    setCargando(true)
    const sesion = await anonimoService.asegurarSesion()
    setAnonimo(sesion)
    setCargando(false)
    */
  }, [])

  const restantesLivianos = 0
  const restantesPesados = 0

  return {
    anonimo,
    cargando,
    restantesLivianos,
    restantesPesados,
    recargar,
  }
}
