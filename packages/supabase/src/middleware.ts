import { createClient } from '@supabase/supabase-js'
import type { UserRole, Profile } from './types'

export interface VerifiedUser {
  id: string
  email: string
  role: UserRole
  profile: Profile
}

/**
 * Verifies a Supabase access token and returns the user with their profile.
 * Used in the Socket.io auth middleware on the API server.
 */
export async function verifyToken(token: string): Promise<VerifiedUser> {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    throw new Error('Invalid or expired token')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('User profile not found')
  }

  return {
    id: user.id,
    email: user.email ?? '',
    role: profile.role as UserRole,
    profile: profile as unknown as Profile,
  }
}
