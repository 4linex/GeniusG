/**
 * Aplica migração 032 (excluir link com respostas) no Supabase remoto.
 * Requer SUPABASE_DB_PASSWORD ou DATABASE_URL.
 *
 * Uso: SUPABASE_DB_PASSWORD=... npm run db:migrate:form-link-delete
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

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

const projectRef =
  process.env.SUPABASE_PROJECT_REF ||
  (process.env.VITE_SUPABASE_URL || '').match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ||
  'ggvmsicassvclxxgmuxi'

const dbPassword = process.env.SUPABASE_DB_PASSWORD || ''
const databaseUrl =
  process.env.DATABASE_URL ||
  (dbPassword
    ? `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`
    : '')

if (!databaseUrl) {
  console.error('Defina SUPABASE_DB_PASSWORD ou DATABASE_URL para aplicar a migração.')
  process.exit(1)
}

const sqlPath = resolve(process.cwd(), 'supabase/migrations/032_form_link_delete_set_null.sql')

const result = spawnSync(
  'npx',
  ['supabase', 'db', 'execute', '--db-url', databaseUrl, '--file', sqlPath],
  { stdio: 'inherit', shell: true, env: process.env },
)

if (result.status !== 0) {
  console.error('\nFalha ao aplicar migração. Cole o SQL manualmente no Supabase SQL Editor:')
  console.error(sqlPath)
  process.exit(result.status ?? 1)
}

console.log('Migração 032_form_link_delete_set_null aplicada com sucesso.')
