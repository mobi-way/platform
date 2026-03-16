import { useCallback, useRef } from 'react'
import { supabase } from '@mobi-way/supabase/client'
import type { StopSnapshot } from '../types'

const BATCH_SIZE = 100

/**
 * Syncs bus stop data to Supabase.
 * - On first load, tries to read from Supabase (fallback to Overpass).
 * - After Overpass loads, upserts stops in batches of 100.
 */
export function useSyncStops() {
  const syncedRef = useRef(false)

  const loadFromSupabase = useCallback(async (): Promise<StopSnapshot[] | null> => {
    const { data, error } = await supabase
      .from('bus_stops')
      .select('*')
      .eq('active', true)

    if (error || !data || data.length === 0) return null

    return data.map((s) => ({
      id: s.id,
      lat: s.lat,
      lon: s.lon,
      nome: s.name,
      passengers: 0,
    }))
  }, [])

  const syncToSupabase = useCallback(async (stops: StopSnapshot[]) => {
    if (syncedRef.current || stops.length === 0) return
    syncedRef.current = true

    const rows = stops.map((s) => ({
      id: s.id,
      name: (s as StopSnapshot & { nome?: string }).nome ?? s.id,
      lat: s.lat,
      lon: s.lon,
      line_ids: [] as string[],
      active: true,
    }))

    // Batch upsert in chunks of BATCH_SIZE
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      const { error } = await supabase
        .from('bus_stops')
        .upsert(batch, { onConflict: 'id' })

      if (error) {
        console.error(`[SyncStops] Batch ${i / BATCH_SIZE + 1} error:`, error.message)
      }
    }

    console.log(`[SyncStops] Synced ${rows.length} stops to Supabase`)
  }, [])

  return { loadFromSupabase, syncToSupabase }
}
