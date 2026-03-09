import { useRef, useCallback, useEffect } from 'react'
import MapView, { type MapViewHandle } from './components/MapView'
import OriginScreen from './components/OriginScreen'
import DestinationScreen from './components/DestinationScreen'
import OptionsScreen from './components/OptionsScreen'
import TrackingScreen from './components/TrackingScreen'
import { useTrip } from './hooks/useTrip'
import { useSocket } from './hooks/useSocket'
import type { LocalPF } from './types'
import { DEFAULT_ZOOM, NEARBY_RADIUS_M } from './constants'

export default function App() {
  const mapRef = useRef<MapViewHandle>(null)
  const {
    state,
    nearbyStops,
    activeBus,
    onSystemUpdate,
    onTripOptionsResponse,
    setConnected,
    setUserPosition,
    selectOrigin,
    confirmOrigin,
    setSearchPoint,
    selectDest,
    selectBus,
    startTrip,
    confirmBoarding,
    confirmAlighting,
    cancel,
    goBack,
  } = useTrip()

  const { requestTripOptions, requestTrip } = useSocket({
    onSystemUpdate,
    onTripOptionsResponse,
    onConnect: () => setConnected(true),
    onDisconnect: () => setConnected(false),
  })

  // ── Re-render stops whenever paradas, phase, or origin selection changes ──
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (state.phase === 'choosing_origin') {
      const nearby = nearbyStops(state.userLat, state.userLon, state.paradas, NEARBY_RADIUS_M)
      map.renderStops(nearby, 'origin', state.originStop?.id ?? null, (stop) => {
        selectOrigin(stop)
      })
    } else if (state.phase === 'choosing_dest') {
      const centerLat = state.searchLat ?? state.userLat
      const centerLon = state.searchLon ?? state.userLon
      const nearby = nearbyStops(centerLat, centerLon, state.paradas, NEARBY_RADIUS_M)
      map.renderStops(nearby, 'dest', null, (stop) => {
        selectDest(stop)
      })
    } else {
      map.clearStops()
    }
  }, [
    state.phase,
    state.paradas,
    state.userLat,
    state.userLon,
    state.searchLat,
    state.searchLon,
    state.originStop,
    nearbyStops,
    selectOrigin,
    selectDest,
  ])

  // ── Handle transition to tracking ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || state.phase !== 'tracking') return
    if (!state.originStop || !state.destStop) return

    map.clearStops()
    map.clearSearchMarker()
    map.clearStaticMarkers()
    map.setStaticOriginMarker(state.originStop.lat, state.originStop.lon)
    map.setStaticDestMarker(state.destStop.lat, state.destStop.lon)
  }, [state.phase, state.originStop, state.destStop])

  // ── On cancel / alighting reset — restore user marker and stops ───────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || state.phase !== 'choosing_origin') return
    map.clearBusMarker()
    map.clearStaticMarkers()
    map.clearSearchMarker()
    map.setUserMarkerPos(state.userLat, state.userLon)
    map.setView(state.userLat, state.userLon, DEFAULT_ZOOM)
  }, [state.phase, state.userLat, state.userLon])

  // ── Callbacks ──────────────────────────────────────────────────────────────

  const handleUserDragEnd = useCallback((lat: number, lon: number) => {
    setUserPosition(lat, lon)
  }, [setUserPosition])

  const handleConfirmOrigin = useCallback(() => {
    mapRef.current?.clearStops()
    confirmOrigin()
  }, [confirmOrigin])

  const handleSearchSelect = useCallback((local: LocalPF) => {
    setSearchPoint(local.lat, local.lon)
    mapRef.current?.setSearchMarker(local.lat, local.lon, local.nome)
    mapRef.current?.setView(local.lat, local.lon, 16)
  }, [setSearchPoint])

  const handleRequestRoutes = useCallback(() => {
    if (!state.originStop || !state.destStop) return
    requestTripOptions({
      origin: { lat: state.originStop.lat, lon: state.originStop.lon },
      dest:   { lat: state.destStop.lat,   lon: state.destStop.lon   },
    })
  }, [state.originStop, state.destStop, requestTripOptions])

  const handleStartTrip = useCallback(() => {
    if (!state.selectedBus || !state.originStop || !state.destStop) return
    startTrip()
    requestTrip({
      busId:  state.selectedBus.id,
      origin: { lat: state.originStop.lat, lon: state.originStop.lon },
      dest:   { lat: state.destStop.lat,   lon: state.destStop.lon   },
    })
  }, [state.selectedBus, state.originStop, state.destStop, startTrip, requestTrip])

  const handleConfirmAlighting = useCallback(() => {
    mapRef.current?.clearBusMarker()
    mapRef.current?.clearStaticMarkers()
    confirmAlighting()
  }, [confirmAlighting])

  const handleCancel = useCallback(() => {
    mapRef.current?.clearBusMarker()
    mapRef.current?.clearStaticMarkers()
    mapRef.current?.clearSearchMarker()
    cancel()
  }, [cancel])

  const handleBusPositionUpdate = useCallback((lat: number, lon: number) => {
    mapRef.current?.updateBusMarker(lat, lon)
  }, [])

  const handleZoomRequest = useCallback((lat: number, lon: number, zoom: number) => {
    mapRef.current?.setView(lat, lon, zoom)
  }, [])

  const measureDistance = useCallback(
    (a: [number, number], b: [number, number]): number => {
      return mapRef.current?.measureDistance(a, b) ?? 0
    },
    [],
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-100">
      {/* Leaflet map — always mounted, never conditionally rendered */}
      <MapView
        ref={mapRef}
        userLat={state.userLat}
        userLon={state.userLon}
        onUserMarkerDragEnd={handleUserDragEnd}
      />

      {/* Screen overlays — only the active screen renders */}
      {state.phase === 'choosing_origin' && (
        <OriginScreen
          connected={state.connected}
          originStop={state.originStop}
          onConfirm={handleConfirmOrigin}
        />
      )}

      {state.phase === 'choosing_dest' && (
        <DestinationScreen
          destStop={state.destStop}
          onBack={goBack}
          onSearchSelect={handleSearchSelect}
          onRequestRoutes={handleRequestRoutes}
        />
      )}

      {state.phase === 'options' && state.originStop && state.destStop && (
        <OptionsScreen
          options={state.options}
          selectedBus={state.selectedBus}
          originStop={state.originStop}
          destStop={state.destStop}
          onSelectBus={selectBus}
          onConfirm={handleStartTrip}
          onBack={goBack}
          measureDistance={measureDistance}
        />
      )}

      {state.phase === 'tracking' && state.originStop && state.destStop && (
        <TrackingScreen
          activeBus={activeBus}
          selectedBusId={state.selectedBus?.id ?? null}
          originStop={state.originStop}
          destStop={state.destStop}
          tripStage={state.tripStage}
          onConfirmBoarding={confirmBoarding}
          onConfirmAlighting={handleConfirmAlighting}
          onCancel={handleCancel}
          measureDistance={measureDistance}
          onBusPositionUpdate={handleBusPositionUpdate}
          onZoomRequest={handleZoomRequest}
        />
      )}
    </div>
  )
}
