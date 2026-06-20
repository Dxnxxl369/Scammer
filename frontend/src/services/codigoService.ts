import { api } from './api'
import type { RespuestaApi } from '../types/auth'

export interface PuntoCritico {
  titulo: string
  score?: number
  descripcion?: string
}

export interface ResultadoCodigo {
  tipo: 'codigo'
  lenguaje?: string | null
  contenido?: string
  probabilidadIA: number
  perplejidad?: number | null
  veredicto: string
  detalles: string
  puntosCriticos?: PuntoCritico[]
  estado: 'OK' | 'INSUFICIENTE' | 'MOTOR_NO_DISPONIBLE'
  id?: string
  fecha?: string
}

export interface RespuestaCodigo {
  ok: boolean
  data?: ResultadoCodigo
  error?: string
}

export const codigoService = {
  async analizar(codigo: string, lenguaje?: string): Promise<RespuestaCodigo> {
    try {
      const r = await api.post<RespuestaApi<ResultadoCodigo>>('/analisis/codigo/', { codigo, lenguaje })
      return { ok: true, data: r.data.datos }
    } catch (e: unknown) {
      const resp = (e as { response?: { data?: RespuestaApi } })?.response
      return { ok: false, error: resp?.data?.error?.mensaje || 'Error de conexión con el motor de análisis' }
    }
  },
}
