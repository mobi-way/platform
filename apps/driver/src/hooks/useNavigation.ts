import { useRef, useCallback } from 'react'
import L from 'leaflet'
import type { BusData, StopData, NavigationState, PassengerDelta } from '../types'

function calcularAngulo(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dx = lon2 - lon1
  const dy = lat2 - lat1
  const theta = Math.atan2(dx, dy)
  return theta * (180 / Math.PI)
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function encontrarProximaParada(
  lat: number,
  lon: number,
  bearing: number | null,
  stops: StopData[],
): StopData | null {
  let minScore = Infinity
  let closest: StopData | null = null

  for (const s of stops) {
    const d = haversineMeters(lat, lon, s.lat, s.lon)
    if (d < 35) continue

    let score = d
    if (bearing !== null) {
      const angleToStop = calcularAngulo(lat, lon, s.lat, s.lon)
      let diff = Math.abs(bearing - angleToStop)
      if (diff > 180) diff = 360 - diff
      if (diff < 45) score *= 0.1
      else if (diff < 90) score *= 0.5
      else score *= 10
    }

    if (score < minScore) {
      minScore = score
      closest = s
    }
  }

  if (!closest && stops.length > 0) closest = stops[0]
  return closest
}

async function fetchOSRMRoute(
  startLat: number, startLon: number,
  endLat: number, endLon: number,
): Promise<L.LatLng[]> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`

  const res = await fetch(url)
  const data = await res.json()

  if (data.routes && data.routes.length > 0) {
    return (data.routes[0].geometry.coordinates as [number, number][]).map(
      ([lon, lat]) => L.latLng(lat, lon),
    )
  }
  return []
}

interface UseNavigationOptions {
  mapRef: React.MutableRefObject<L.Map | null>
  onNavigationUpdate: (state: NavigationState) => void
  onPassengerDelta: (delta: PassengerDelta) => void
}

export function useNavigation({ mapRef, onNavigationUpdate, onPassengerDelta }: UseNavigationOptions) {
  const lastPosRef = useRef<[number, number] | null>(null)
  const bearingRef = useRef<number | null>(null)
  const stopMarkersRef = useRef<L.CircleMarker[]>([])
  const stopMarkersDrawnRef = useRef(false)
  const targetStopRef = useRef<StopData | null>(null)
  const stopAnnouncedRef = useRef(false)
  const arrivedAnnouncedRef = useRef(false)
  const lastStopIdForRouteRef = useRef<string | null>(null)
  const routePolylineRef = useRef<L.Polyline | null>(null)
  const currentFullPathRef = useRef<L.LatLng[]>([])
  const lastOcupacaoRef = useRef<number | null>(null)

  const atualizarLinhaTraseira = useCallback(
    async (busLat: number, busLon: number, nextStop: StopData) => {
      const map = mapRef.current
      if (!map) return

      if (lastStopIdForRouteRef.current !== nextStop.id) {
        lastStopIdForRouteRef.current = nextStop.id
        try {
          const path = await fetchOSRMRoute(busLat, busLon, nextStop.lat, nextStop.lon)
          currentFullPathRef.current = path
          if (routePolylineRef.current) map.removeLayer(routePolylineRef.current)
          routePolylineRef.current = L.polyline(path, {
            color: '#3b82f6', weight: 12, opacity: 0.85,
            lineCap: 'round', lineJoin: 'round',
          }).addTo(map)
        } catch { /* OSRM unavailable */ }
      }

      if (routePolylineRef.current && currentFullPathRef.current.length > 0) {
        const currentPos = L.latLng(busLat, busLon)
        let closestIdx = 0
        let minDist = Infinity
        currentFullPathRef.current.forEach((pt, i) => {
          const d = map.distance(currentPos, pt)
          if (d < minDist) { minDist = d; closestIdx = i }
        })
        const trimmed = [currentPos, ...currentFullPathRef.current.slice(closestIdx)]
        routePolylineRef.current.setLatLngs(trimmed)
      }
    },
    [mapRef],
  )

  const drawStopMarkers = useCallback((stops: StopData[]) => {
    const map = mapRef.current
    if (!map || stopMarkersDrawnRef.current) return
    stops.forEach((s) => {
      const marker = L.circleMarker([s.lat, s.lon], {
        radius: 8, fillColor: '#ef4444', color: '#fff',
        weight: 3, opacity: 1, fillOpacity: 1,
      }).addTo(map)
      stopMarkersRef.current.push(marker)
    })
    stopMarkersDrawnRef.current = true
  }, [mapRef])

  const processUpdate = useCallback(
    (busData: BusData, stops: StopData[]) => {
      const map = mapRef.current
      if (!map) return

      drawStopMarkers(stops)

      const { lat, lon, ocupacao } = busData
      map.setView([lat, lon], 18, { animate: false })

      let speed = 0
      if (lastPosRef.current) {
        const dx = lon - lastPosRef.current[1]
        const dy = lat - lastPosRef.current[0]
        const movedDist = Math.sqrt(dx * dx + dy * dy)
        if (movedDist > 0.00002) {
          bearingRef.current = calcularAngulo(
            lastPosRef.current[0], lastPosRef.current[1], lat, lon,
          )
          speed = Math.floor(Math.random() * (45 - 30) + 30)
        }
      }

      if (!targetStopRef.current) {
        targetStopRef.current = encontrarProximaParada(lat, lon, bearingRef.current, stops)
        stopAnnouncedRef.current = false
        arrivedAnnouncedRef.current = false
      }

      let navPhase: NavigationState['phase'] = 'idle'
      let distToStop = Infinity

      if (targetStopRef.current) {
        distToStop = haversineMeters(lat, lon, targetStopRef.current.lat, targetStopRef.current.lon)

        if (!stopAnnouncedRef.current && distToStop > 25) {
          stopAnnouncedRef.current = true
          navPhase = 'approaching'
        } else if (stopAnnouncedRef.current && !arrivedAnnouncedRef.current) {
          navPhase = 'approaching'
        }

        if (!arrivedAnnouncedRef.current) {
          void atualizarLinhaTraseira(lat, lon, targetStopRef.current)
        }

        if (distToStop <= 25 && speed === 0) {
          navPhase = 'arrived'
          if (lastOcupacaoRef.current !== null && ocupacao !== lastOcupacaoRef.current && !arrivedAnnouncedRef.current) {
            const delta = ocupacao - lastOcupacaoRef.current
            const boarding = delta > 0 ? delta : 0
            const alighting = delta < 0 ? Math.abs(delta) : 0
            arrivedAnnouncedRef.current = true
            onPassengerDelta({ boarding, alighting, total: ocupacao, stopId: targetStopRef.current.id })
          }
        }

        if (arrivedAnnouncedRef.current && distToStop > 35 && speed > 0) {
          targetStopRef.current = null
          if (routePolylineRef.current) {
            map.removeLayer(routePolylineRef.current)
            routePolylineRef.current = null
          }
          currentFullPathRef.current = []
          lastStopIdForRouteRef.current = null
        }
      }

      if (ocupacao !== undefined) lastOcupacaoRef.current = ocupacao
      lastPosRef.current = [lat, lon]

      onNavigationUpdate({
        phase: navPhase,
        targetStop: targetStopRef.current,
        distanceMeters: isFinite(distToStop) ? Math.floor(distToStop) : 0,
        bearing: bearingRef.current,
        speed,
        announced: stopAnnouncedRef.current,
        arrivedAnnounced: arrivedAnnouncedRef.current,
      })
    },
    [mapRef, drawStopMarkers, atualizarLinhaTraseira, onPassengerDelta, onNavigationUpdate],
  )

  return { processUpdate, bearingRef }
}
