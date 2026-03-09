import React from 'react'
import type { Stop } from '../types'

interface OriginScreenProps {
  connected: boolean
  originStop: Stop | null
  onConfirm: () => void
}

export default function OriginScreen({ connected, originStop, onConfirm }: OriginScreenProps) {
  return (
    <div className="ui-screen active">
      {/* Top bar */}
      <div className="top-bar pointer-events-auto">
        <span className="page-title">Escolha sua Origem</span>
      </div>

      {/* Bottom sheet */}
      <div className="bottom-sheet pointer-events-auto animate-slide-up">
        {/* Connection status */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          {connected ? (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-green-600 font-medium">Conectado à Frota</span>
            </>
          ) : (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
              <span className="text-slate-500">Sincronizando...</span>
            </>
          )}
        </div>

        {originStop ? (
          <>
            <div className="stop-card mb-5">
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Origem</p>
                <h4 className="text-slate-800 font-semibold text-base">
                  {originStop.nome ?? `Parada ${originStop.id}`}
                </h4>
              </div>
              <svg className="w-6 h-6 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
            </div>

            <button className="btn btn-primary" onClick={onConfirm}>
              Confirmar Origem
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
              </svg>
            </button>
          </>
        ) : (
          <div className="text-center py-5 text-slate-400 font-medium text-sm">
            Selecione a parada de origem no mapa.
          </div>
        )}
      </div>
    </div>
  )
}
