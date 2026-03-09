import { useState, useCallback } from 'react'
import { OVERPASS_URL, OVERPASS_BBOX_PADDING } from '../constants'
import type { Stop } from '../types'

interface OverpassElement {
  id: number
  lat: number
  lon: number
  tags?: Record<string, string>
}

interface UseOverpassReturn {
  stops: Stop[]
  loading: boolean
  error: string | null
  fetchStops: (south: number, west: number, north: number, east: number) => Promise<Stop[]>
}

export function useOverpass(): UseOverpassReturn {
  const [stops, setStops] = useState<Stop[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStops = useCallback(
    async (
      south: number,
      west: number,
      north: number,
      east: number,
    ): Promise<Stop[]> => {
      setLoading(true)
      setError(null)

      const query =
        `[out:json];` +
        `(node["highway"="bus_stop"]` +
        `(${south - OVERPASS_BBOX_PADDING},` +
        `${west - OVERPASS_BBOX_PADDING},` +
        `${north + OVERPASS_BBOX_PADDING},` +
        `${east + OVERPASS_BBOX_PADDING});` +
        `);out;`

      const url = `${OVERPASS_URL}?data=${encodeURIComponent(query)}`

      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`)
        const data = await res.json() as { elements: OverpassElement[] }

        // Sort for deterministic IDs (matches prototype behaviour)
        const sorted = [...data.elements].sort(
          (a, b) => (a.lat + a.lon) - (b.lat + b.lon),
        )

        const result: Stop[] = sorted.map((el, idx) => ({
          id: `P${idx + 1}`,
          lat: el.lat,
          lon: el.lon,
          passengers: Math.floor(Math.random() * 5),
          lastVisit: Date.now(),
          isReserved: false,
        }))

        setStops(result)
        return result
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Overpass fetch failed'
        setError(msg)
        return []
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  return { stops, loading, error, fetchStops }
}
