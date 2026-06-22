import { useEffect, useState, useCallback } from 'react'
import { anonimoService } from '../services/anonimoService'
import type { Anonimo } from '../types/auth'

const LIMITES = {
  livianos: 4,
  pesados: 3,
}

export function useAnonimo() {
  const [anonimo, setAnonimo] = useState<Anonimo | null>(null)
  const [cargando, setCargando] = useState(true)

  const recargar = useCallback(async () => {
    // Si ya hay identidad de usuario (login persistido en localStorage), NO
    // creamos/consultamos sesion anonima: un usuario logueado no debe generar
    // ni usar sesion de invitado (eso disparaba el modo anonimo al recargar).
    const port = window.location.port || '80'
    if (localStorage.getItem(`scammer-user-id-${port}`)) {
      setAnonimo(null)
      setCargando(false)
      return
    }
    setCargando(true)
    const sesion = await anonimoService.asegurarSesion()
    setAnonimo(sesion)
    setCargando(false)
  }, [])

  useEffect(() => {
    recargar()
  }, [recargar])

  const restantesLivianos = anonimo
    ? Math.max(0, LIMITES.livianos - (anonimo.intentos_livianos || 0))
    : 0

  const restantesPesados = anonimo
    ? Math.max(0, LIMITES.pesados - (anonimo.intentos_pesados || 0))
    : 0

  return {
    anonimo,
    cargando,
    restantesLivianos,
    restantesPesados,
    recargar,
  }
}
