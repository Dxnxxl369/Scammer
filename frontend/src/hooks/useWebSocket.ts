import { useEffect, useRef, useCallback, useState } from 'react'

interface WebSocketOptions {
  onMessage?: (data: any) => void
  onConnect?: () => void
  onDisconnect?: () => void
  url: string
}

export function useWebSocket({ url, onMessage, onConnect, onDisconnect }: WebSocketOptions) {
  const socketRef = useRef<WebSocket | null>(null)
  const currentUrlRef = useRef<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectDelayRef = useRef(5000)

  const connect = useCallback(() => {
    // 1. ELIMINAR CABLE FANTASMA: Si no hay URL, abortamos antes de tocar la red
    if (!url || url === '' || url.includes('undefined') || url.includes('null')) {
        // Log silencioso para evitar inundar la consola
        return
    }

    // 2. Guardias de estado: evitar conexiones duplicadas
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
        if (currentUrlRef.current === url) return;
    }

    // 3. ATOMIC CLEANUP: Cortar rastro anterior antes de abrir uno nuevo
    if (socketRef.current) {
        socketRef.current.onopen = null;
        socketRef.current.onmessage = null;
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        if (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING) {
            socketRef.current.close();
        }
        socketRef.current = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = import.meta.env.VITE_API_URL.replace('http://', '').replace('https://', '').split('/')[0]
    const fullUrl = `${protocol}//${host}${url}`
    currentUrlRef.current = url

    const socket = new WebSocket(fullUrl)
    socketRef.current = socket
    
    socket.onopen = () => {
      console.log(`[WS] TÚNEL CONECTADO: ${url}`);
      setIsConnected(true)
      reconnectDelayRef.current = 5000
      // NOTA: Heartbeat eliminado. Daphne ya no preguntará si estamos vivos.
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage?.(data)
      } catch (e) {
        onMessage?.(event.data)
      }
    }

    socket.onclose = (event) => {
      setIsConnected(false)
      
      // Reconexión pasiva y lenta
      if (event.code !== 1000 && currentUrlRef.current === url) {
          const delay = 10000 // Esperar 10 segundos fijos para no saturar
          
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = setTimeout(() => {
              connect()
          }, delay)
      }
    }

    socket.onerror = () => {
        // Error silencioso, manejado por onclose
    }
  }, [url, onMessage])

  useEffect(() => {
    // Retraso inicial para dar tiempo al AuthContext a estabilizarse
    const timer = setTimeout(() => {
        connect()
    }, 100)

    return () => {
      clearTimeout(timer)
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current)
      if (socketRef.current) {
          socketRef.current.onopen = null;
          socketRef.current.onmessage = null;
          socketRef.current.onclose = null;
          socketRef.current.onerror = null;
          socketRef.current.close(1000, "Componente desmontado");
          socketRef.current = null;
      }
    }
  }, [connect])

  const sendMessage = useCallback((data: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { isConnected, sendMessage }
}
