import { useRef, useCallback } from 'react'
import {
  OSRM_BASE_URL,
  OSRM_REQUEST_DELAY_MS,
  OSRM_TIMEOUT_MS,
  ROUTE_CACHE_KEY,
} from '../constants'
import type { RouteData } from '../types'

// ── Serialised OSRM queue (module-level singleton) ────────────────────────────
// We need a single queue across all bus coroutines. Using a module-level
// object guarantees one instance regardless of React re-mounts.
interface QueueEntry {
  url: string
  resolve: (data: unknown) => void
}

const apiQueue: {
  queue: QueueEntry[]
  isProcessing: boolean
  add: (url: string) => Promise<unknown>
  process: () => void
} = {
  queue: [],
  isProcessing: false,

  add(url: string): Promise<unknown> {
    return new Promise((resolve) => {
      this.queue.push({ url, resolve })
      this.process()
    })
  },

  process() {
    if (this.isProcessing || this.queue.length === 0) return
    this.isProcessing = true
    const req = this.queue.shift()!

    const doFetch = async () => {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS)
        const response = await fetch(req.url, { signal: controller.signal })
        clearTimeout(timer)
        if (response.ok) {
          req.resolve(await response.json())
        } else {
          req.resolve(null)
        }
      } catch {
        req.resolve(null)
      }

      await new Promise((r) => setTimeout(r, OSRM_REQUEST_DELAY_MS))
      this.isProcessing = false
      this.process()
    }

    doFetch()
  },
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useRouteCache() {
  const cacheRef = useRef<Record<string, RouteData>>({})

  // Load from localStorage on first use
  if (Object.keys(cacheRef.current).length === 0) {
    try {
      const saved = localStorage.getItem(ROUTE_CACHE_KEY)
      if (saved) cacheRef.current = JSON.parse(saved) as Record<string, RouteData>
    } catch {
      // ignore parse errors
    }
  }

  const persistCache = useCallback(() => {
    try {
      localStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify(cacheRef.current))
    } catch {
      // storage quota exceeded — silently ignore
    }
  }, [])

  /**
   * Fetch a driving route from OSRM (or return from cache).
   * Coordinates are returned in GeoJSON order: [lon, lat].
   */
  const getRoute = useCallback(
    async (
      startLat: number,
      startLon: number,
      endLat: number,
      endLon: number,
    ): Promise<RouteData | null> => {
      const key = `${startLat.toFixed(4)},${startLon.toFixed(4)}-${endLat.toFixed(4)},${endLon.toFixed(4)}`

      if (cacheRef.current[key]?.distance) {
        return cacheRef.current[key]
      }

      const url =
        `${OSRM_BASE_URL}/route/v1/driving/` +
        `${startLon},${startLat};${endLon},${endLat}` +
        `?overview=full&geometries=geojson`

      const data = await apiQueue.add(url)

      if (
        data &&
        typeof data === 'object' &&
        'routes' in data &&
        Array.isArray((data as { routes: unknown[] }).routes) &&
        (data as { routes: unknown[] }).routes.length > 0
      ) {
        const raw = data as {
          routes: Array<{
            geometry: { coordinates: [number, number][] }
            distance: number
          }>
        }
        const routeData: RouteData = {
          coordinates: raw.routes[0].geometry.coordinates,
          distance: raw.routes[0].distance,
        }
        cacheRef.current[key] = routeData
        persistCache()
        return routeData
      }

      return null
    },
    [persistCache],
  )

  return { getRoute }
}
