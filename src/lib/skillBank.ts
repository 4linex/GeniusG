import { supabase } from '@/lib/supabase'
import { isBnccSkillCode } from '@/lib/bnccKnowledgeArea'
import type { SkillBankItem, SkillBankRelation, SkillBankType } from '@/types/database'

export function formatSkillBankValue(item: Pick<SkillBankItem, 'code' | 'label'>): string {
  const label = item.label.trim()
  const code = item.code?.trim()
  if (code && label) return `${code} – ${label}`
  return code || label
}

export function formatSaebDescriptor(item: SkillBankItem): string {
  return formatSkillBankValue(item)
}

export function formatBnccSkill(item: SkillBankItem): string {
  return formatSkillBankValue(item)
}

/** Separa código e descrição de valores como "EF35LP05 – Texto" ou "D3 - Texto". */
export function parseSkillLabel(value: string): { code: string; description: string } {
  const trimmed = value.trim()
  if (!trimmed) return { code: '', description: '' }

  for (const sep of [' – ', ' - ', ' — ']) {
    const idx = trimmed.indexOf(sep)
    if (idx > 0) {
      return {
        code: trimmed.slice(0, idx).trim(),
        description: trimmed.slice(idx + sep.length).trim(),
      }
    }
  }

  const match = trimmed.match(/^(EF\d{2}[A-Z]{2}\d+|D\d+)\s*[-–—]\s*(.+)$/i)
  if (match) {
    return { code: match[1], description: match[2].trim() }
  }

  if (/^(EF\d{2}[A-Z]{2}\d+|D\d+)$/i.test(trimmed)) {
    return { code: trimmed, description: '' }
  }

  return { code: trimmed, description: '' }
}

export function isSaebCode(code: string | null | undefined): boolean {
  return Boolean(code?.trim().match(/^D\d+$/i))
}

export function isBnccCode(code: string | null | undefined): boolean {
  return isBnccSkillCode(code)
}

export async function loadSkillBankItems(type?: SkillBankType): Promise<SkillBankItem[]> {
  let query = supabase.from('skill_bank_items').select('*').order('order_index')
  if (type) query = query.eq('type', type)

  const { data, error } = await query
  if (error) throw error
  return (data as SkillBankItem[]) || []
}

export async function loadSkillBankRelations(): Promise<SkillBankRelation[]> {
  const { data, error } = await supabase
    .from('skill_bank_relations')
    .select(`
      id,
      saeb_item_id,
      bncc_item_id,
      is_essential,
      created_at,
      saeb:saeb_item_id(id, type, code, label, topic, bloom_hint),
      bncc:bncc_item_id(id, type, code, label)
    `)

  if (error) throw error
  return (data as unknown as SkillBankRelation[]) || []
}

export async function createSkillBankItem(
  type: SkillBankType,
  label: string,
  code?: string,
  extra?: {
    description?: string
    topic?: string
    bloom_hint?: string
    ano_serie?: string
  },
  orderIndex?: number,
): Promise<SkillBankItem> {
  const { data, error } = await supabase
    .from('skill_bank_items')
    .insert({
      type,
      label: label.trim(),
      code: code?.trim() || null,
      description: extra?.description?.trim() || null,
      topic: extra?.topic?.trim() || null,
      bloom_hint: extra?.bloom_hint?.trim() || null,
      ano_serie: extra?.ano_serie?.trim() || null,
      order_index: orderIndex ?? 0,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as SkillBankItem
}

export async function updateSkillBankItem(
  id: string,
  patch: {
    label?: string
    code?: string | null
    description?: string | null
    topic?: string | null
    bloom_hint?: string | null
    ano_serie?: string | null
    order_index?: number
  },
): Promise<void> {
  const { error } = await supabase
    .from('skill_bank_items')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteSkillBankItem(id: string): Promise<void> {
  const { error } = await supabase.from('skill_bank_items').delete().eq('id', id)
  if (error) throw error
}

export function skillBankSelectOptions(items: SkillBankItem[]) {
  return [
    { value: '', label: 'Selecione...' },
    ...items.map((item) => ({
      value: formatSkillBankValue(item),
      label: formatSkillBankValue(item),
    })),
  ]
}

function normalizeSkillValue(value: string): string {
  return value.trim().toLowerCase()
}

export function itemMatchesValue(item: SkillBankItem, value: string): boolean {
  const normalized = normalizeSkillValue(value)
  if (!normalized) return true
  if (normalizeSkillValue(formatSkillBankValue(item)) === normalized) return true
  if (item.code && normalizeSkillValue(item.code) === normalized) return true
  if (normalizeSkillValue(item.label) === normalized) return true
  return false
}

export function findSkillBankItem(items: SkillBankItem[], value: string): SkillBankItem | undefined {
  return items.find((item) => itemMatchesValue(item, value))
}

function parseSkillBankInput(value: string): { code?: string; label: string } {
  const trimmed = value.trim()
  const dashIdx = trimmed.indexOf(' – ')
  if (dashIdx > 0) {
    const code = trimmed.slice(0, dashIdx).trim()
    const label = trimmed.slice(dashIdx + 3).trim()
    return { code: code || undefined, label: label || trimmed }
  }
  return { label: trimmed }
}

function validateSkillCode(type: SkillBankType, code?: string): void {
  if (!code) return
  if (type === 'saeb' && !isSaebCode(code)) {
    throw new Error('Código SAEB inválido. Use o formato D1, D3, D11 etc.')
  }
  if (type === 'bncc' && !isBnccCode(code)) {
    throw new Error(
      'Código BNCC inválido. Use o formato EF05LP03, EF15MA01 etc. (5º ano: EF05, EF15 ou EF35).',
    )
  }
}

/** Garante que o valor usado na questão exista no banco; cria se for novo. */
export async function ensureSkillBankItem(
  type: SkillBankType,
  value: string | null | undefined,
  existingItems?: SkillBankItem[],
): Promise<SkillBankItem | null> {
  const trimmed = value?.trim()
  if (!trimmed) return null

  const items = existingItems ?? (await loadSkillBankItems(type))
  const existing = findSkillBankItem(items, trimmed)
  if (existing) return existing

  const { code, label } = parseSkillBankInput(trimmed)
  validateSkillCode(type, code)

  const { data, error } = await supabase
    .from('skill_bank_items')
    .insert({
      type,
      label,
      code: code || null,
      order_index: items.length,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as SkillBankItem
}

export async function ensureSkillBankRelation(saebId: string, bnccId: string): Promise<void> {
  const { error } = await supabase.from('skill_bank_relations').upsert(
    { saeb_item_id: saebId, bncc_item_id: bnccId, is_essential: false },
    { onConflict: 'saeb_item_id,bncc_item_id' },
  )
  if (error) throw error
}

export async function syncSkillBankRelations(saebId: string, bnccIds: string[]): Promise<void> {
  const unique = [...new Set(bnccIds.filter(Boolean))]

  const { data: existing, error: loadError } = await supabase
    .from('skill_bank_relations')
    .select('id, bncc_item_id')
    .eq('saeb_item_id', saebId)

  if (loadError) throw loadError

  const existingBnccIds = new Set((existing || []).map((row) => row.bncc_item_id))
  const toDelete = (existing || [])
    .filter((row) => !unique.includes(row.bncc_item_id))
    .map((row) => row.id)

  if (toDelete.length > 0) {
    const { error } = await supabase.from('skill_bank_relations').delete().in('id', toDelete)
    if (error) throw error
  }

  const toInsert = unique.filter((id) => !existingBnccIds.has(id))
  if (toInsert.length > 0) {
    const { error } = await supabase.from('skill_bank_relations').insert(
      toInsert.map((bnccId) => ({
        saeb_item_id: saebId,
        bncc_item_id: bnccId,
        is_essential: true,
      })),
    )
    if (error) throw error
  }
}

export function getRelatedBnccIdsForSaeb(
  saebId: string,
  relations: SkillBankRelation[],
): string[] {
  return relations.filter((r) => r.saeb_item_id === saebId).map((r) => r.bncc_item_id)
}

export async function ensureSkillBankFromQuestionFields(fields: {
  descritor_saeb?: string | null
  habilidade_bncc?: string | null
  nivel_bloom?: string | null
}): Promise<void> {
  const [bncc, bloom, saeb] = await Promise.all([
    loadSkillBankItems('bncc'),
    loadSkillBankItems('bloom'),
    loadSkillBankItems('saeb'),
  ])

  const saebItem = await ensureSkillBankItem('saeb', fields.descritor_saeb, saeb)
  const bnccItem = await ensureSkillBankItem('bncc', fields.habilidade_bncc, bncc)
  await ensureSkillBankItem('bloom', fields.nivel_bloom, bloom)

  if (saebItem && bnccItem) {
    await ensureSkillBankRelation(saebItem.id, bnccItem.id)
  }
}

export function getRelatedBnccForSaeb(
  saebValue: string,
  saebItems: SkillBankItem[],
  bnccItems: SkillBankItem[],
  relations: SkillBankRelation[],
): SkillBankItem[] {
  const saeb = findSkillBankItem(saebItems, saebValue)
  if (!saeb) return bnccItems

  const linkedIds = new Set(
    relations.filter((r) => r.saeb_item_id === saeb.id).map((r) => r.bncc_item_id),
  )
  const linked = bnccItems.filter((b) => linkedIds.has(b.id))
  return linked.length > 0 ? linked : bnccItems
}

export function getBloomHintForSaeb(saebValue: string, saebItems: SkillBankItem[]): string | null {
  const saeb = findSkillBankItem(saebItems, saebValue)
  return saeb?.bloom_hint?.trim() || null
}

function romanTopicOrder(topic: string): number {
  const match = topic.trim().match(/^([IVXLC]+)\./)
  if (!match) return topic === 'Sem tópico' ? 9999 : 9000
  const values: Record<string, number> = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6,
    VII: 7,
    VIII: 8,
    IX: 9,
    X: 10,
    XI: 11,
    XII: 12,
  }
  return values[match[1]] ?? 8000
}

function saebCodeOrder(code: string | null | undefined): number {
  const match = code?.trim().match(/^D(\d+)$/i)
  return match ? parseInt(match[1], 10) : 9999
}

export { groupBnccByKnowledgeArea, filterBnccFifthYear, getBnccKnowledgeAreaLabel, getBnccComponentLabel } from '@/lib/bnccKnowledgeArea'
export {
  groupSaebByKnowledgeArea,
  getSaebKnowledgeArea,
  getSaebComponent,
} from '@/lib/saebKnowledgeArea'

export function groupSaebByTopic(items: SkillBankItem[]): { topic: string; items: SkillBankItem[] }[] {
  const map = new Map<string, SkillBankItem[]>()
  for (const item of items) {
    const topic = item.topic?.trim() || 'Sem tópico'
    const list = map.get(topic) || []
    list.push(item)
    map.set(topic, list)
  }

  return [...map.entries()]
    .map(([topic, groupItems]) => ({
      topic,
      items: [...groupItems].sort((a, b) => saebCodeOrder(a.code) - saebCodeOrder(b.code)),
    }))
    .sort(
      (a, b) =>
        romanTopicOrder(a.topic) - romanTopicOrder(b.topic) ||
        a.topic.localeCompare(b.topic, 'pt-BR'),
    )
}
