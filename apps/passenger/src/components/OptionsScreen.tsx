import type { TripOption, Stop } from '../types'
import { ETA_FACTOR, QUEUE_PENALTY_S } from '../constants'

interface OptionsScreenProps {
  options: TripOption[]
  selectedBus: TripOption | null
  originStop: Stop
  destStop: Stop
  onSelectBus: (bus: TripOption) => void
  onConfirm: () => void
  onBack: () => void
  measureDistance: (a: [number, number], b: [number, number]) => number
}

function formatMinutes(seconds: number): number {
  return Math.ceil(seconds / 60)
}

export default function OptionsScreen({
  options,
  selectedBus,
  originStop,
  destStop,
  onSelectBus,
  onConfirm,
  onBack,
  measureDistance,
}: OptionsScreenProps) {
  const tripDistM = measureDistance(
    [originStop.lat, originStop.lon],
    [destStop.lat, destStop.lon],
  )
  const tripMinutes = formatMinutes(Math.ceil(tripDistM * ETA_FACTOR))

  return (
    <div className="ui-screen active">
      {/* Top bar */}
      <div className="top-bar pointer-events-auto">
        <button className="back-btn" onClick={onBack} aria-label="Voltar">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
          </svg>
        </button>
        <span className="page-title">Opções Otimizadas</span>
      </div>

      {/* Bottom sheet */}
      <div className="bottom-sheet pointer-events-auto animate-slide-up" style={{ maxHeight: '70vh' }}>
        {options.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <svg className="w-10 h-10 mb-3 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span className="text-sm">Consultando frota...</span>
          </div>
        ) : (
          <ul className="bus-list-container mb-4 space-y-3">
            {options.slice(0, 6).map((opt, idx) => {
              const pickupDistM = measureDistance(
                [originStop.lat, originStop.lon],
                [opt.lat, opt.lon],
              )
              let pickupSeconds = Math.ceil(pickupDistM * ETA_FACTOR)
              if (idx > 1) pickupSeconds += QUEUE_PENALTY_S

              const pickupMin = formatMinutes(pickupSeconds)
              const isSelected = selectedBus != null && String(opt.id) === String(selectedBus.id)
              const isFastest = idx === 0

              return (
                <li key={String(opt.id)}>
                  <button
                    className={`bus-option w-full text-left ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSelectBus(opt)}
                  >
                    <div className="bus-header">
                      <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/>
                      </svg>
                      <span className="bus-name">Ônibus {opt.id}</span>
                      {isFastest && (
                        <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          Mais Rápido
                        </span>
                      )}
                    </div>

                    <div className="trip-details">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"/>
                        </svg>
                        Chega em: <strong>{pickupMin} min</strong>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"/>
                        </svg>
                        Viagem: <strong>{tripMinutes} min</strong>
                      </span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <button
          className="btn btn-primary"
          disabled={selectedBus === null}
          onClick={onConfirm}
        >
          Confirmar Viagem
        </button>
      </div>
    </div>
  )
}
