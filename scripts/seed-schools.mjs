/**
 * Cadastra escolas nos municípios PE (Igarassu, Goiana) e BA.
 * Usa login root (RLS) quando SUPABASE_SERVICE_ROLE_KEY não está definida.
 *
 * Uso: npm run seed:schools
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFile() {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvFile()

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://ggvmsicassvclxxgmuxi.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  ''
const ROOT_EMAIL = process.env.SEED_ROOT_EMAIL || 'root@geniusg.com'
const ROOT_PASSWORD = process.env.SEED_PASSWORD || '123456'

/** @type {{ name: string; municipio: string; state_uf: string }[]} */
const SCHOOLS = [
  { name: 'EMEF Municipal de Igarassu', municipio: 'Igarassu', state_uf: 'PE' },
  { name: 'EMEF Municipal de Goiana', municipio: 'Goiana', state_uf: 'PE' },
  {
    name: 'EMEF Municipal de Conceição da Feira',
    municipio: 'Conceição da Feira',
    state_uf: 'BA',
  },
  {
    name: 'EMEF Municipal de Coração de Maria',
    municipio: 'Coração de Maria',
    state_uf: 'BA',
  },
  { name: 'EMEF Municipal de Ipecaetá', municipio: 'Ipecaetá', state_uf: 'BA' },
  { name: 'EMEF Municipal de Uauá', municipio: 'Uauá', state_uf: 'BA' },
]

function createSupabase() {
  const key = SERVICE_ROLE_KEY || ANON_KEY
  if (!key) {
    console.error('Defina VITE_SUPABASE_ANON_KEY no .env ou SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  return createClient(SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function ensureRootSession(supabase) {
  if (SERVICE_ROLE_KEY) return
  const { error } = await supabase.auth.signInWithPassword({
    email: ROOT_EMAIL,
    password: ROOT_PASSWORD,
  })
  if (error) {
    console.error(`Falha ao autenticar como ${ROOT_EMAIL}:`, error.message)
    console.error('Use SUPABASE_SERVICE_ROLE_KEY ou ajuste SEED_ROOT_EMAIL / SEED_PASSWORD')
    process.exit(1)
  }
}

async function main() {
  const supabase = createSupabase()
  await ensureRootSession(supabase)

  console.log(`Inserindo ${SCHOOLS.length} escolas em ${SUPABASE_URL}...\n`)

  for (const school of SCHOOLS) {
    const { data: existing } = await supabase
      .from('schools')
      .select('id')
      .eq('name', school.name)
      .eq('municipio', school.municipio)
      .eq('state_uf', school.state_uf)
      .maybeSingle()

    if (existing) {
      console.log(`• Já existe: ${school.name} (${school.municipio} - ${school.state_uf})`)
      continue
    }

    const { error } = await supabase.from('schools').insert(school)
    if (error) throw error
    console.log(`✓ Cadastrada: ${school.name} (${school.municipio} - ${school.state_uf})`)
  }

  console.log('\nConcluído.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
