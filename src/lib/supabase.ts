import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && anon)

if (!isConfigured) {
  // Diagnóstico amigável em dev/preview
  // eslint-disable-next-line no-console
  console.error(
    'EntreMesas: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local (ou nas variáveis da Vercel).',
  )
}

// Normaliza a URL: aceita tanto a base quanto a forma com /rest/v1/ por engano
const baseUrl = (url ?? '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')

export const supabase = createClient(baseUrl, anon ?? '', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
