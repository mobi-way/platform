// ── Simulation physics ────────────────────────────────────────────────────────
export const TIME_FACTOR      = 0.156   // seconds per metre (ETA calculation)
export const BUS_CAPACITY     = 30
export const FLEET_SIZE       = 20
export const MOVEMENT_DIVISOR = 2.0     // metres per step
export const MOVEMENT_DELAY_MS = 20     // ms per animation frame

// ── Map / geography ───────────────────────────────────────────────────────────
export const GARAGE_LAT   = -28.25144
export const GARAGE_LON   = -52.39412
export const INITIAL_ZOOM  = 14
export const MAX_ZOOM_FOCUS = 18
export const OVERPASS_BBOX_PADDING = 0.08  // degrees added to each side

// ── Routing ───────────────────────────────────────────────────────────────────
export const OSRM_BASE_URL        = 'https://router.project-osrm.org'
export const OSRM_REQUEST_DELAY_MS = 600   // rate-limit between OSRM calls
export const OSRM_TIMEOUT_MS       = 5000
export const ROUTE_CACHE_KEY       = 'coleurb_routes_v1'

// ── Overpass ──────────────────────────────────────────────────────────────────
export const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

// ── Socket.io ─────────────────────────────────────────────────────────────────
export const SOCKET_URL            = 'http://localhost:3001'
export const SYSTEM_UPDATE_INTERVAL = 500   // ms

// ── Anti-convoy physics ───────────────────────────────────────────────────────
export const CONVOY_BUS_RADIUS_M   = 400    // if two buses are closer than this…
export const CONVOY_STOP_RADIUS_M  = 800    // …avoid stops within this radius of the other
export const CONVOY_REPULSION      = 200000 // score penalty
export const DENSITY_RADIUS_M      = 2000   // density count radius
export const DENSITY_PENALTY       = 80000  // per neighbouring bus
export const VISIT_HISTORY_MAX     = 20     // recent stops to remember per bus
export const VISIT_HISTORY_PENALTY = 50000  // score penalty for recently visited

// ── Passenger simulation ──────────────────────────────────────────────────────
export const STOP_DWELL_MS              = 3000  // ms stopped at a stop
export const ALIGHTING_PROBABILITY      = 0.4
export const MAX_ALIGHTING_FRACTION     = 0.5
export const BOARDING_REGEN_PROBABILITY = 0.3
export const MAX_REGEN_PASSENGERS       = 5
export const BUS_LAUNCH_STAGGER_MS      = 1500  // delay between each bus launch

// ── Dispersal (Operação Alvorada) ─────────────────────────────────────────────
export const CARDINAL_DIRECTIONS = 4   // N, E, S, W extremes
