import type { NavigationState } from '../types'

interface Props {
  navState: NavigationState
}

export default function HUD({ navState }: Props) {
  const { phase, targetStop, distanceMeters } = navState
  const isArrived = phase === 'arrived'

  const directionBg = isArrived ? 'bg-red-500' : 'bg-green-500'
  const borderColor = isArrived ? 'border-red-500' : 'border-[#374151]'

  let distLabel = '-- m'
  let stopLabel = 'Localizando rota...'

  if (targetStop) {
    distLabel = isArrived ? '0 m' : `${distanceMeters} m`
    stopLabel = isArrived
      ? `Parada ${targetStop.id} — Chegamos`
      : `Próxima: Parada ${targetStop.id}`
  }

  return (
    <div
      className={`absolute top-[10px] left-[10px] right-[10px] h-[90px] bg-[#1f2937] rounded-xl z-[2000] flex overflow-hidden shadow-[0_10px_20px_rgba(0,0,0,0.4)] border-2 ${borderColor} text-white transition-colors duration-300`}
    >
      <div className={`w-[90px] ${directionBg} flex items-center justify-center text-[40px] text-white transition-colors duration-300`}>
        {isArrived ? (
          <i className="fas fa-stop-circle" />
        ) : (
          <i className="fas fa-arrow-up" />
        )}
      </div>

      <div className="flex-1 px-4 py-2 flex flex-col justify-center min-w-0">
        <div className="font-rajdhani text-[28px] font-extrabold leading-none">{distLabel}</div>
        <div className="text-[#d1d5db] text-base overflow-hidden whitespace-nowrap text-ellipsis font-semibold mt-0.5">
          {stopLabel}
        </div>
      </div>
    </div>
  )
}
