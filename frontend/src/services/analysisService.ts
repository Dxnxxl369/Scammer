import { api } from './api'
import type { RespuestaApi } from '../types/auth'

export interface AnalisisResultado {
  id: string
  tipo: 'texto' | 'imagen' | 'audio' | 'url' | 'video' | 'documento' | 'codigo'
  probabilidadIA: number
  veredicto: string
  detalles: string
  puntosCriticos: Array<{ titulo: string; descripcion: string; score?: number; label?: string }>
  fecha: string
  contenido: string
  nombreArchivo?: string
  extension?: string
}

export const analysisService = {
  async analizarTexto(texto: string, metadata?: { nombre?: string; extension?: string }): Promise<AnalisisResultado> {
    const response = await api.post<RespuestaApi<AnalisisResultado>>('/analisis/texto/', { 
      texto,
      nombre_archivo: metadata?.nombre || 'texto_plano',
      extension: metadata?.extension || 'txt'
    })
    return response.data.datos!
  },

  async analizarImagen(archivo: File): Promise<AnalisisResultado> {
    const formData = new FormData()
    formData.append('archivo', archivo)
    formData.append('nombre_archivo', archivo.name)
    formData.append('extension', archivo.name.split('.').pop() || 'jpg')
    
    const response = await api.post<RespuestaApi<AnalisisResultado>>('/analisis/imagen/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data.datos!
  },

  async analizarVideo(archivo: File): Promise<AnalisisResultado> {
    const formData = new FormData()
    formData.append('archivo', archivo)
    formData.append('nombre_archivo', archivo.name)
    formData.append('extension', archivo.name.split('.').pop() || 'mp4')
    
    const response = await api.post<RespuestaApi<AnalisisResultado>>('/analisis/video/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data.datos!
  },

  async analizarAudio(archivo: File): Promise<AnalisisResultado> {
    const formData = new FormData()
    formData.append('archivo', archivo)
    formData.append('nombre_archivo', archivo.name)
    formData.append('extension', archivo.name.split('.').pop() || 'mp3')
    
    const response = await api.post<RespuestaApi<AnalisisResultado>>('/analisis/audio/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data.datos!
  },

  async analizarUrl(url: string): Promise<AnalisisResultado> {
    const response = await api.post<RespuestaApi<AnalisisResultado>>('/analisis/url/', { url })
    return response.data.datos!
  },

  async analizarCodigo(codigo: string, lenguaje?: string): Promise<AnalisisResultado> {
    const response = await api.post<RespuestaApi<AnalisisResultado>>('/analisis/codigo/', {
      codigo,
      ...(lenguaje && lenguaje !== 'auto' ? { lenguaje } : {}),
    })
    return response.data.datos!
  },

  async analizarArchivo(archivo: File): Promise<AnalisisResultado> {
    const formData = new FormData()
    formData.append('archivo', archivo)
    formData.append('nombre_archivo', archivo.name)
    formData.append('extension', archivo.name.split('.').pop() || 'txt')
    
    const response = await api.post<RespuestaApi<AnalisisResultado>>('/analisis/archivo/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data.datos!
  },

  async obtenerHistorial(): Promise<AnalisisResultado[]> {
    const response = await api.get<RespuestaApi<AnalisisResultado[]>>('/analisis/historial/')
    return response.data.datos || []
  }
}
