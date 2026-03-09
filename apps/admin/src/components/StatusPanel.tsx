import React, { useEffect, useState } from 'react'
import type { FleetStats } from '../types'

interface StatusPanelProps {
  stats: FleetStats
  loadingText: string
  initialized: boolean
}

const StatusPanel: React.FC<StatusPanelProps> = ({ stats, loadingText, initialized }) => {
  const [clock, setClock] = useState({ date: '', time: '' })

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const dd  = String(now.getDate()).padStart(2, '0')
      const mm  = String(now.getMonth() + 1).padStart(2, '0')
      const yyyy = now.getFullYear()
      const hh  = String(now.getHours()).padStart(2, '0')
      const min = String(now.getMinutes()).padStart(2, '0')
      const ss  = String(now.getSeconds()).padStart(2, '0')
      setClock({ date: `${dd}/${mm}/${yyyy}`, time: `${hh}:${min}:${ss}` })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const waitLabel = `${String(stats.avgWaitMinutes).padStart(2, '0')}:${String(stats.avgWaitSeconds).padStart(2, '0')}`

  return (
    <>
      {/* Loading banner */}
      {!initialized && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000]
                     flex items-center gap-2.5
                     bg-white px-4 py-2 rounded-full
                     shadow-md text-sm font-bold text-gray-700"
        >
          <div className="spinner" />
          <span>{loadingText}</span>
        </div>
      )}

      {/* Status panel */}
      <div
        className="absolute top-3 right-3 w-60 z-[1000]
                   bg-white/95 rounded-lg shadow-lg
                   border-l-[5px] border-brand-700
                   p-4 text-[13px] text-gray-700"
      >
        <h2 className="font-bold text-brand-700 text-sm mb-3 pb-2 border-b border-dashed border-gray-200">
          Status da Frota
        </h2>

        {[
          { label: 'Data',               value: clock.date },
          { label: 'Hora',               value: clock.time },
          { label: 'Ônibus Circulando',  value: String(stats.activeBuses) },
          { label: 'Pass. nas Paradas',  value: String(stats.passengersAtStops) },
          { label: 'Pass. nos Ônibus',   value: String(stats.passengersOnBuses) },
          { label: 'Tempo Médio Espera', value: waitLabel },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex justify-between mb-1.5 pb-1 border-b border-dashed border-gray-100 last:border-0 last:mb-0"
          >
            <span className="text-gray-500">{label}</span>
            <span className="font-bold text-brand-700">{value}</span>
          </div>
        ))}
      </div>
    </>
  )
}

export default StatusPanel
