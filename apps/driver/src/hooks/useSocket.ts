import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import type { SystemUpdate } from '../types'

const API_URL = 'http://localhost:3001'

interface UseSocketOptions {
  onSystemUpdate: (data: SystemUpdate) => void
  enabled: boolean
}

export function useSocket({ onSystemUpdate, enabled }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null)
  const callbackRef = useRef(onSystemUpdate)
  callbackRef.current = onSystemUpdate

  const connect = useCallback(() => {
    if (socketRef.current) return

    const socket = io(API_URL, {
      transports: ['websocket'],
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    })

    socket.on('connect', () => {
      socket.emit('join_room', 'driver')
    })

    socket.on('system_update', (data: SystemUpdate) => {
      callbackRef.current(data)
    })

    socket.on('disconnect', () => {
      console.warn('[Socket] disconnected')
    })

    socketRef.current = socket
  }, [])

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect()
    socketRef.current = null
  }, [])

  useEffect(() => {
    if (enabled) {
      connect()
    } else {
      disconnect()
    }
    return () => { disconnect() }
  }, [enabled, connect, disconnect])
}
