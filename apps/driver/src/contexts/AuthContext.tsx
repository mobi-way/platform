import { createContext, useContext } from 'react'
import { useSupabaseAuth } from '@mobi-way/supabase/useAuth'
import type { UseAuthReturn } from '@mobi-way/supabase/useAuth'

const AuthContext = createContext<UseAuthReturn | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useSupabaseAuth('driver')
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export function useAuth(): UseAuthReturn {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
