import React, { useState, useMemo } from 'react'
import type { StopSnapshot } from '../types'

interface StopSidebarProps {
  stops: StopSnapshot[]
  onSelectStop: (stop: StopSnapshot) => void
}

const StopSidebar: React.FC<StopSidebarProps> = ({ stops, onSelectStop }) => {
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    const q = filter.toUpperCase().trim()
    if (!q) return stops
    return stops.filter((s) => s.id.toUpperCase().includes(q))
  }, [stops, filter])

  const close = () => {
    document.getElementById('sidebar-stops')?.classList.remove('active')
  }

  return (
    <div
      id="sidebar-stops"
      className="sidebar fixed top-0 left-[-300px] w-[260px] h-full
                 bg-white z-[2000] shadow-[2px_0_10px_rgba(0,0,0,0.3)]
                 transition-[left] duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]
                 flex flex-col p-5
                 [&.active]:left-0"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="m-0 text-brand-700 text-xl font-bold">
          Paradas ({stops.length})
        </h3>
        <button
          onClick={close}
          className="text-2xl font-bold text-gray-400 leading-5 cursor-pointer bg-transparent border-0"
          aria-label="Fechar"
        >
          &times;
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Buscar parada..."
        className="w-full px-3 py-2.5 mb-4 border border-gray-200 rounded-md
                   text-sm outline-none focus:border-brand-700"
      />

      {/* List */}
      <ul className="sidebar-list list-none p-0 overflow-y-auto flex-1">
        {filtered.map((stop) => (
          <li
            key={stop.id}
            onClick={() => onSelectStop(stop)}
            className="flex justify-between items-center
                       px-3 py-2 border-b border-gray-100
                       cursor-pointer text-gray-600 text-sm
                       hover:bg-[#f4f7f9] hover:text-brand-700 hover:font-bold"
          >
            <span>{stop.id}</span>
            <span className="text-xs font-bold text-brand-700">
              {stop.passengers > 0 ? `${stop.passengers} pax` : '—'}
            </span>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-3 py-4 text-center text-gray-400 text-sm">
            Nenhuma parada encontrada
          </li>
        )}
      </ul>
    </div>
  )
}

export default StopSidebar
