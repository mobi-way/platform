export { LOCAIS_PF } from './locations'

/** Default map centre (Passo Fundo city centre) */
export const DEFAULT_CENTER = { lat: -28.25144, lon: -52.39412 } as const

/** Default zoom level for the city overview */
export const DEFAULT_ZOOM = 15 as const

/** Maximum radius in metres for nearby-stop discovery */
export const NEARBY_RADIUS_M = 800 as const

/** ETA factor: seconds per metre (empirically calibrated) */
export const ETA_FACTOR = 0.156 as const

/** Distance in metres at which the bus is considered "arrived" */
export const ARRIVAL_THRESHOLD_M = 50 as const

/** Queue-penalty seconds added to options ranked > 1 */
export const QUEUE_PENALTY_S = 30 as const

/** Socket.io server URL — can be overridden via VITE_SOCKET_URL */
export const SOCKET_URL: string =
  (import.meta as unknown as { env: Record<string, string> }).env.VITE_SOCKET_URL ??
  'http://localhost:3001'

// ─── Socket event names ────────────────────────────────────────────────────────
export const EVT_SYSTEM_UPDATE        = 'system_update'           as const
export const EVT_TRIP_OPTIONS_REQUEST = 'trip_options_request'    as const
export const EVT_TRIP_OPTIONS_RESPONSE= 'trip_options_response'   as const
export const EVT_TRIP_REQUEST         = 'trip_request'            as const
