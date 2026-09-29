import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Si aún no has creado el archivo .env (mira .env.example), la app arranca
// igualmente y muestra un aviso en vez de romperse.
export const supabaseReady = Boolean(url && anonKey)

export const supabase = supabaseReady ? createClient(url, anonKey) : null
