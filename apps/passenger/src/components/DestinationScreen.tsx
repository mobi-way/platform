import React, { useState, useRef } from 'react'
import type { Stop, LocalPF } from '../types'
import { LOCAIS_PF } from '../constants'

interface DestinationScreenProps {
  destStop: Stop | null
  onBack: () => void
  onSearchSelect: (local: LocalPF) => void
  onRequestRoutes: () => void
}

export default function DestinationScreen({
  destStop,
  onBack,
  onSearchSelect,
  onRequestRoutes,
}: DestinationScreenProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<LocalPF[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (val.length < 2) {
      setSuggestions([])
      return
    }
    const matches = LOCAIS_PF.filter(l =>
      l.nome.toLowerCase().includes(val.toLowerCase()),
    ).slice(0, 8)
    setSuggestions(matches)
  }

  function applySuggestion(local: LocalPF) {
    setQuery(local.nome)
    setSuggestions([])
    onSearchSelect(local)
  }

  function handleSearch() {
    const match = LOCAIS_PF.find(l =>
      l.nome.toLowerCase().includes(query.toLowerCase()),
    )
    if (match) applySuggestion(match)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="ui-screen active">
      {/* Top bar */}
      <div className="top-bar pointer-events-auto">
        <button className="back-btn" onClick={onBack} aria-label="Voltar">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
          </svg>
        </button>
        <span className="page-title">Para onde vamos?</span>
      </div>

      {/* Bottom sheet */}
      <div className="bottom-sheet pointer-events-auto animate-slide-up">
        {/* Search input */}
        <div className="relative mb-3">
          <div className="input-box">
            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleQueryChange}
              onKeyDown={handleKeyDown}
              placeholder="Digite o destino..."
              className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400"
              autoComplete="off"
            />
            <button
              onClick={handleSearch}
              className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              Ir
            </button>
          </div>

          {/* Suggestions dropdown */}
          {suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-100 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
              {suggestions.map(s => (
                <li key={s.nome}>
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 border-b border-slate-50 last:border-0 transition-colors"
                    onClick={() => applySuggestion(s)}
                  >
                    <span className="mr-2 text-slate-400">📍</span>
                    {s.nome}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {destStop ? (
          <>
            <div className="stop-card mb-4">
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Destino</p>
                <h4 className="text-slate-800 font-semibold text-base">
                  {destStop.nome ?? `Parada ${destStop.id}`}
                </h4>
              </div>
              <svg className="w-6 h-6 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
              </svg>
            </div>

            <button className="btn btn-primary" onClick={onRequestRoutes}>
              Solicitar Rotas
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/>
              </svg>
            </button>
          </>
        ) : (
          <p className="text-center text-slate-400 text-sm py-2">
            Selecione no mapa ou digite o destino acima.
          </p>
        )}
      </div>
    </div>
  )
}
