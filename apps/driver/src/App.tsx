import { useState, useCallback } from 'react'
import type { AppScreen, NavigationState, PassengerDelta, SystemUpdate } from './types'
import { useSocket } from './hooks/useSocket'
import { useAuth } from './contexts/AuthContext'
import LoginScreen from './components/LoginScreen'
import NavigationMap from './components/NavigationMap'

export default function App() {
  const { user, loading, accessToken } = useAuth()
  const [screen, setScreen] = useState<AppScreen>('login')
  const [busId, setBusId] = useState('')
  const [systemUpdate, setSystemUpdate] = useState<SystemUpdate | null>(null)
  const [navState, setNavState] = useState<NavigationState>({
    phase: 'idle',
    targetStop: null,
    distanceMeters: 0,
    bearing: null,
    speed: 0,
    announced: false,
    arrivedAnnounced: false,
  })
  const [passengerDelta, setPassengerDelta] = useState<PassengerDelta | null>(null)
  const [occupancy, setOccupancy] = useState(0)

  useSocket({
    enabled: screen === 'navigating',
    accessToken,
    onSystemUpdate: useCallback(
      (data: SystemUpdate) => {
        setSystemUpdate(data)
        const mine = data.frota.find((b) => b.id === busId)
        if (mine) setOccupancy(mine.ocupacao ?? 0)
      },
      [busId],
    ),
  })

  const handleBusSelected = useCallback((id: string) => {
    setBusId(id)
    setScreen('navigating')
  }, [])

  if (loading) {
    return (
      <div className="absolute inset-0 bg-[#111827] flex items-center justify-center">
        <div className="text-[#3b82f6] text-xl font-bold animate-pulse">Carregando...</div>
      </div>
    )
  }

  if (!user || screen === 'login') {
    return <LoginScreen onBusSelected={handleBusSelected} />
  }

  return (
    <NavigationMap
      busId={busId}
      systemUpdate={systemUpdate}
      onNavUpdate={setNavState}
      onPassengerDelta={(delta) => {
        setPassengerDelta(delta)
        setTimeout(() => setPassengerDelta(null), 6000)
      }}
      navState={navState}
      passengerDelta={passengerDelta}
      occupancy={occupancy}
    />
  )
}
