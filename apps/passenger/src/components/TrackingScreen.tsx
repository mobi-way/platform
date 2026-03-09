import React, { useEffect, useState, useRef } from 'react'
import type { Bus, Stop, TripStage } from '../types'
import { ETA_FACTOR, ARRIVAL_THRESHOLD_M } from '../constants'

interface TrackingScreenProps {
  activeBus: Bus | undefined
  selectedBusId: string | number | null
  originStop: Stop
  destStop: Stop
  tripStage: TripStage
  onConfirmBoarding: () => void
  onConfirmAlighting: () => void
  onCancel: () => void
  measureDistance: (a: [number, number], b: [number, number]) => number
  onBusPositionUpdate: (lat: number, lon: number) => void
  onZoomRequest: (lat: number, lon: number, zoom: number) => void
}

interface EtaDisplay {
  mm: string
  ss: string
}

function computeEta(distM: number): EtaDisplay {
  const total = Math.ceil(distM * ETA_FACTOR)
  const mm = Math.floor(total / 60)
  const ss = total % 60
  return { mm: String(mm).padStart(2, '0'), ss: String(ss).padStart(2, '0') }
}

function zoomForDist(dist: number): number {
  if (dist < 100) return 18
  if (dist < 500) return 17
  if (dist < 1000) return 16
  return 15
}

export default function TrackingScreen({
  activeBus,
  selectedBusId,
  originStop,
  destStop,
  tripStage,
  onConfirmBoarding,
  onConfirmAlighting,
  onCancel,
  measureDistance,
  onBusPositionUpdate,
  onZoomRequest,
}: TrackingScreenProps) {
  const [eta, setEta] = useState<EtaDisplay>({ mm: '--', ss: '--' })
  const [distM, setDistM] = useState<number | null>(null)
  const prevBusRef = useRef<Bus | undefined>(undefined)

  useEffect(() => {
    if (!activeBus) return

    const target = tripStage === 'pickup'
      ? [originStop.lat, originStop.lon] as [number, number]
      : [destStop.lat, destStop.lon] as [number, number]

    const dist = measureDistance([activeBus.lat, activeBus.lon], target)
    setDistM(dist)
    setEta(computeEta(dist))

    // Notify parent for map updates
    if (
      prevBusRef.current?.lat !== activeBus.lat ||
      prevBusRef.current?.lon !== activeBus.lon
    ) {
      onBusPositionUpdate(activeBus.lat, activeBus.lon)
      onZoomRequest(activeBus.lat, activeBus.lon, zoomForDist(dist))
      prevBusRef.current = activeBus
    }
  }, [activeBus, tripStage, originStop, destStop, measureDistance, onBusPositionUpdate, onZoomRequest])

  const hasArrived = distM !== null && distM < ARRIVAL_THRESHOLD_M

  let statusText = ''
  let statusColor = 'text-amber-500'
  let actionLabel = ''
  let showAction = false

  if (tripStage === 'pickup') {
    if (hasArrived) {
      statusText = 'Ônibus Chegou!'
      statusColor = 'text-green-500'
      actionLabel = 'Confirmar Embarque'
      showAction = true
    } else {
      statusText = 'A caminho...'
      statusColor = 'text-amber-500'
    }
  } else {
    if (hasArrived) {
      statusText = 'Destino Final'
      statusColor = 'text-red-500'
      actionLabel = 'Confirmar Desembarque'
      showAction = true
    } else {
      statusText = 'Em viagem...'
      statusColor = 'text-amber-500'
    }
  }

  const routeLabel = tripStage === 'pickup'
    ? `Indo para o Embarque...`
    : `Indo para o Destino...`

  return (
    <div className="ui-screen active">
      <div className="flex-1" />

      <div className="bottom-sheet pointer-events-auto animate-slide-up">
        {/* Header row */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 leading-tight">
              Linha {selectedBusId ?? '--'}
            </h2>
            <span className={`text-sm font-semibold ${statusColor}`}>
              {activeBus ? statusText : 'Aguardando sinal...'}
            </span>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-500 tabular-nums leading-tight">
              {eta.mm}:{eta.ss}
            </div>
            <span className="text-xs text-slate-400">tempo estimado</span>
          </div>
        </div>

        {/* Route indicator */}
        <div className="stop-card mb-3 py-3">
          <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"/>
          </svg>
          <span className="text-sm font-medium text-slate-700">{routeLabel}</span>
        </div>

        {/* Action button (boarding / alighting) */}
        {showAction && (
          <button
            className={`btn mb-3 ${tripStage === 'pickup' ? 'btn-primary' : 'btn-danger'}`}
            onClick={tripStage === 'pickup' ? onConfirmBoarding : onConfirmAlighting}
          >
            {actionLabel}
            {tripStage === 'pickup' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/>
              </svg>
            )}
          </button>
        )}

        {/* Cancel */}
        <button className="btn btn-danger" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
