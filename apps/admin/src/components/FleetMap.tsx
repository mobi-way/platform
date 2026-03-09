import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { BusSnapshot, StopSnapshot } from '../types'
import type { UseFleetReturn } from '../hooks/useFleet'
import {
  GARAGE_LAT,
  GARAGE_LON,
  INITIAL_ZOOM,
  MAX_ZOOM_FOCUS,
  FLEET_SIZE,
  BUS_CAPACITY,
} from '../constants'
import { useOverpass } from '../hooks/useOverpass'

// Resolve icon paths — Vite puts public assets at the root
const BUS_ICON_URL  = '/onibus.png'
const STOP_ICON_URL = '/ponteiro-de-parada-de-onibus.png'

function createBusIcon(): L.Icon {
  return L.icon({
    iconUrl:    BUS_ICON_URL,
    iconSize:   [35, 35],
    iconAnchor: [17, 17],
    className:  'bus-icon-style',
  })
}

const busStopIcon = L.icon({
  iconUrl:    STOP_ICON_URL,
  iconSize:   [26, 35],
  iconAnchor: [13, 35],
  className:  'stop-blue',
})

interface FleetMapProps {
  fleetHook: UseFleetReturn & {
    _registerBusMarker: (busID: string, marker: L.Marker) => void
    _watchedBusRef: React.MutableRefObject<string | null>
  }
  busSnapshots: BusSnapshot[]
  stopSnapshots: StopSnapshot[]
}

const FleetMap: React.FC<FleetMapProps> = ({ fleetHook, stopSnapshots }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef          = useRef<L.Map | null>(null)
  const busMarkersRef   = useRef<Record<string, L.Marker>>({})
  const stopMarkersRef  = useRef<Record<string, L.Marker>>({})
  const stopTooltipRefs = useRef<Record<string, L.Tooltip>>({})
  const { fetchStops } = useOverpass()

  // ── Mount Leaflet map once ───────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current).setView(
      [GARAGE_LAT, GARAGE_LON],
      INITIAL_ZOOM,
    )
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    // Garage marker
    const garageIcon = L.divIcon({
      className: 'garage-marker-icon',
      html: '🏢',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    })
    L.marker([GARAGE_LAT, GARAGE_LON], { icon: garageIcon })
      .addTo(map)
      .bindPopup('<b>GARAGEM COLEURB</b><br>Ponto de Partida')

    // Stop watching a bus when the user drags the map
    map.on('dragstart', () => {
      fleetHook._watchedBusRef.current = null
    })

    // ── Custom controls ──────────────────────────────────────────────────
    const MenuControl = L.Control.extend({
      onAdd(): HTMLElement {
        const div = L.DomUtil.create('div')

        const btnP = L.DomUtil.create('div', 'custom-control', div)
        btnP.innerHTML = 'PARADAS'
        btnP.onclick = (e) => {
          L.DomEvent.stopPropagation(e)
          document.getElementById('sidebar-stops')?.classList.toggle('active')
          document.getElementById('sidebar-buses')?.classList.remove('active')
        }

        const btnO = L.DomUtil.create('div', 'custom-control', div)
        btnO.innerHTML = 'ÔNIBUS'
        btnO.onclick = (e) => {
          L.DomEvent.stopPropagation(e)
          document.getElementById('sidebar-buses')?.classList.toggle('active')
          document.getElementById('sidebar-stops')?.classList.remove('active')
        }

        const btnReset = L.DomUtil.create('div', 'custom-control reset-btn', div)
        btnReset.innerHTML = 'VISÃO GERAL'
        btnReset.onclick = (e) => {
          L.DomEvent.stopPropagation(e)
          fleetHook._watchedBusRef.current = null
          map.setView([GARAGE_LAT, GARAGE_LON], INITIAL_ZOOM)
        }

        return div
      },
    })
    map.addControl(new MenuControl({ position: 'topleft' }))

    // ── Fetch stops and start simulation ────────────────────────────────
    const bounds = map.getBounds()
    fetchStops(
      bounds.getSouth(),
      bounds.getWest(),
      bounds.getNorth(),
      bounds.getEast(),
    ).then((stops) => {
      if (!stops.length) return

      // Place stop markers
      stops.forEach((stop) => {
        const marker = L.marker([stop.lat, stop.lon], { icon: busStopIcon }).addTo(map)
        const tooltip = L.tooltip({ direction: 'top' }).setContent(
          `${stop.id}<br>Passageiros: ${stop.passengers}`,
        )
        marker.bindTooltip(tooltip)

        marker.on('dblclick', (e) => {
          L.DomEvent.stopPropagation(e)
          fleetHook._watchedBusRef.current = null
          map.setView([stop.lat, stop.lon], MAX_ZOOM_FOCUS)
          marker.openTooltip()
        })

        stopMarkersRef.current[stop.id]  = marker
        stopTooltipRefs.current[stop.id] = tooltip
      })

      // Create bus markers at garage
      for (let i = 1; i <= FLEET_SIZE; i++) {
        const busID = `L${i}`
        const marker = L.marker([GARAGE_LAT, GARAGE_LON], { icon: createBusIcon() }).addTo(map)
        marker.bindTooltip(`${busID}<br>Ocupação: 0/${BUS_CAPACITY}`, { direction: 'top' })
        busMarkersRef.current[busID] = marker
        fleetHook._registerBusMarker(busID, marker)

        marker.on('click', () => {
          fleetHook._watchedBusRef.current = busID
          map.setView(marker.getLatLng(), MAX_ZOOM_FOCUS)
          marker.openTooltip()
        })
      }

      // Hand off to simulation engine
      fleetHook.startSimulation(map, stops)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Update stop tooltips when passenger counts change ───────────────────
  useEffect(() => {
    stopSnapshots.forEach((snap) => {
      const tt = stopTooltipRefs.current[snap.id]
      if (tt) tt.setContent(`${snap.id}<br>Passageiros: ${snap.passengers}`)
    })
  }, [stopSnapshots])

  return (
    <div
      id="map-container"
      ref={mapContainerRef}
      className="h-screen w-full"
      style={{ zIndex: 1 }}
    />
  )
}

export default FleetMap
