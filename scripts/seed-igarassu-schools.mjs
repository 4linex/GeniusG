/**
 * Cadastra escolas de Igarassu (PE) e turmas do 2º ao 9º ano.
 *
 * Uso: npm run seed:igarassu-schools
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

const MUNICIPIO = 'Igarassu'
const STATE_UF = 'PE'

/** @type {string[]} */
const SCHOOL_NAMES = [
  'CEI FERNANDO HENRIQUE',
  'CEI EVANGELINA DELGADO',
  'ESCOLA MUNICIPAL SÃO LUIZ',
  'CEI CECILIA MARIA',
  'ESCOLA MUNICIPAL ALBIN STAHLI',
  'ESCOLA MUNICIPAL ANTONIO DE PÁDUA',
  'ESCOLA MUNICIPAL ECILDA RAMOS',
  'ESCOLA MUNICIPAL JOÃO DE QUEIROZ GALVÃO',
  'ESCOLA MUNICIPAL JOSÉ ERONIDES',
  'ESCOLA MUNICIPAL MARIA DJANIRA LACERTA LEITE',
  'ESCOLA MUNICIPAL MIGUEL GOMES',
  'ESCOLA MUNICIPAL PASTOR ISAÍAS',
  'ESCOLA MUNICIPAL SENADOR JOSÉ ERMÍRIO',
]

const TURMAS = ['2º ano', '3º ano', '4º ano', '5º ano', '6º ano', '7º ano', '8º ano', '9º ano']

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
    process.exit(1)
  }
}

async function ensureSchool(supabase, name) {
  const { data: existing } = await supabase
    .from('schools')
    .select('id')
    .eq('name', name)
    .eq('municipio', MUNICIPIO)
    .eq('state_uf', STATE_UF)
    .maybeSingle()

  if (existing) return { id: existing.id, created: false }

  const { data, error } = await supabase
    .from('schools')
    .insert({ name, municipio: MUNICIPIO, state_uf: STATE_UF })
    .select('id')
    .single()

  if (error) throw error
  return { id: data.id, created: true }
}

async function ensureClass(supabase, schoolId, className) {
  const { data: existing } = await supabase
    .from('school_classes')
    .select('id')
    .eq('school_id', schoolId)
    .eq('name', className)
    .maybeSingle()

  if (existing) return false

  const { error } = await supabase.from('school_classes').insert({
    school_id: schoolId,
    name: className,
  })
  if (error) throw error
  return true
}

async function main() {
  const supabase = createSupabase()
  await ensureRootSession(supabase)

  console.log(`Cadastrando ${SCHOOL_NAMES.length} escolas em ${MUNICIPIO} - ${STATE_UF}`)
  console.log(`Turmas por escola: ${TURMAS.join(', ')}\n`)
  console.log(`Supabase: ${SUPABASE_URL}\n`)

  let schoolsCreated = 0
  let schoolsExisting = 0
  let classesCreated = 0
  let classesExisting = 0

  for (const name of SCHOOL_NAMES) {
    const { id, created } = await ensureSchool(supabase, name)
    if (created) {
      schoolsCreated += 1
      console.log(`✓ Escola cadastrada: ${name}`)
    } else {
      schoolsExisting += 1
      console.log(`• Escola já existia: ${name}`)
    }

    for (const turma of TURMAS) {
      const classCreated = await ensureClass(supabase, id, turma)
      if (classCreated) classesCreated += 1
      else classesExisting += 1
    }
    console.log(`  → ${TURMAS.length} turmas verificadas`)
  }

  console.log('\n--- Resumo ---')
  console.log(`Escolas novas: ${schoolsCreated}`)
  console.log(`Escolas já existentes: ${schoolsExisting}`)
  console.log(`Turmas novas: ${classesCreated}`)
  console.log(`Turmas já existentes: ${classesExisting}`)
  console.log('\nConcluído.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
