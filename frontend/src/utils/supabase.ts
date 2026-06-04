import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('Faltan variables de entorno de Supabase')
}

// Aislamos el almacenamiento por puerto para evitar colisiones en localhost
const port = window.location.port || '80'
const storageKey = `scammer-auth-${port}`

export const supabase = createClient(url, key, {
  auth: {
    storageKey: storageKey,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})
