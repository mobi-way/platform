// ── Shared constants ─────────────────────────────────────────────────────────
export const TIME_FACTOR = 0.156          // seconds per meter of distance
export const BUS_CAPACITY = 30           // max passengers per bus
export const FLEET_SIZE = 20             // total buses
export const GARAGE_LAT = -28.25144
export const GARAGE_LON = -52.39412
export const SOCKET_CHANNEL = 'coleurb_integracao'
export const ROUTE_CACHE_KEY = 'coleurb_routes_v1'
export const MOVEMENT_DELAY_MS = 20
export const MOVEMENT_DIVISOR = 2.0
export const OVERPASS_TIMEOUT_MS = 5000
export const API_QUEUE_DELAY_MS = 600

// ── Shared types ─────────────────────────────────────────────────────────────
export interface BusData {
  id: string
  lat: number
  lon: number
  fila: number
  ocupacao: number
}

export interface StopData {
  id: string
  lat: number
  lon: number
  nome?: string
}

export interface SystemUpdate {
  frota: BusData[]
  paradas: StopData[]
}

export interface TripOption {
  id: string
  lat: number
  lon: number
  tempoPickup: number
  tempoViagem: number
  totalTime: number
}

export interface TripOptionsRequest {
  origin: { lat: number; lon: number }
  dest: { lat: number; lon: number }
}

export interface TripRequest {
  busId: string
  origin: { lat: number; lon: number }
  dest: { lat: number; lon: number }
}

// ── Socket event names ────────────────────────────────────────────────────────
export const SOCKET_EVENTS = {
  JOIN_ROOM: 'join_room',
  SYSTEM_UPDATE: 'system_update',
  TRIP_OPTIONS_REQUEST: 'trip_options_request',
  TRIP_OPTIONS_RESPONSE: 'trip_options_response',
  TRIP_REQUEST: 'trip_request',
} as const

// ── Utility functions ─────────────────────────────────────────────────────────
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function distanceToTime(meters: number): number {
  return Math.round(meters * TIME_FACTOR)
}

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}min`
}
