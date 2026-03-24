import { createClient } from '@supabase/supabase-js'

const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env
const supabaseUrl = env.VITE_SUPABASE_URL as string
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables. ' +
    'Create a .env file in the app root with these values from your Supabase project settings.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
