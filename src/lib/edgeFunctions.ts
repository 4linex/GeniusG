import { supabase, SUPABASE_FUNCTIONS_URL } from '@/lib/supabase'

const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

function functionsUnavailableError(): Error {
  return new Error(
    'Serviço indisponível. Inicie o Supabase local (npm run supabase:start) e as edge functions (npm run supabase:functions).',
  )
}

export async function invokeEdgeFunction<T>(
  name: string,
  body: unknown,
  options?: { accessToken?: string | null },
): Promise<T> {
  if (!SUPABASE_FUNCTIONS_URL) {
    throw functionsUnavailableError()
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: anonKey,
  }

  const token = options?.accessToken
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(`${SUPABASE_FUNCTIONS_URL}/${name}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  } catch {
    throw functionsUnavailableError()
  }

  if (!res.ok) {
    let message = `Erro ao chamar ${name}`
    try {
      const err = await res.json()
      message = err.error || message
    } catch {
      /* resposta não-JSON */
    }
    throw new Error(message)
  }

  return res.json() as Promise<T>
}

export async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }
  return token
}
