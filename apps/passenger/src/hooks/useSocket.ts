import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import {
  SOCKET_URL,
  EVT_SYSTEM_UPDATE,
  EVT_TRIP_OPTIONS_RESPONSE,
  EVT_TRIP_OPTIONS_REQUEST,
  EVT_TRIP_REQUEST,
} from '../constants'
import type {
  SystemUpdatePayload,
  TripOptionsResponsePayload,
  TripOptionsRequestPayload,
  TripRequestPayload,
} from '../types'

export interface UseSocketOptions {
  onSystemUpdate: (payload: SystemUpdatePayload) => void
  onTripOptionsResponse: (payload: TripOptionsResponsePayload) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

export interface UseSocketReturn {
  requestTripOptions: (payload: TripOptionsRequestPayload) => void
  requestTrip: (payload: TripRequestPayload) => void
  isConnected: boolean
}

export function useSocket({
  onSystemUpdate,
  onTripOptionsResponse,
  onConnect,
  onDisconnect,
}: UseSocketOptions): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null)
  const connectedRef = useRef(false)

  // Stable callback refs so we never re-subscribe on parent re-renders
  const onSystemUpdateRef = useRef(onSystemUpdate)
  const onTripOptionsResponseRef = useRef(onTripOptionsResponse)
  const onConnectRef = useRef(onConnect)
  const onDisconnectRef = useRef(onDisconnect)

  useEffect(() => { onSystemUpdateRef.current = onSystemUpdate }, [onSystemUpdate])
  useEffect(() => { onTripOptionsResponseRef.current = onTripOptionsResponse }, [onTripOptionsResponse])
  useEffect(() => { onConnectRef.current = onConnect }, [onConnect])
  useEffect(() => { onDisconnectRef.current = onDisconnect }, [onDisconnect])

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      connectedRef.current = true
      onConnectRef.current?.()
    })

    socket.on('disconnect', () => {
      connectedRef.current = false
      onDisconnectRef.current?.()
    })

    socket.on(EVT_SYSTEM_UPDATE, (payload: SystemUpdatePayload) => {
      onSystemUpdateRef.current(payload)
    })

    socket.on(EVT_TRIP_OPTIONS_RESPONSE, (payload: TripOptionsResponsePayload) => {
      onTripOptionsResponseRef.current(payload)
    })

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
    }
  }, []) // intentionally empty — singleton connection for app lifetime

  const requestTripOptions = useCallback((payload: TripOptionsRequestPayload) => {
    socketRef.current?.emit(EVT_TRIP_OPTIONS_REQUEST, payload)
  }, [])

  const requestTrip = useCallback((payload: TripRequestPayload) => {
    socketRef.current?.emit(EVT_TRIP_REQUEST, payload)
  }, [])

  return {
    requestTripOptions,
    requestTrip,
    isConnected: connectedRef.current,
  }
}
