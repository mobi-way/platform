import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import type { SystemUpdate } from '../types'

const API_URL = 'http://localhost:3001'

interface UseSocketOptions {
  onSystemUpdate: (data: SystemUpdate) => void
  enabled: boolean
  accessToken: string | null
}

export function useSocket({ onSystemUpdate, enabled, accessToken }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null)
  const callbackRef = useRef(onSystemUpdate)
  callbackRef.current = onSystemUpdate

  const connect = useCallback(() => {
    if (socketRef.current || !accessToken) return

    const socket = io(API_URL, {
      transports: ['websocket'],
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      auth: { token: accessToken },
    })

    socket.on('connect', () => {
      console.log('[Socket] Connected as driver:', socket.id)
    })

    socket.on('system_update', (data: SystemUpdate) => {
      callbackRef.current(data)
    })

    socket.on('connect_error', (err) => {
      console.error('[Socket] Auth error:', err.message)
    })

    socket.on('disconnect', () => {
      console.warn('[Socket] disconnected')
    })

    socketRef.current = socket
  }, [accessToken])

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect()
    socketRef.current = null
  }, [])

  useEffect(() => {
    if (enabled && accessToken) {
      connect()
    } else {
      disconnect()
    }
    return () => { disconnect() }
  }, [enabled, accessToken, connect, disconnect])
}
