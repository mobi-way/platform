// ── Stop ──────────────────────────────────────────────────────────────────────
export interface Stop {
  id: string          // "P1", "P2", …
  lat: number
  lon: number
  passengers: number
  lastVisit: number   // Date.now() timestamp
  isReserved: boolean
}

// ── Bus (runtime state, mutable by simulation engine) ────────────────────────
export interface BusRuntimeState {
  id: string               // "L1" … "L20"
  lat: number
  lon: number
  passengers: number
  priorityQueue: PriorityTarget[]
  activeTargetIsApp: boolean
  currentTargetId: string | null
  modoAlvorada: boolean
}

// ── Priority target (from app trip requests) ─────────────────────────────────
export interface PriorityTarget {
  lat: number
  lon: number
  type: 'pickup' | 'dropoff'
}

// ── Serialisable bus snapshot for Socket.io / UI ─────────────────────────────
export interface BusSnapshot {
  id: string
  lat: number
  lon: number
  passengers: number
  capacity: number
  queueLength: number
}

// ── Stop snapshot for Socket.io / UI ─────────────────────────────────────────
export interface StopSnapshot {
  id: string
  lat: number
  lon: number
  passengers: number
}

// ── system_update payload emitted every 500 ms ───────────────────────────────
export interface SystemUpdate {
  frota: BusSnapshot[]
  paradas: StopSnapshot[]
}

// ── Trip option returned in trip_options_response ────────────────────────────
export interface TripOption {
  id: string       // busId
  lat: number
  lon: number
  tempoPickup: number   // seconds
  tempoViagem: number   // seconds
  totalTime: number     // seconds
}

// ── trip_request payload received from app client ────────────────────────────
export interface TripRequest {
  busId: string
  origin: { lat: number; lon: number }
  dest:   { lat: number; lon: number }
}

// ── trip_options_request payload received from app client ────────────────────
export interface TripOptionsRequest {
  origin: { lat: number; lon: number }
  dest:   { lat: number; lon: number }
}

// ── Cached OSRM route data ────────────────────────────────────────────────────
export interface RouteData {
  coordinates: [number, number][]   // [lon, lat] pairs (GeoJSON order)
  distance: number                  // metres
}

// ── Dashboard stats ───────────────────────────────────────────────────────────
export interface FleetStats {
  activeBuses: number
  passengersOnBuses: number
  passengersAtStops: number
  avgWaitMinutes: number
  avgWaitSeconds: number
}
