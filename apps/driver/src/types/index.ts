export interface BusData {
  id: string
  lat: number
  lon: number
  fila: number
  ocupacao: number
}

export interface StopData {
  id: string
  lat: number
  lon: number
  nome?: string
}

export interface SystemUpdate {
  frota: BusData[]
  paradas: StopData[]
}

export type NavigationPhase = 'idle' | 'approaching' | 'arrived'

export interface NavigationState {
  phase: NavigationPhase
  targetStop: StopData | null
  distanceMeters: number
  bearing: number | null
  speed: number
  announced: boolean
  arrivedAnnounced: boolean
}

export interface PassengerDelta {
  boarding: number
  alighting: number
  total: number
  stopId: string
}

export type AppScreen = 'login' | 'navigating'
