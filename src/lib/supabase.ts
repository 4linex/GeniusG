import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

/** Mensagem para exibir na UI quando o client não foi configurado no build. */
export function getSupabaseConfigError(): string | null {
  if (isSupabaseConfigured) return null
  if (import.meta.env.PROD) {
    return (
      'Supabase não foi configurado neste deploy. No Cloudflare Pages, em Settings → ' +
      'Variables and secrets (Production), defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY ' +
      'e faça um novo deploy (Retry deployment).'
    )
  }
  return (
    'Supabase não configurado. Crie um arquivo .env na raiz com VITE_SUPABASE_URL e ' +
    'VITE_SUPABASE_ANON_KEY (veja .env.example) e reinicie npm run dev.'
  )
}

if (!isSupabaseConfigured) {
  console.error(getSupabaseConfigError())
}

export const supabase = createClient(
  supabaseUrl || 'http://127.0.0.1:54321',
  supabaseAnonKey || 'missing-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
)

export const SUPABASE_FUNCTIONS_URL = isSupabaseConfigured
  ? `${supabaseUrl}/functions/v1`
  : ''
