export type Room = 'admin' | 'passenger' | 'driver'

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

export interface SystemUpdatePayload {
  frota: BusData[]
  paradas: StopData[]
}

export interface TripOptionsRequestPayload {
  origin: { lat: number; lon: number }
  dest: { lat: number; lon: number }
  requesterId: string
}

export interface TripOptionsResponsePayload {
  opcoes: Array<{
    id: string
    lat: number
    lon: number
    tempoPickup: number
    tempoViagem: number
    totalTime: number
  }>
  requesterId: string
}

export interface TripRequestPayload {
  busId: string
  origin: { lat: number; lon: number }
  dest: { lat: number; lon: number }
}
