import { useRef, useState, useCallback, useEffect } from 'react'
import type * as L from 'leaflet'
import {
  BUS_CAPACITY,
  FLEET_SIZE,
  GARAGE_LAT,
  GARAGE_LON,
  MOVEMENT_DIVISOR,
  MOVEMENT_DELAY_MS,
  CONVOY_BUS_RADIUS_M,
  CONVOY_STOP_RADIUS_M,
  CONVOY_REPULSION,
  DENSITY_RADIUS_M,
  DENSITY_PENALTY,
  VISIT_HISTORY_MAX,
  VISIT_HISTORY_PENALTY,
  STOP_DWELL_MS,
  ALIGHTING_PROBABILITY,
  MAX_ALIGHTING_FRACTION,
  BOARDING_REGEN_PROBABILITY,
  MAX_REGEN_PASSENGERS,
  BUS_LAUNCH_STAGGER_MS,
  CARDINAL_DIRECTIONS,
  SYSTEM_UPDATE_INTERVAL,
  TIME_FACTOR,
} from '../constants'
import type {
  Stop,
  BusRuntimeState,
  BusSnapshot,
  StopSnapshot,
  TripRequest,
  TripOptionsRequest,
  TripOption,
  RouteData,
  FleetStats,
} from '../types'
import { useRouteCache } from './useRouteCache'

// ── Haversine distance (metres) — used when Leaflet map is unavailable ────────
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Types internal to the engine ─────────────────────────────────────────────
interface BusEngineEntry {
  state: BusRuntimeState
  leafletMarker: L.Marker | null
}

interface StopWithMeta extends Stop {
  leafletMarker: L.Marker | null
}

interface AppTargetStop {
  id: string
  lat: number
  lon: number
  passengers: number
  isAppRequest: true
  type: 'pickup' | 'dropoff'
  isReserved: boolean
  lastVisit: number
}

type TargetStop = StopWithMeta | AppTargetStop

function isAppTarget(t: TargetStop): t is AppTargetStop {
  return (t as AppTargetStop).isAppRequest === true
}

// ── Hook public interface ─────────────────────────────────────────────────────
export interface UseFleetReturn {
  busSnapshots: BusSnapshot[]
  stopSnapshots: StopSnapshot[]
  stats: FleetStats
  loadingText: string
  initialized: boolean
  /** Called by FleetMap after Leaflet is ready, passing the map instance */
  startSimulation: (leafletMap: L.Map, stopsData: Stop[]) => void
  /** Called by useSocket when a trip_request arrives */
  handleTripRequest: (req: TripRequest) => void
  /** Called by useSocket when a trip_options_request arrives */
  handleTripOptionsRequest: (
    req: TripOptionsRequest,
    respond: (options: TripOption[]) => void,
  ) => void
  /** Returns the current snapshots for Socket.io emission */
  getSystemUpdate: () => { frota: BusSnapshot[]; paradas: StopSnapshot[] }
}

export function useFleet(): UseFleetReturn {
  const { getRoute } = useRouteCache()

  // ── Mutable engine state (never triggers re-render directly) ──────────────
  const mapRef        = useRef<L.Map | null>(null)
  const stopsRef      = useRef<StopWithMeta[]>([])
  const frotaRef      = useRef<Record<string, BusEngineEntry>>({})
  const fleetStatusRef = useRef<Record<number, number>>({}) // busNum → passengers
  const watchedBusRef = useRef<string | null>(null)
  const extremosRef   = useRef<StopWithMeta[] | null>(null)
  const initializedRef = useRef(false)

  // ── React state (drives UI re-renders at 1 Hz) ────────────────────────────
  const [busSnapshots,  setBusSnapshots]  = useState<BusSnapshot[]>([])
  const [stopSnapshots, setStopSnapshots] = useState<StopSnapshot[]>([])
  const [stats,         setStats]         = useState<FleetStats>({
    activeBuses: 0, passengersOnBuses: 0, passengersAtStops: 0,
    avgWaitMinutes: 0, avgWaitSeconds: 0,
  })
  const [loadingText,   setLoadingText]   = useState('Carregando e Otimizando Malha...')
  const [initialized,   setInitialized]   = useState(false)

  // ── Distance helper (uses Leaflet when map is ready) ─────────────────────
  const calcDist = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      if (mapRef.current) {
        return mapRef.current.distance([lat1, lon1], [lat2, lon2])
      }
      return haversineDistance(lat1, lon1, lat2, lon2)
    },
    [],
  )

  // ── setBusColor helper (operates on Leaflet marker DOM) ──────────────────
  const setBusColor = useCallback((marker: L.Marker, status: 'moving' | 'stopped' | 'full') => {
    const el = marker.getElement()
    if (!el) return
    el.classList.remove('bus-green', 'bus-full-red')
    if (status === 'stopped') el.classList.add('bus-green')
    else if (status === 'full') el.classList.add('bus-full-red')
  }, [])

  // ── CORE ALGORITHM: encontrarProximaParada ────────────────────────────────
  const encontrarProximaParada = useCallback(
    (currentLat: number, currentLon: number, visitHistory: string[], busID: string): TargetStop => {
      const busEntry = frotaRef.current[busID]

      // 1. Respect app priority queue
      if (busEntry?.state.priorityQueue.length > 0) {
        const target = busEntry.state.priorityQueue[0]
        return {
          id: 'APP_REQ',
          lat: target.lat,
          lon: target.lon,
          passengers: 1,
          isAppRequest: true,
          type: target.type,
          isReserved: false,
          lastVisit: Date.now(),
        }
      }

      // 2. Build claimed stop set (stops reserved by other buses)
      const claimedStops = new Set(
        Object.entries(frotaRef.current)
          .filter(([id]) => id !== busID)
          .map(([, entry]) => entry.state.currentTargetId)
          .filter((id): id is string => id !== null),
      )

      // 3. Score all stops
      const candidates = stopsRef.current
        .map((s, index) => {
          if (claimedStops.has(s.id) || s.isReserved) {
            return { index, score: -Infinity, id: s.id }
          }

          const dist = calcDist(currentLat, currentLon, s.lat, s.lon)
          const timeSinceVisit = (Date.now() - s.lastVisit) / 1000
          let score = Math.pow(timeSinceVisit, 2.0) - dist * 0.8

          if (visitHistory.includes(s.id)) score -= VISIT_HISTORY_PENALTY

          // Anti-convoy physics
          let densityCount = 0
          for (const [otherId, otherEntry] of Object.entries(frotaRef.current)) {
            if (otherId === busID) continue
            const otherLat = otherEntry.state.lat
            const otherLon = otherEntry.state.lon
            const distBetweenBuses = calcDist(currentLat, currentLon, otherLat, otherLon)
            const distStopToOther  = calcDist(s.lat, s.lon, otherLat, otherLon)

            if (distBetweenBuses < CONVOY_BUS_RADIUS_M && distStopToOther < CONVOY_STOP_RADIUS_M) {
              score -= CONVOY_REPULSION
            }
            if (distStopToOther < DENSITY_RADIUS_M) densityCount++
          }

          score -= densityCount * DENSITY_PENALTY
          return { index, score, id: s.id }
        })
        .filter((c) => c.score > -Infinity)
        .sort((a, b) => b.score - a.score)

      const nextIdx =
        candidates[0] !== undefined
          ? candidates[0].index
          : Math.floor(Math.random() * stopsRef.current.length)

      stopsRef.current[nextIdx].isReserved = true
      return stopsRef.current[nextIdx]
    },
    [calcDist],
  )

  // ── CORE ALGORITHM: moverOnibusFisico ─────────────────────────────────────
  const moverOnibusFisico = useCallback(
    async (
      busID: string,
      routeCoords: [number, number][],
    ): Promise<'ARRIVED' | 'REDIRECT'> => {
      const busEntry = frotaRef.current[busID]
      if (!busEntry) return 'ARRIVED'

      for (let i = 0; i < routeCoords.length - 1; i++) {
        // Check for app redirect before each segment
        const currentEntry = frotaRef.current[busID]
        if (
          currentEntry &&
          currentEntry.state.priorityQueue.length > 0 &&
          !currentEntry.state.activeTargetIsApp
        ) {
          return 'REDIRECT'
        }

        const [lon1, lat1] = routeCoords[i]
        const [lon2, lat2] = routeCoords[i + 1]
        const dist  = calcDist(lat1, lon1, lat2, lon2)
        const steps = Math.max(1, Math.ceil(dist / MOVEMENT_DIVISOR))

        for (let s = 0; s <= steps; s++) {
          const redirectedEntry = frotaRef.current[busID]
          if (
            redirectedEntry &&
            redirectedEntry.state.priorityQueue.length > 0 &&
            !redirectedEntry.state.activeTargetIsApp
          ) {
            return 'REDIRECT'
          }

          const r   = s / steps
          const lat = lat1 + (lat2 - lat1) * r
          const lon = lon1 + (lon2 - lon1) * r

          // Update engine state
          const entry = frotaRef.current[busID]
          if (entry) {
            entry.state.lat = lat
            entry.state.lon = lon
            // Move Leaflet marker if available
            if (entry.leafletMarker) {
              entry.leafletMarker.setLatLng([lat, lon])
              if (watchedBusRef.current === busID && mapRef.current) {
                mapRef.current.setView([lat, lon], mapRef.current.getZoom(), { animate: false })
              }
            }
          }

          await new Promise<void>((d) => setTimeout(d, MOVEMENT_DELAY_MS))
        }
      }

      return 'ARRIVED'
    },
    [calcDist],
  )

  // ── BUS CYCLE LOOP ────────────────────────────────────────────────────────
  const iniciarCicloOnibus = useCallback(
    async (num: number) => {
      const busID = `L${num}`
      const entry = frotaRef.current[busID]
      if (!entry) return

      let busPass     = 0
      const visitHistory: string[] = []

      // Operação Alvorada: assign one of the 4 cardinal extremes
      let targetStop: TargetStop | null =
        extremosRef.current
          ? extremosRef.current[(num - 1) % CARDINAL_DIRECTIONS]
          : null

      setLoadingText(`Operação Alvorada: Posicionando ${busID}...`)

      while (true) {
        // Pick next destination
        if (!targetStop) {
          targetStop = encontrarProximaParada(
            entry.state.lat, entry.state.lon, visitHistory, busID,
          )
        }

        entry.state.activeTargetIsApp = isAppTarget(targetStop)
        if (!isAppTarget(targetStop)) {
          entry.state.currentTargetId = targetStop.id
        }

        // Fetch OSRM route (retry until success)
        let routeData: RouteData | null = null
        while (!routeData) {
          routeData = await getRoute(
            entry.state.lat, entry.state.lon,
            targetStop.lat, targetStop.lon,
          )
          if (!routeData) {
            if (entry.leafletMarker) {
              entry.leafletMarker.setTooltipContent(`${busID}<br>Aguardando tráfego...`)
            }
            await new Promise<void>((r) => setTimeout(r, 2000))
          }
        }

        setLoadingText('Sistema Operacional')

        // Colour the bus
        if (entry.leafletMarker) {
          setBusColor(entry.leafletMarker, busPass >= BUS_CAPACITY ? 'full' : 'moving')
        }

        // Move
        const result = await moverOnibusFisico(busID, routeData.coordinates)

        if (result === 'REDIRECT') {
          if (!isAppTarget(targetStop)) {
            entry.state.currentTargetId = null
          }
          targetStop = null
          continue
        }

        // Alvorada completion check
        if (entry.state.modoAlvorada && !isAppTarget(targetStop)) {
          entry.state.modoAlvorada = false
          entry.state.currentTargetId = null
          ;(targetStop as StopWithMeta).isReserved = false
          targetStop = null
          continue
        }

        // ── Passenger boarding / alighting ──────────────────────────────────
        const maxAlighting = Math.floor(busPass * MAX_ALIGHTING_FRACTION)
        const alighting =
          busPass > 0 && Math.random() < ALIGHTING_PROBABILITY
            ? Math.floor(Math.random() * (maxAlighting + 1))
            : 0

        const available = BUS_CAPACITY - (busPass - alighting)
        const atStop    = targetStop.passengers ?? 0
        let boarding    = Math.min(Math.floor(Math.random() * (atStop + 1)), available)

        if (isAppTarget(targetStop)) {
          if (targetStop.type === 'pickup')  boarding  = Math.max(1, boarding)
          if (targetStop.type === 'dropoff') boarding  = 0
        }

        // Skip stop if no activity and not an app request
        if (alighting === 0 && boarding === 0 && !isAppTarget(targetStop)) {
          entry.state.currentTargetId = null
          ;(targetStop as StopWithMeta).isReserved = false
          targetStop = null
          await new Promise<void>((r) => setTimeout(r, 200))
          continue
        }

        // Dwell at stop
        if (entry.leafletMarker) setBusColor(entry.leafletMarker, 'stopped')

        if (!isAppTarget(targetStop)) {
          const st = targetStop as StopWithMeta
          st.lastVisit  = Date.now()
          st.isReserved = false
          entry.state.currentTargetId = null
          visitHistory.push(st.id)
          if (visitHistory.length > VISIT_HISTORY_MAX) visitHistory.shift()
        }

        busPass = Math.max(0, busPass - alighting + boarding)

        if (targetStop.passengers !== undefined) {
          targetStop.passengers = Math.max(0, targetStop.passengers - boarding)
        }

        if (!isAppTarget(targetStop) && Math.random() < BOARDING_REGEN_PROBABILITY) {
          targetStop.passengers =
            (targetStop.passengers ?? 0) + Math.floor(Math.random() * MAX_REGEN_PASSENGERS)
        }

        // Update engine state
        entry.state.passengers = busPass
        fleetStatusRef.current[num] = busPass

        // Update Leaflet tooltip
        if (entry.leafletMarker) {
          const feedbackHTML = `<div class="pax-row"><span class="pax-out">&#11015; -${alighting}</span><span class="pax-in">&#11014; +${boarding}</span></div>`
          entry.leafletMarker.setTooltipContent(
            `${busID}<br>Ocupação: ${busPass}/${BUS_CAPACITY}${feedbackHTML}`,
          )
          if (watchedBusRef.current === busID) entry.leafletMarker.openTooltip()
        }

        await new Promise<void>((r) => setTimeout(r, STOP_DWELL_MS))

        if (entry.leafletMarker) {
          entry.leafletMarker.setTooltipContent(`${busID}<br>Ocupação: ${busPass}/${BUS_CAPACITY}`)
          if (watchedBusRef.current !== busID) entry.leafletMarker.closeTooltip()
        }

        // Shift app priority queue
        if (isAppTarget(targetStop) && entry.state.priorityQueue.length > 0) {
          entry.state.priorityQueue.shift()
        }

        targetStop = null
      }
    },
    [encontrarProximaParada, moverOnibusFisico, getRoute, setBusColor],
  )

  // ── startSimulation — called by FleetMap once Leaflet is ready ────────────
  const startSimulation = useCallback(
    (leafletMap: L.Map, stopsData: Stop[]) => {
      if (initializedRef.current) return
      initializedRef.current = true

      mapRef.current = leafletMap

      // Store stops with null Leaflet markers (FleetMap owns the markers)
      stopsRef.current = stopsData.map((s) => ({ ...s, leafletMarker: null }))

      // Find cardinal extremes for Alvorada dispersal
      if (stopsData.length > 0) {
        let extN = stopsRef.current[0]
        let extS = stopsRef.current[0]
        let extE = stopsRef.current[0]
        let extW = stopsRef.current[0]
        stopsRef.current.forEach((s) => {
          if (s.lat > extN.lat) extN = s
          if (s.lat < extS.lat) extS = s
          if (s.lon > extE.lon) extE = s
          if (s.lon < extW.lon) extW = s
        })
        extremosRef.current = [extN, extE, extS, extW]
      }

      // Initialise fleet registry
      for (let i = 1; i <= FLEET_SIZE; i++) {
        const busID = `L${i}`
        fleetStatusRef.current[i] = 0
        frotaRef.current[busID] = {
          leafletMarker: null,
          state: {
            id: busID,
            lat: GARAGE_LAT,
            lon: GARAGE_LON,
            passengers: 0,
            priorityQueue: [],
            activeTargetIsApp: false,
            currentTargetId: null,
            modoAlvorada: true,
          },
        }
      }

      // Stagger bus launches
      for (let i = 1; i <= FLEET_SIZE; i++) {
        setTimeout(() => {
          iniciarCicloOnibus(i)
        }, i * BUS_LAUNCH_STAGGER_MS)
      }

      setInitialized(true)
    },
    [iniciarCicloOnibus],
  )

  // ── Register Leaflet marker (called by FleetMap component) ────────────────
  const registerBusMarker = useCallback((busID: string, marker: L.Marker) => {
    const entry = frotaRef.current[busID]
    if (entry) entry.leafletMarker = marker

    // Watch on dblclick
    marker.on('dblclick', (e) => {
      // @ts-expect-error Leaflet DomEvent
      L.DomEvent?.stopPropagation(e)
      watchedBusRef.current = busID
      if (mapRef.current) {
        mapRef.current.setView(marker.getLatLng(), mapRef.current.getZoom())
      }
      marker.openTooltip()
    })
  }, [])

  // ── handleTripRequest ─────────────────────────────────────────────────────
  const handleTripRequest = useCallback((req: TripRequest) => {
    const entry = frotaRef.current[req.busId]
    if (!entry) return
    entry.state.priorityQueue = [
      { lat: req.origin.lat, lon: req.origin.lon, type: 'pickup' },
      { lat: req.dest.lat,   lon: req.dest.lon,   type: 'dropoff' },
    ]
    entry.state.activeTargetIsApp = false
    console.log(`[Fleet] ${req.busId} assigned app trip`)
  }, [])

  // ── handleTripOptionsRequest ──────────────────────────────────────────────
  const handleTripOptionsRequest = useCallback(
    async (
      req: TripOptionsRequest,
      respond: (options: TripOption[]) => void,
    ) => {
      const { origin, dest } = req

      // Gather candidate buses (within 6 km, not full)
      const candidates = Object.entries(frotaRef.current)
        .map(([id, entry]) => {
          const busNum = parseInt(id.replace('L', ''), 10)
          if ((fleetStatusRef.current[busNum] ?? 0) >= BUS_CAPACITY) return null
          const dist = calcDist(entry.state.lat, entry.state.lon, origin.lat, origin.lon)
          if (dist > 6000) return null
          return { id, entry, distApx: dist }
        })
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .sort((a, b) => a.distApx - b.distApx)
        .slice(0, 6)

      // Get trip route distance for ETA
      const tripRoute = await getRoute(origin.lat, origin.lon, dest.lat, dest.lon)
      const tripSeconds = tripRoute ? Math.ceil(tripRoute.distance * TIME_FACTOR) : 0

      const options: TripOption[] = []

      for (const cand of candidates) {
        await new Promise<void>((r) => setTimeout(r, 600))
        const pickupRoute = await getRoute(
          cand.entry.state.lat, cand.entry.state.lon,
          origin.lat, origin.lon,
        )
        if (!pickupRoute) continue

        let tPickup = Math.ceil(pickupRoute.distance * TIME_FACTOR)
        if (cand.entry.state.priorityQueue.length > 0) tPickup += 60

        options.push({
          id:          cand.id,
          lat:         cand.entry.state.lat,
          lon:         cand.entry.state.lon,
          tempoPickup: Math.max(5, tPickup),
          tempoViagem: tripSeconds,
          totalTime:   tPickup + tripSeconds,
        })
      }

      options.sort((a, b) => a.totalTime - b.totalTime)
      respond(options)
    },
    [calcDist, getRoute],
  )

  // ── Snapshot publisher — drives UI and Socket.io emission at 1 Hz ────────
  useEffect(() => {
    const interval = setInterval(() => {
      const busList: BusSnapshot[] = Object.values(frotaRef.current).map((entry) => ({
        id:          entry.state.id,
        lat:         entry.state.lat,
        lon:         entry.state.lon,
        passengers:  entry.state.passengers,
        ocupacao:    entry.state.passengers,   // alias for driver app
        capacity:    BUS_CAPACITY,
        queueLength: entry.state.priorityQueue.length,
        fila:        entry.state.priorityQueue.length,  // alias for driver app
      }))

      const stopList: StopSnapshot[] = stopsRef.current.map((s) => ({
        id:         s.id,
        lat:        s.lat,
        lon:        s.lon,
        passengers: s.passengers,
      }))

      setBusSnapshots(busList)
      setStopSnapshots(stopList)

      // Compute stats
      const activeBuses       = busList.length
      const passengersOnBuses = busList.reduce((acc, b) => acc + b.passengers, 0)
      const passengersAtStops = stopList.reduce((acc, s) => acc + s.passengers, 0)
      const baseWait  = 15
      const reduction = 0.5
      const rawWait   = Math.max(3, baseWait - activeBuses * reduction) + (Math.random() * 0.5 - 0.25)
      setStats({
        activeBuses,
        passengersOnBuses,
        passengersAtStops,
        avgWaitMinutes: Math.floor(rawWait),
        avgWaitSeconds: Math.floor((rawWait - Math.floor(rawWait)) * 60),
      })
    }, SYSTEM_UPDATE_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  const getSystemUpdate = useCallback(() => {
    const frota: BusSnapshot[] = Object.values(frotaRef.current).map((entry) => ({
      id:          entry.state.id,
      lat:         entry.state.lat,
      lon:         entry.state.lon,
      passengers:  entry.state.passengers,
      ocupacao:    entry.state.passengers,
      capacity:    BUS_CAPACITY,
      queueLength: entry.state.priorityQueue.length,
      fila:        entry.state.priorityQueue.length,
    }))
    const paradas: StopSnapshot[] = stopsRef.current.map((s) => ({
      id: s.id, lat: s.lat, lon: s.lon, passengers: s.passengers,
    }))
    return { frota, paradas }
  }, [])

  return {
    busSnapshots,
    stopSnapshots,
    stats,
    loadingText,
    initialized,
    startSimulation,
    handleTripRequest,
    handleTripOptionsRequest,
    getSystemUpdate,
    // expose for FleetMap
    _registerBusMarker: registerBusMarker,
    _frotaRef: frotaRef,
    _watchedBusRef: watchedBusRef,
    _mapRef: mapRef,
  } as UseFleetReturn & {
    _registerBusMarker: typeof registerBusMarker
    _frotaRef: typeof frotaRef
    _watchedBusRef: typeof watchedBusRef
    _mapRef: typeof mapRef
  }
}
