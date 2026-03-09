import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { SOCKET_URL } from '../constants'
import type { TripRequest, TripOptionsRequest, SystemUpdate, TripOption } from '../types'

interface UseSocketOptions {
  onTripRequest: (req: TripRequest) => void
  onTripOptionsRequest: (req: TripOptionsRequest, respondWith: (options: TripOption[]) => void) => void
}

interface UseSocketReturn {
  emitSystemUpdate: (update: SystemUpdate) => void
  isConnected: boolean
}

export function useSocket({ onTripRequest, onTripOptionsRequest }: UseSocketOptions): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null)
  const isConnectedRef = useRef(false)

  // Keep callbacks in refs so the effect closure never goes stale
  const onTripRequestRef = useRef(onTripRequest)
  const onTripOptionsRequestRef = useRef(onTripOptionsRequest)

  useEffect(() => {
    onTripRequestRef.current = onTripRequest
  }, [onTripRequest])

  useEffect(() => {
    onTripOptionsRequestRef.current = onTripOptionsRequest
  }, [onTripOptionsRequest])

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      isConnectedRef.current = true
      socket.emit('join_room', 'admin')
      console.log('[Socket] Connected as admin:', socket.id)
    })

    socket.on('disconnect', () => {
      isConnectedRef.current = false
      console.log('[Socket] Disconnected')
    })

    // trip_request: { busId, origin: {lat,lon}, dest: {lat,lon} }
    socket.on('trip_request', (req: TripRequest) => {
      onTripRequestRef.current(req)
    })

    // trip_options_request: { origin, dest, requesterId }
    socket.on('trip_options_request', (req: TripOptionsRequest) => {
      onTripOptionsRequestRef.current(req, (options) => {
        // Must echo requesterId so the API can route response to the right passenger
        socket.emit('trip_options_response', { options, requesterId: req.requesterId })
      })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, []) // intentionally empty — only mount/unmount

  const emitSystemUpdate = useCallback((update: SystemUpdate) => {
    socketRef.current?.emit('system_update', update)
  }, [])

  return {
    emitSystemUpdate,
    isConnected: isConnectedRef.current,
  }
}
