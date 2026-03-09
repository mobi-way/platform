import { useState, useCallback } from 'react'
import type { AppScreen, NavigationState, PassengerDelta, SystemUpdate } from './types'
import { useSocket } from './hooks/useSocket'
import LoginScreen from './components/LoginScreen'
import NavigationMap from './components/NavigationMap'

export default function App() {
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
    onSystemUpdate: useCallback(
      (data: SystemUpdate) => {
        setSystemUpdate(data)
        const mine = data.frota.find((b) => b.id === busId)
        if (mine) setOccupancy(mine.ocupacao ?? 0)
      },
      [busId],
    ),
  })

  const handleLogin = useCallback((id: string) => {
    setBusId(id)
    setScreen('navigating')
  }, [])

  if (screen === 'login') {
    return <LoginScreen onLogin={handleLogin} />
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
