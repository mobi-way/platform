import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginScreen() {
  const { signIn, signUp, loading, error } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSignUp) {
      await signUp(email, password, fullName)
    } else {
      await signIn(email, password)
    }
  }

  return (
    <div className="absolute inset-0 bg-[#111827] z-[3000] flex flex-col items-center justify-center p-5">
      <form
        onSubmit={handleSubmit}
        className="bg-[#1f2937] p-8 rounded-2xl text-center w-full max-w-xs border border-[#374151]"
        style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}
      >
        <h1 className="m-0 text-[#3b82f6] font-rajdhani text-4xl font-bold uppercase tracking-widest">
          NavBus
        </h1>
        <p className="text-[#9ca3af] mt-1 mb-4 text-sm">App do Passageiro</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/50 border border-red-700 text-red-300 text-sm">
            {error}
          </div>
        )}

        {isSignUp && (
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nome completo"
            required
            className="w-full mb-3 px-4 py-3 rounded-xl border-2 border-[#374151] bg-[#111827] text-white text-sm outline-none focus:border-[#3b82f6] transition-colors"
          />
        )}

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full mb-3 px-4 py-3 rounded-xl border-2 border-[#374151] bg-[#111827] text-white text-sm outline-none focus:border-[#3b82f6] transition-colors"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          required
          minLength={6}
          className="w-full mb-4 px-4 py-3 rounded-xl border-2 border-[#374151] bg-[#111827] text-white text-sm outline-none focus:border-[#3b82f6] transition-colors"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl border-none bg-[#3b82f6] text-white font-extrabold text-base uppercase cursor-pointer hover:bg-blue-500 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Carregando...' : isSignUp ? 'CADASTRAR' : 'ENTRAR'}
        </button>

        <button
          type="button"
          onClick={() => { setIsSignUp(!isSignUp); }}
          className="mt-3 text-[#9ca3af] text-xs bg-transparent border-none cursor-pointer hover:text-white transition-colors"
        >
          {isSignUp ? 'Já tem conta? Entrar' : 'Não tem conta? Cadastrar'}
        </button>
      </form>
    </div>
  )
}
