/**
 * Cria usuários root, admin e professor no Supabase local.
 * Uso: npm run seed:users
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || '123456'

const USERS = [
  { email: 'root@mvp-rda.local', full_name: 'Root Sistema', role: 'root' },
  { email: 'admin@mvp-rda.local', full_name: 'Admin RDA', role: 'admin' },
  { email: 'professor@mvp-rda.local', full_name: 'Professor RDA', role: 'professor' },
]

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function findUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null
}

async function upsertUser({ email, full_name, role }) {
  const existing = await findUserByEmail(email)

  if (existing) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name, role },
    })
    if (updateError) throw updateError

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name, role })
      .eq('id', existing.id)

    if (profileError) throw profileError

    console.log(`✓ Atualizado: ${email} (${role})`)
    return
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name, role },
  })

  if (error) throw error

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name, role })
    .eq('id', data.user.id)

  if (profileError) throw profileError

  console.log(`✓ Criado: ${email} (${role})`)
}

async function main() {
  console.log('Criando usuários padrão...\n')

  for (const user of USERS) {
    await upsertUser(user)
  }

  console.log(`\nSenha padrão: ${DEFAULT_PASSWORD}`)
  console.log('\nContas:')
  for (const u of USERS) {
    console.log(`  - ${u.email} → ${u.role}`)
  }
}

main().catch((err) => {
  console.error('Erro:', err.message || err)
  process.exit(1)
})
