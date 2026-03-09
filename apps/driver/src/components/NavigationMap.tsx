import { useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { NavigationState, PassengerDelta, SystemUpdate } from '../types'
import { useNavigation } from '../hooks/useNavigation'
import { useSpeech } from '../hooks/useSpeech'
import HUD from './HUD'
import BottomPanel from './BottomPanel'
import PassengerNotification from './PassengerNotification'

interface Props {
  busId: string
  systemUpdate: SystemUpdate | null
  navState: NavigationState
  passengerDelta: PassengerDelta | null
  occupancy: number
  onNavUpdate: (state: NavigationState) => void
  onPassengerDelta: (delta: PassengerDelta) => void
}

export default function NavigationMap({
  busId, systemUpdate, navState, passengerDelta, occupancy,
  onNavUpdate, onPassengerDelta,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const mapRotatorRef = useRef<HTMLDivElement>(null)
  const mapInitialised = useRef(false)
  const { speak } = useSpeech()
  const lastSpokenPhaseRef = useRef<string>('')
  const lastSpokenStopRef = useRef<string>('')

  const handleNavUpdate = useCallback(
    (state: NavigationState) => {
      onNavUpdate(state)
      if (!state.targetStop) return
      const stopId = state.targetStop.id
      const nomeFalado = stopId.replace('P', 'P ')
      if (state.phase === 'approaching' && !state.announced && lastSpokenPhaseRef.current !== `approach-${stopId}`) {
        lastSpokenPhaseRef.current = `approach-${stopId}`
        speak(`Próxima parada, ${nomeFalado}.`)
      }
    },
    [onNavUpdate, speak],
  )

  const handlePassengerDelta = useCallback(
    (delta: PassengerDelta) => {
      const nomeFalado = delta.stopId.replace('P', 'P ')
      if (lastSpokenStopRef.current !== `arrived-${delta.stopId}`) {
        lastSpokenStopRef.current = `arrived-${delta.stopId}`
        speak(`Parada ${nomeFalado}. Embarcaram ${delta.boarding}, e desembarcaram ${delta.alighting} passageiros.`)
      }
      onPassengerDelta(delta)
    },
    [speak, onPassengerDelta],
  )

  const { processUpdate } = useNavigation({
    mapRef,
    onNavigationUpdate: handleNavUpdate,
    onPassengerDelta: handlePassengerDelta,
  })

  useEffect(() => {
    if (mapInitialised.current || !mapContainerRef.current) return
    mapInitialised.current = true

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      zoomAnimation: false,
      fadeAnimation: false,
    }).setView([-28.2628, -52.4087], 18)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map
    speak(`Navegação ativa. Ônibus ${busId}.`)

    return () => {
      map.remove()
      mapRef.current = null
      mapInitialised.current = false
    }
  }, [busId, speak])

  useEffect(() => {
    if (mapRotatorRef.current && navState.bearing !== null) {
      mapRotatorRef.current.style.transform = `rotate(${-navState.bearing}deg)`
    }
  }, [navState.bearing])

  useEffect(() => {
    if (!systemUpdate || !mapRef.current) return
    const mine = systemUpdate.frota.find((b) => b.id === busId)
    if (!mine) return
    processUpdate(mine, systemUpdate.paradas)
  }, [systemUpdate, busId, processUpdate])

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#aadaff]">
      <div className="perspective-root">
        <div className="tilt-wrapper">
          <div ref={mapRotatorRef} className="map-rotator">
            <div ref={mapContainerRef} id="leaflet-map" />
          </div>
        </div>
      </div>

      <div className="bus-arrow-layer">
        <svg viewBox="0 0 100 100" className="w-[70px] h-[70px]" style={{ filter: 'drop-shadow(0px 8px 6px rgba(0,0,0,0.5))' }}>
          <polygon
            points="50,10 90,90 50,70 10,90"
            fill="#3b82f6" stroke="#ffffff" strokeWidth="6" strokeLinejoin="round"
          />
        </svg>
      </div>

      <HUD navState={navState} />
      <PassengerNotification delta={passengerDelta} />
      <BottomPanel speed={navState.speed} occupancy={occupancy} busId={busId} />
    </div>
  )
}
