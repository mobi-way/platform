import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import L from 'leaflet'
import type { Stop, StopMarkerType } from '../types'
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../constants'

// ─── Leaflet icon factory ─────────────────────────────────────────────────────

function buildStopIcon(type: StopMarkerType): L.DivIcon {
  const colorMap: Record<StopMarkerType, string> = {
    neutral: '#3b82f6',
    origin:  '#22c55e',
    dest:    '#ef4444',
  }
  const scaleMap: Record<StopMarkerType, number> = {
    neutral: 1.0,
    origin:  1.3,
    dest:    1.3,
  }
  const zMap: Record<StopMarkerType, number> = {
    neutral: 100,
    origin:  1000,
    dest:    1000,
  }
  const color = colorMap[type]
  const scale = scaleMap[type]

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:30px;height:30px;
        background-color:${color};
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg) scale(${scale});
        box-shadow:-2px 2px 5px rgba(0,0,0,0.3);
        border:2px solid white;
        display:flex;justify-content:center;align-items:center;
      ">
        <div style="width:8px;height:8px;background:white;border-radius:50%;transform:rotate(45deg);"></div>
      </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    zIndexOffset: zMap[type],
  })
}

const userIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:16px;height:16px;
    background:#3b82f6;border:3px solid white;
    border-radius:50%;box-shadow:0 3px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

const destSearchIcon = L.divIcon({
  className: '',
  html: `<div style="font-size:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">📍</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
})

const busIcon = L.divIcon({
  className: '',
  html: `<div style="font-size:35px;filter:drop-shadow(0 3px 5px rgba(0,0,0,0.3));transition:all 0.5s linear;">🚌</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
})

// ─── Public imperative API ────────────────────────────────────────────────────

export interface MapViewHandle {
  setView: (lat: number, lon: number, zoom?: number) => void
  getMap: () => L.Map | null
  renderStops: (
    stops: Stop[],
    mode: 'origin' | 'dest',
    selectedOriginId?: string | number | null,
    onStopClick?: (stop: Stop) => void,
  ) => void
  clearStops: () => void
  setUserMarkerPos: (lat: number, lon: number) => void
  setSearchMarker: (lat: number, lon: number, label?: string) => void
  clearSearchMarker: () => void
  setStaticOriginMarker: (lat: number, lon: number) => void
  setStaticDestMarker: (lat: number, lon: number) => void
  clearStaticMarkers: () => void
  updateBusMarker: (lat: number, lon: number) => void
  clearBusMarker: () => void
  measureDistance: (a: [number, number], b: [number, number]) => number
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface MapViewProps {
  userLat: number
  userLon: number
  onUserMarkerDragEnd: (lat: number, lon: number) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

const MapView = forwardRef<MapViewHandle, MapViewProps>(
  ({ userLat, userLon, onUserMarkerDragEnd }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<L.Map | null>(null)
    const userMarkerRef = useRef<L.Marker | null>(null)
    const stopsLayerRef = useRef<L.LayerGroup | null>(null)
    const searchMarkerRef = useRef<L.Marker | null>(null)
    const busMarkerRef = useRef<L.Marker | null>(null)
    const staticLayerRef = useRef<L.LayerGroup | null>(null)

    // Initialise map once
    useEffect(() => {
      if (!containerRef.current || mapRef.current) return

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lon], DEFAULT_ZOOM)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      const stopsLayer = L.layerGroup().addTo(map)
      const staticLayer = L.layerGroup().addTo(map)
      stopsLayerRef.current = stopsLayer
      staticLayerRef.current = staticLayer

      const userMarker = L.marker([userLat, userLon], {
        icon: userIcon,
        draggable: true,
        zIndexOffset: 9999,
      }).addTo(map)

      userMarker.on('dragend', (e: L.LeafletEvent) => {
        const pos = (e.target as L.Marker).getLatLng()
        onUserMarkerDragEnd(pos.lat, pos.lng)
      })

      userMarkerRef.current = userMarker
      mapRef.current = map

      return () => {
        map.remove()
        mapRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Expose imperative API
    useImperativeHandle(ref, () => ({
      setView(lat, lon, zoom = DEFAULT_ZOOM) {
        mapRef.current?.setView([lat, lon], zoom, { animate: true, duration: 0.8 })
      },
      getMap() {
        return mapRef.current
      },
      renderStops(stops, mode, selectedOriginId, onStopClick) {
        const layer = stopsLayerRef.current
        if (!layer) return
        layer.clearLayers()
        stops.forEach(stop => {
          let type: StopMarkerType = 'neutral'
          if (mode === 'origin' && selectedOriginId != null &&
              String(stop.id) === String(selectedOriginId)) {
            type = 'origin'
          } else if (mode === 'dest') {
            type = 'dest'
          }
          const marker = L.marker([stop.lat, stop.lon], { icon: buildStopIcon(type) })
          if (onStopClick) marker.on('click', () => onStopClick(stop))
          marker.addTo(layer)
        })
      },
      clearStops() {
        stopsLayerRef.current?.clearLayers()
      },
      setUserMarkerPos(lat, lon) {
        userMarkerRef.current?.setLatLng([lat, lon])
      },
      setSearchMarker(lat, lon, label) {
        if (searchMarkerRef.current) {
          mapRef.current?.removeLayer(searchMarkerRef.current)
        }
        const m = L.marker([lat, lon], { icon: destSearchIcon })
        if (label) m.bindPopup(label).openPopup()
        m.addTo(mapRef.current!)
        searchMarkerRef.current = m
      },
      clearSearchMarker() {
        if (searchMarkerRef.current && mapRef.current) {
          mapRef.current.removeLayer(searchMarkerRef.current)
          searchMarkerRef.current = null
        }
      },
      setStaticOriginMarker(lat, lon) {
        staticLayerRef.current &&
          L.marker([lat, lon], { icon: buildStopIcon('origin') }).addTo(staticLayerRef.current)
      },
      setStaticDestMarker(lat, lon) {
        staticLayerRef.current &&
          L.marker([lat, lon], { icon: buildStopIcon('dest') }).addTo(staticLayerRef.current)
      },
      clearStaticMarkers() {
        staticLayerRef.current?.clearLayers()
      },
      updateBusMarker(lat, lon) {
        if (!mapRef.current) return
        if (!busMarkerRef.current) {
          busMarkerRef.current = L.marker([lat, lon], { icon: busIcon }).addTo(mapRef.current)
        } else {
          busMarkerRef.current.setLatLng([lat, lon])
        }
      },
      clearBusMarker() {
        if (busMarkerRef.current && mapRef.current) {
          mapRef.current.removeLayer(busMarkerRef.current)
          busMarkerRef.current = null
        }
      },
      measureDistance(a, b) {
        return mapRef.current?.distance(a, b) ?? 0
      },
    }))

    return (
      <div
        ref={containerRef}
        style={{ height: '100vh', width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
      />
    )
  },
)

MapView.displayName = 'MapView'
export default MapView
