import type { PassengerDelta } from '../types'

interface Props {
  delta: PassengerDelta | null
}

export default function PassengerNotification({ delta }: Props) {
  const visible = delta !== null

  return (
    <div
      className={`pax-notification ${visible ? 'show' : ''} bg-[rgba(31,41,55,0.95)] text-white px-8 py-4 rounded-[30px] border border-white/20 font-bold text-lg flex gap-5 shadow-[0_10px_25px_rgba(0,0,0,0.5)]`}
    >
      <span className="flex items-center gap-2 text-green-400">
        <i className="fas fa-arrow-circle-up" />
        <span>{delta?.boarding ?? 0}</span>
      </span>
      <span className="flex items-center gap-2 text-red-400">
        <i className="fas fa-arrow-circle-down" />
        <span>{delta?.alighting ?? 0}</span>
      </span>
    </div>
  )
}
