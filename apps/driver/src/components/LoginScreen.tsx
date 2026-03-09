import { useState } from 'react'

interface Props {
  onLogin: (busId: string) => void
}

export default function LoginScreen({ onLogin }: Props) {
  const [value, setValue] = useState('')

  function handleSubmit() {
    let id = value.trim().toUpperCase()
    if (!id) return
    if (!id.startsWith('L')) id = 'L' + id
    onLogin(id)
  }

  return (
    <div className="absolute inset-0 bg-[#111827] z-[3000] flex flex-col items-center justify-center p-5">
      <div
        className="bg-[#1f2937] p-8 rounded-2xl text-center w-full max-w-xs border border-[#374151]"
        style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}
      >
        <h1 className="m-0 text-[#3b82f6] font-rajdhani text-4xl font-bold uppercase tracking-widest">
          NavBus
        </h1>
        <p className="text-[#9ca3af] mt-1 mb-0 text-sm">Interface do Motorista</p>

        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="ID do ônibus (ex: L1)"
          maxLength={4}
          className="w-full mt-5 mb-5 px-4 py-4 rounded-xl border-2 border-[#374151] bg-[#111827] text-white text-2xl font-extrabold text-center uppercase outline-none focus:border-[#3b82f6] transition-colors"
        />

        <button
          onClick={handleSubmit}
          className="w-full py-4 rounded-xl border-none bg-[#3b82f6] text-white font-extrabold text-base uppercase cursor-pointer hover:bg-blue-500 active:scale-95 transition-all"
        >
          INICIAR ROTA
        </button>
      </div>
    </div>
  )
}
