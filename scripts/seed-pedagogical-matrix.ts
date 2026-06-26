/**
 * Popula a matriz pedagógica LP 5º ano (SAEB, BNCC, relações).
 * Uso: npm run seed:pedagogical-matrix
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { MATRIX_BNCC_SKILLS, MATRIX_SAEB_DESCRIPTORS } from '../src/lib/pedagogicalMatrix.ts'
import { SAEB_LP5_DESCRIPTOR_CODES } from '../src/lib/saebLp5Reference.ts'

const SOURCE_NOTE =
  'Inep/MEC — Matriz de Referência de Língua Portuguesa (SAEB 2001), 5º ano EF.'

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
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const ROOT_EMAIL = process.env.SEED_ROOT_EMAIL || 'root@geniusg.com'
const ROOT_PASSWORD = process.env.SEED_PASSWORD || '123456'

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

async function ensureRootSession(supabase: ReturnType<typeof createSupabase>) {
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

async function cleanupMisclassified(supabase: ReturnType<typeof createSupabase>) {
  const matrixSaebCodes = SAEB_LP5_DESCRIPTOR_CODES
  const matrixBnccCodes = new Set(MATRIX_BNCC_SKILLS.map((s) => s.code))

  const { data: allItems, error } = await supabase
    .from('skill_bank_items')
    .select('id, type, code, label')
  if (error) throw error
  if (!allItems?.length) return

  const toDelete: string[] = []
  for (const item of allItems) {
    const code = item.code?.trim() || ''
    if (item.type === 'bncc' && /^D\d+$/i.test(code) && !matrixBnccCodes.has(code)) {
      toDelete.push(item.id)
    }
    if (item.type === 'saeb' && /^EF\d+LP\d+$/i.test(code) && !matrixSaebCodes.has(code)) {
      toDelete.push(item.id)
    }
    if (item.type === 'saeb' && /^D\d+$/i.test(code) && !matrixSaebCodes.has(code)) {
      toDelete.push(item.id)
    }
    if (item.type === 'saeb' && !code && item.label.match(/^EF\d+LP/i)) {
      toDelete.push(item.id)
    }
    if (item.type === 'bncc' && !code && item.label.match(/^D\d+/i)) {
      toDelete.push(item.id)
    }
  }

  if (toDelete.length) {
    const { error: delErr } = await supabase.from('skill_bank_items').delete().in('id', toDelete)
    if (delErr) throw delErr
    console.log(`✓ Removidos ${toDelete.length} itens fora da matriz LP 5º ano`)
  }
}

async function main() {
  const supabase = createSupabase()
  await ensureRootSession(supabase)

  console.log('Semeando matriz pedagógica LP 5º ano (SAEB + BNCC)...\n')

  await cleanupMisclassified(supabase)

  const bnccIdByCode = new Map<string, string>()
  for (let i = 0; i < MATRIX_BNCC_SKILLS.length; i++) {
    const skill = MATRIX_BNCC_SKILLS[i]
    const { data: found } = await supabase
      .from('skill_bank_items')
      .select('id')
      .eq('type', 'bncc')
      .eq('code', skill.code)
      .maybeSingle()

    if (found?.id) {
      await supabase
        .from('skill_bank_items')
        .update({ label: skill.label, order_index: i, updated_at: new Date().toISOString() })
        .eq('id', found.id)
      bnccIdByCode.set(skill.code, found.id)
      console.log(`✓ BNCC atualizado: ${skill.code}`)
    } else {
      const { data: inserted, error } = await supabase
        .from('skill_bank_items')
        .insert({ type: 'bncc', code: skill.code, label: skill.label, order_index: i })
        .select('id')
        .single()
      if (error) throw error
      bnccIdByCode.set(skill.code, inserted.id)
      console.log(`✓ BNCC criado: ${skill.code}`)
    }
  }

  const saebIdByCode = new Map<string, string>()
  for (let i = 0; i < MATRIX_SAEB_DESCRIPTORS.length; i++) {
    const desc = MATRIX_SAEB_DESCRIPTORS[i]
    const { data: found } = await supabase
      .from('skill_bank_items')
      .select('id')
      .eq('type', 'saeb')
      .eq('code', desc.code)
      .maybeSingle()

    const payload = {
      label: desc.label,
      topic: desc.topic,
      bloom_hint: desc.bloomHint || null,
      ano_serie: '5º Ano',
      description: `${desc.knowledgeArea} · ${SOURCE_NOTE}`,
      order_index: i,
      updated_at: new Date().toISOString(),
    }

    if (found?.id) {
      await supabase.from('skill_bank_items').update(payload).eq('id', found.id)
      saebIdByCode.set(desc.code, found.id)
      console.log(`✓ SAEB atualizado: ${desc.code}`)
    } else {
      const { data: inserted, error } = await supabase
        .from('skill_bank_items')
        .insert({
          type: 'saeb',
          code: desc.code,
          ...payload,
        })
        .select('id')
        .single()
      if (error) throw error
      saebIdByCode.set(desc.code, inserted.id)
      console.log(`✓ SAEB criado: ${desc.code}`)
    }
  }

  const { data: relRows } = await supabase.from('skill_bank_relations').select('id')
  if (relRows?.length) {
    await supabase.from('skill_bank_relations').delete().in('id', relRows.map((r) => r.id))
  }

  let relationCount = 0
  for (const desc of MATRIX_SAEB_DESCRIPTORS) {
    const saebId = saebIdByCode.get(desc.code)
    if (!saebId) continue
    for (const bnccCode of desc.bnccCodes) {
      const bnccId = bnccIdByCode.get(bnccCode)
      if (!bnccId) continue
      const { error } = await supabase.from('skill_bank_relations').insert({
        saeb_item_id: saebId,
        bncc_item_id: bnccId,
        is_essential: true,
      })
      if (error) throw error
      relationCount++
    }
  }

  console.log(`\n✓ ${MATRIX_SAEB_DESCRIPTORS.length} descritores SAEB (LP · 5º ano · Linguagens)`)
  console.log(`✓ ${MATRIX_BNCC_SKILLS.length} habilidades BNCC`)
  console.log(`✓ ${relationCount} relações SAEB ↔ BNCC`)
}

main().catch((err) => {
  console.error('Erro:', err.message || err)
  process.exit(1)
})
