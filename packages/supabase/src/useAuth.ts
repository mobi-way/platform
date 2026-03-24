import { useState, useEffect, useCallback } from 'react'
import { supabase } from './client'
import type { User, Session } from '@supabase/supabase-js'
import type { UserRole, Profile } from './types'

export interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  error: string | null
}

export interface UseAuthReturn extends AuthState {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  accessToken: string | null
}

function getRoleFromUserMetadata(user: User): UserRole | null {
  const role = user.user_metadata?.role
  return role === 'admin' || role === 'passenger' || role === 'driver' ? role : null
}

function buildProfileFallback(user: User): Profile | null {
  const role = getRoleFromUserMetadata(user)
  if (!role) return null

  const now = new Date().toISOString()

  return {
    id: user.id,
    role,
    full_name: user.user_metadata?.full_name ?? null,
    phone: null,
    bus_id: null,
    avatar_url: null,
    created_at: user.created_at ?? now,
    updated_at: now,
  }
}

/**
 * React hook for Supabase auth with role enforcement.
 * @param expectedRole - The role this app expects (e.g. 'admin', 'passenger', 'driver')
 */
export function useSupabaseAuth(expectedRole: UserRole): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    error: null,
  })

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[Auth] Failed to fetch profile:', error.message)
      return null
    }
    return data as unknown as Profile
  }, [])

  const handleSession = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setState({ user: null, session: null, profile: null, loading: false, error: null })
      return
    }

    const profile = await fetchProfile(session.user.id) ?? buildProfileFallback(session.user)

    if (!profile) {
      await supabase.auth.signOut()
      setState({
        user: null,
        session: null,
        profile: null,
        loading: false,
        error: 'Nao foi possivel identificar o tipo da conta. Entre novamente.',
      })
      return
    }

    if (profile.role !== expectedRole) {
      await supabase.auth.signOut()
      setState({
        user: null,
        session: null,
        profile: null,
        loading: false,
        error: `Esta conta é do tipo "${profile.role}". Use o app correto para sua função.`,
      })
      return
    }

    setState({
      user: session.user,
      session,
      profile,
      loading: false,
      error: null,
    })
  }, [expectedRole, fetchProfile])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session)
    })

    return () => subscription.unsubscribe()
  }, [handleSession])

  const signIn = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }))
    }
    // Success is handled by onAuthStateChange
  }, [])

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: expectedRole,
          full_name: fullName,
        },
      },
    })

    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }))
    }
    // Success is handled by onAuthStateChange
  }, [expectedRole])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setState({ user: null, session: null, profile: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    accessToken: state.session?.access_token ?? null,
  }
}
