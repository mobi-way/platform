import React, { useState, useMemo } from 'react'
import type { BusSnapshot } from '../types'
import { BUS_CAPACITY } from '../constants'

interface BusSidebarProps {
  buses: BusSnapshot[]
  onSelectBus: (bus: BusSnapshot) => void
}

const BusSidebar: React.FC<BusSidebarProps> = ({ buses, onSelectBus }) => {
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    const q = filter.toUpperCase().trim()
    if (!q) return buses
    return buses.filter((b) => b.id.toUpperCase().includes(q))
  }, [buses, filter])

  const close = () => {
    document.getElementById('sidebar-buses')?.classList.remove('active')
  }

  return (
    <div
      id="sidebar-buses"
      className="sidebar fixed top-0 left-[-300px] w-[260px] h-full
                 bg-white z-[2000] shadow-[2px_0_10px_rgba(0,0,0,0.3)]
                 transition-[left] duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]
                 flex flex-col p-5
                 [&.active]:left-0"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="m-0 text-brand-700 text-xl font-bold">
          Frota ({buses.length} Ônibus)
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
        placeholder="Buscar ônibus..."
        className="w-full px-3 py-2.5 mb-4 border border-gray-200 rounded-md
                   text-sm outline-none focus:border-brand-700"
      />

      {/* List */}
      <ul className="sidebar-list list-none p-0 overflow-y-auto flex-1">
        {filtered.map((bus) => {
          const pct = (bus.passengers / BUS_CAPACITY) * 100
          const color =
            pct >= 100 ? 'text-red-600' : pct >= 70 ? 'text-amber-500' : 'text-brand-700'
          return (
            <li
              key={bus.id}
              onClick={() => onSelectBus(bus)}
              className="flex justify-between items-center
                         px-3 py-2 border-b border-gray-100
                         cursor-pointer text-gray-600 text-sm
                         hover:bg-[#f4f7f9] hover:text-brand-700 hover:font-bold"
            >
              <span className="font-medium">{bus.id}</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${color}`}>
                  {bus.passengers}/{BUS_CAPACITY}
                </span>
                {bus.queueLength > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    APP
                  </span>
                )}
              </div>
            </li>
          )
        })}
        {filtered.length === 0 && (
          <li className="px-3 py-4 text-center text-gray-400 text-sm">
            Nenhum ônibus encontrado
          </li>
        )}
      </ul>
    </div>
  )
}

export default BusSidebar
