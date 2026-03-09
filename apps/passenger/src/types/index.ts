// ─── Domain primitives ────────────────────────────────────────────────────────

export interface LatLon {
  lat: number
  lon: number
}

export interface Stop {
  id: string | number
  lat: number
  lon: number
  nome?: string
}

export interface Bus {
  id: string | number
  lat: number
  lon: number
  linha?: string
}

export interface TripOption {
  id: string | number
  lat: number
  lon: number
  linha?: string
  distToPickup?: number
  distTrip?: number
}

export interface LocalPF {
  nome: string
  lat: number
  lon: number
}

// ─── Socket.io payloads ────────────────────────────────────────────────────────

export interface SystemUpdatePayload {
  frota: Bus[]
  paradas: Stop[]
}

export interface TripOptionsRequestPayload {
  origin: LatLon
  dest: LatLon
}

export interface TripOptionsResponsePayload {
  options: TripOption[]
}

export interface TripRequestPayload {
  busId: string | number
  origin: LatLon
  dest: LatLon
}

// ─── App state machine ─────────────────────────────────────────────────────────

export type Phase =
  | 'choosing_origin'
  | 'choosing_dest'
  | 'options'
  | 'tracking'

export type TripStage = 'pickup' | 'trip'

export interface TripState {
  phase: Phase
  tripStage: TripStage
  userLat: number
  userLon: number
  originStop: Stop | null
  destStop: Stop | null
  searchLat: number | null
  searchLon: number | null
  selectedBus: TripOption | null
  options: TripOption[]
  frota: Bus[]
  paradas: Stop[]
  connected: boolean
}

// ─── Map helpers ───────────────────────────────────────────────────────────────

export type StopMarkerType = 'origin' | 'dest' | 'neutral'

export interface EtaInfo {
  totalSeconds: number
  minutes: number
  seconds: number
  formatted: string
}
