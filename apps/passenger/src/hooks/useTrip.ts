import { useReducer, useCallback } from 'react'
import type {
  TripState,
  Phase,
  Stop,
  Bus,
  TripOption,
  SystemUpdatePayload,
  TripOptionsResponsePayload,
} from '../types'
import { DEFAULT_CENTER } from '../constants'

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SYSTEM_UPDATE'; payload: SystemUpdatePayload }
  | { type: 'SET_CONNECTED'; connected: boolean }
  | { type: 'SET_USER_POSITION'; lat: number; lon: number }
  | { type: 'SELECT_ORIGIN'; stop: Stop }
  | { type: 'CONFIRM_ORIGIN' }
  | { type: 'SET_SEARCH_POINT'; lat: number; lon: number }
  | { type: 'SELECT_DEST'; stop: Stop }
  | { type: 'TRIP_OPTIONS_RESPONSE'; payload: TripOptionsResponsePayload }
  | { type: 'SELECT_BUS'; bus: TripOption }
  | { type: 'START_TRIP' }
  | { type: 'CONFIRM_BOARDING' }
  | { type: 'CONFIRM_ALIGHTING' }
  | { type: 'CANCEL' }
  | { type: 'GO_BACK' }

// ─── Initial state ─────────────────────────────────────────────────────────────

const initialState: TripState = {
  phase: 'choosing_origin',
  tripStage: 'pickup',
  userLat: DEFAULT_CENTER.lat,
  userLon: DEFAULT_CENTER.lon,
  originStop: null,
  destStop: null,
  searchLat: null,
  searchLon: null,
  selectedBus: null,
  options: [],
  frota: [],
  paradas: [],
  connected: false,
}

// ─── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state: TripState, action: Action): TripState {
  switch (action.type) {

    case 'SYSTEM_UPDATE':
      return {
        ...state,
        frota: action.payload.frota,
        paradas: action.payload.paradas,
        connected: true,
      }

    case 'SET_CONNECTED':
      return { ...state, connected: action.connected }

    case 'SET_USER_POSITION':
      return { ...state, userLat: action.lat, userLon: action.lon }

    case 'SELECT_ORIGIN':
      return { ...state, originStop: action.stop }

    case 'CONFIRM_ORIGIN':
      if (!state.originStop) return state
      return { ...state, phase: 'choosing_dest' as Phase }

    case 'SET_SEARCH_POINT':
      return { ...state, searchLat: action.lat, searchLon: action.lon }

    case 'SELECT_DEST':
      return { ...state, destStop: action.stop }

    case 'TRIP_OPTIONS_RESPONSE': {
      const options = action.payload.options
      return {
        ...state,
        phase: 'options' as Phase,
        options,
        // pre-select the first (fastest) option
        selectedBus: options.length > 0 ? options[0] : null,
      }
    }

    case 'SELECT_BUS':
      return { ...state, selectedBus: action.bus }

    case 'START_TRIP':
      if (!state.selectedBus) return state
      return {
        ...state,
        phase: 'tracking' as Phase,
        tripStage: 'pickup',
      }

    case 'CONFIRM_BOARDING':
      return { ...state, tripStage: 'trip' }

    case 'CONFIRM_ALIGHTING':
      // Move user to destination, then reset
      return {
        ...initialState,
        frota: state.frota,
        paradas: state.paradas,
        connected: state.connected,
        userLat: state.destStop?.lat ?? state.userLat,
        userLon: state.destStop?.lon ?? state.userLon,
      }

    case 'CANCEL':
      return {
        ...initialState,
        frota: state.frota,
        paradas: state.paradas,
        connected: state.connected,
        userLat: state.userLat,
        userLon: state.userLon,
      }

    case 'GO_BACK': {
      switch (state.phase) {
        case 'choosing_dest':
          return {
            ...state,
            phase: 'choosing_origin' as Phase,
            destStop: null,
            searchLat: null,
            searchLon: null,
          }
        case 'options':
          return { ...state, phase: 'choosing_dest' as Phase, options: [], selectedBus: null }
        default:
          return state
      }
    }

    default:
      return state
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseTripReturn {
  state: TripState
  // Derived helpers consumed by screens
  nearbyStops: (centerLat: number, centerLon: number, allStops: Stop[], radiusM: number) => Stop[]
  activeBus: Bus | undefined
  // Dispatchers
  onSystemUpdate: (payload: SystemUpdatePayload) => void
  onTripOptionsResponse: (payload: TripOptionsResponsePayload) => void
  setConnected: (c: boolean) => void
  setUserPosition: (lat: number, lon: number) => void
  selectOrigin: (stop: Stop) => void
  confirmOrigin: () => void
  setSearchPoint: (lat: number, lon: number) => void
  selectDest: (stop: Stop) => void
  selectBus: (bus: TripOption) => void
  startTrip: () => void
  confirmBoarding: () => void
  confirmAlighting: () => void
  cancel: () => void
  goBack: () => void
}

export function useTrip(): UseTripReturn {
  const [state, dispatch] = useReducer(reducer, initialState)

  const nearbyStops = useCallback(
    (centerLat: number, centerLon: number, allStops: Stop[], radiusM: number): Stop[] => {
      return allStops.filter(stop => {
        const dlat = (stop.lat - centerLat) * 111320
        const dlon = (stop.lon - centerLon) * 111320 * Math.cos(centerLat * (Math.PI / 180))
        return Math.sqrt(dlat * dlat + dlon * dlon) <= radiusM
      })
    },
    [],
  )

  const activeBus = state.selectedBus
    ? state.frota.find(b => String(b.id) === String(state.selectedBus!.id))
    : undefined

  return {
    state,
    nearbyStops,
    activeBus,
    onSystemUpdate: payload => dispatch({ type: 'SYSTEM_UPDATE', payload }),
    onTripOptionsResponse: payload => dispatch({ type: 'TRIP_OPTIONS_RESPONSE', payload }),
    setConnected: connected => dispatch({ type: 'SET_CONNECTED', connected }),
    setUserPosition: (lat, lon) => dispatch({ type: 'SET_USER_POSITION', lat, lon }),
    selectOrigin: stop => dispatch({ type: 'SELECT_ORIGIN', stop }),
    confirmOrigin: () => dispatch({ type: 'CONFIRM_ORIGIN' }),
    setSearchPoint: (lat, lon) => dispatch({ type: 'SET_SEARCH_POINT', lat, lon }),
    selectDest: stop => dispatch({ type: 'SELECT_DEST', stop }),
    selectBus: bus => dispatch({ type: 'SELECT_BUS', bus }),
    startTrip: () => dispatch({ type: 'START_TRIP' }),
    confirmBoarding: () => dispatch({ type: 'CONFIRM_BOARDING' }),
    confirmAlighting: () => dispatch({ type: 'CONFIRM_ALIGHTING' }),
    cancel: () => dispatch({ type: 'CANCEL' }),
    goBack: () => dispatch({ type: 'GO_BACK' }),
  }
}
