import React, { useCallback, useEffect, useRef } from 'react'
import { useFleet } from './hooks/useFleet'
import { useSocket } from './hooks/useSocket'
import { useAuth } from './contexts/AuthContext'
import FleetMap from './components/FleetMap'
import BusSidebar from './components/BusSidebar'
import StopSidebar from './components/StopSidebar'
import StatusPanel from './components/StatusPanel'
import type { BusSnapshot, StopSnapshot } from './types'
import { MAX_ZOOM_FOCUS } from './constants'

const App: React.FC = () => {
  const { accessToken } = useAuth()
  const fleet = useFleet()
  const emitIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Trip request handler ────────────────────────────────────────────────
  const handleTripRequest = useCallback(
    (req: Parameters<typeof fleet.handleTripRequest>[0]) => {
      fleet.handleTripRequest(req)
    },
    [fleet],
  )

  // ── Trip options request handler ────────────────────────────────────────
  const handleTripOptionsRequest = useCallback(
    (
      req: Parameters<typeof fleet.handleTripOptionsRequest>[0],
      respond: Parameters<typeof fleet.handleTripOptionsRequest>[1],
    ) => {
      fleet.handleTripOptionsRequest(req, respond)
    },
    [fleet],
  )

  // ── Socket.io ───────────────────────────────────────────────────────────
  const { emitSystemUpdate } = useSocket({
    accessToken,
    onTripRequest:        handleTripRequest,
    onTripOptionsRequest: handleTripOptionsRequest,
  })

  // ── Emit system_update every 500 ms once simulation is running ──────────
  useEffect(() => {
    if (!fleet.initialized) return

    emitIntervalRef.current = setInterval(() => {
      emitSystemUpdate(fleet.getSystemUpdate())
    }, 500)

    return () => {
      if (emitIntervalRef.current) clearInterval(emitIntervalRef.current)
    }
  }, [fleet.initialized, emitSystemUpdate, fleet.getSystemUpdate])

  // ── Sidebar interactions ────────────────────────────────────────────────
  const handleSelectBus = useCallback((bus: BusSnapshot) => {
    const extFleet = fleet as typeof fleet & {
      _watchedBusRef: React.MutableRefObject<string | null>
      _mapRef: React.MutableRefObject<import('leaflet').Map | null>
    }
    extFleet._watchedBusRef.current = bus.id
    extFleet._mapRef.current?.setView([bus.lat, bus.lon], MAX_ZOOM_FOCUS)
  }, [fleet])

  const handleSelectStop = useCallback((stop: StopSnapshot) => {
    const extFleet = fleet as typeof fleet & {
      _watchedBusRef: React.MutableRefObject<string | null>
      _mapRef: React.MutableRefObject<import('leaflet').Map | null>
    }
    extFleet._watchedBusRef.current = null
    extFleet._mapRef.current?.setView([stop.lat, stop.lon], MAX_ZOOM_FOCUS)
  }, [fleet])

  // Cast to extended type to satisfy FleetMap's prop requirement
  const extFleet = fleet as Parameters<typeof FleetMap>[0]['fleetHook']

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Leaflet map (full viewport) */}
      <FleetMap
        fleetHook={extFleet}
        busSnapshots={fleet.busSnapshots}
        stopSnapshots={fleet.stopSnapshots}
      />

      {/* Status panel (top-right overlay) */}
      <StatusPanel
        stats={fleet.stats}
        loadingText={fleet.loadingText}
        initialized={fleet.initialized}
      />

      {/* Sidebars (slide in from left) */}
      <BusSidebar
        buses={fleet.busSnapshots}
        onSelectBus={handleSelectBus}
      />
      <StopSidebar
        stops={fleet.stopSnapshots}
        onSelectStop={handleSelectStop}
      />
    </div>
  )
}

export default App
