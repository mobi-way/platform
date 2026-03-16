export type UserRole = 'admin' | 'passenger' | 'driver'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  phone: string | null
  bus_id: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface BusLine {
  id: string
  name: string
  color: string
  route_geojson: object | null
  active: boolean
  created_at: string
}

export interface BusStop {
  id: string
  name: string
  lat: number
  lon: number
  line_ids: string[]
  active: boolean
  created_at: string
}

export interface Bus {
  id: string
  line_id: string | null
  capacity: number
  status: 'active' | 'inactive' | 'maintenance'
  driver_id: string | null
  created_at: string
}

export type TripStatus = 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

export interface Trip {
  id: string
  passenger_id: string
  bus_id: string
  origin_lat: number
  origin_lon: number
  dest_lat: number
  dest_lon: number
  status: TripStatus
  pickup_time: string | null
  dropoff_time: string | null
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string }
        Update: Partial<Omit<Profile, 'id'>>
        Relationships: []
      }
      bus_lines: {
        Row: BusLine
        Insert: Partial<BusLine> & { name: string }
        Update: Partial<Omit<BusLine, 'id'>>
        Relationships: []
      }
      bus_stops: {
        Row: BusStop
        Insert: Partial<BusStop> & { id: string; name: string; lat: number; lon: number }
        Update: Partial<Omit<BusStop, 'id'>>
        Relationships: []
      }
      buses: {
        Row: Bus
        Insert: Partial<Bus> & { id: string }
        Update: Partial<Omit<Bus, 'id'>>
        Relationships: []
      }
      trips: {
        Row: Trip
        Insert: Omit<Trip, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Omit<Trip, 'id' | 'passenger_id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
