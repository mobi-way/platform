import { useEffect, useRef } from 'react'
import { supabase } from '@mobi-way/supabase/client'
import type { UseTripReturn } from './useTrip'
import { useTrip } from './useTrip'
import { useAuth } from '../contexts/AuthContext'

/**
 * Wraps useTrip() and persists trip state to Supabase at key moments:
 *  - START_TRIP → insert with status 'confirmed'
 *  - CONFIRM_BOARDING → update to 'in_progress' + pickup_time
 *  - CONFIRM_ALIGHTING → update to 'completed' + dropoff_time
 *  - CANCEL → update to 'cancelled'
 */
export function useTripWithPersistence(): UseTripReturn {
  const trip = useTrip()
  const { user } = useAuth()
  const tripIdRef = useRef<string | null>(null)
  const prevPhaseRef = useRef(trip.state.phase)
  const prevStageRef = useRef(trip.state.tripStage)

  useEffect(() => {
    const { phase, tripStage, originStop, destStop, selectedBus } = trip.state
    const prevPhase = prevPhaseRef.current
    const prevStage = prevStageRef.current

    prevPhaseRef.current = phase
    prevStageRef.current = tripStage

    if (!user) return

    // START_TRIP: transitioned from 'options' to 'tracking'
    if (prevPhase === 'options' && phase === 'tracking' && selectedBus && originStop && destStop) {
      supabase
        .from('trips')
        .insert({
          passenger_id: user.id,
          bus_id: selectedBus.id,
          origin_lat: originStop.lat,
          origin_lon: originStop.lon,
          dest_lat: destStop.lat,
          dest_lon: destStop.lon,
          status: 'confirmed' as const,
          pickup_time: null,
          dropoff_time: null,
        })
        .select('id')
        .single()
        .then(({ data }) => {
          if (data) tripIdRef.current = data.id
        })
    }

    // CONFIRM_BOARDING: tripStage changed to 'trip'
    if (phase === 'tracking' && prevStage === 'pickup' && tripStage === 'trip' && tripIdRef.current) {
      supabase
        .from('trips')
        .update({ status: 'in_progress' as const, pickup_time: new Date().toISOString() })
        .eq('id', tripIdRef.current)
        .then(() => {})
    }

    // CONFIRM_ALIGHTING: phase went from 'tracking' back to 'choosing_origin'
    if (prevPhase === 'tracking' && phase === 'choosing_origin' && prevStage === 'trip' && tripIdRef.current) {
      supabase
        .from('trips')
        .update({ status: 'completed' as const, dropoff_time: new Date().toISOString() })
        .eq('id', tripIdRef.current)
        .then(() => {})
      tripIdRef.current = null
    }

    // CANCEL: phase went from 'tracking' back to 'choosing_origin' with pickup stage
    if (prevPhase === 'tracking' && phase === 'choosing_origin' && prevStage === 'pickup' && tripIdRef.current) {
      supabase
        .from('trips')
        .update({ status: 'cancelled' as const })
        .eq('id', tripIdRef.current)
        .then(() => {})
      tripIdRef.current = null
    }
  }, [trip.state.phase, trip.state.tripStage, trip.state, user])

  return trip
}
