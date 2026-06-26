import type { SkillBankItem } from '@/types/database'

/** Áreas do conhecimento na BNCC — Ensino Fundamental, com foco no 5º ano. */
export const BNCC_KNOWLEDGE_AREAS = [
  { id: 'linguagens', label: 'Linguagens', order: 1 },
  { id: 'matematica', label: 'Matemática', order: 2 },
  { id: 'ciencias-natureza', label: 'Ciências da Natureza', order: 3 },
  { id: 'ciencias-humanas', label: 'Ciências Humanas', order: 4 },
  { id: 'ensino-religioso', label: 'Ensino Religioso', order: 5 },
] as const

export type BnccKnowledgeAreaId = (typeof BNCC_KNOWLEDGE_AREAS)[number]['id']

const BNCC_COMPONENT_META: Record<
  string,
  { areaId: BnccKnowledgeAreaId; component: string; componentOrder: number }
> = {
  LP: { areaId: 'linguagens', component: 'Língua Portuguesa', componentOrder: 1 },
  AR: { areaId: 'linguagens', component: 'Arte', componentOrder: 2 },
  EF: { areaId: 'linguagens', component: 'Educação Física', componentOrder: 3 },
  LI: { areaId: 'linguagens', component: 'Língua Inglesa', componentOrder: 4 },
  CO: { areaId: 'linguagens', component: 'Computação', componentOrder: 5 },
  MA: { areaId: 'matematica', component: 'Matemática', componentOrder: 1 },
  CI: { areaId: 'ciencias-natureza', component: 'Ciências', componentOrder: 1 },
  GE: { areaId: 'ciencias-humanas', component: 'Geografia', componentOrder: 1 },
  HI: { areaId: 'ciencias-humanas', component: 'História', componentOrder: 2 },
  ER: { areaId: 'ensino-religioso', component: 'Ensino Religioso', componentOrder: 1 },
}

const BNCC_CODE_RE = /^EF(\d{2})([A-Z]{2})(\d+)$/i

export interface ParsedBnccCode {
  yearsKey: string
  component: string
  number: number
  raw: string
}

export function parseBnccCode(code: string | null | undefined): ParsedBnccCode | null {
  const raw = code?.trim().toUpperCase()
  if (!raw) return null
  const match = raw.match(BNCC_CODE_RE)
  if (!match) return null
  return {
    yearsKey: match[1],
    component: match[2],
    number: parseInt(match[3], 10),
    raw,
  }
}

/** Habilidades do 5º ano: EF05, EF15 (1º–5º) e EF35 (3º–5º). */
export function bnccAppliesToFifthYear(yearsKey: string): boolean {
  return yearsKey === '05' || yearsKey === '15' || yearsKey === '35'
}

export function isBnccSkillCode(code: string | null | undefined): boolean {
  return Boolean(parseBnccCode(code))
}

export function getBnccComponentMeta(code: string | null | undefined) {
  const parsed = parseBnccCode(code)
  if (!parsed) return null
  return BNCC_COMPONENT_META[parsed.component] ?? null
}

export function getBnccKnowledgeAreaLabel(code: string | null | undefined): string {
  const meta = getBnccComponentMeta(code)
  if (!meta) return 'Sem área definida'
  return BNCC_KNOWLEDGE_AREAS.find((a) => a.id === meta.areaId)?.label ?? 'Sem área definida'
}

export function getBnccComponentLabel(code: string | null | undefined): string | null {
  return getBnccComponentMeta(code)?.component ?? null
}

function bnccCodeSortKey(code: string | null | undefined): string {
  const parsed = parseBnccCode(code)
  if (!parsed) return `z:${code || ''}`
  const meta = BNCC_COMPONENT_META[parsed.component]
  return [
    String(meta?.componentOrder ?? 99).padStart(2, '0'),
    parsed.yearsKey,
    parsed.component,
    String(parsed.number).padStart(3, '0'),
  ].join(':')
}

export interface BnccComponentGroup {
  component: string
  componentOrder: number
  items: SkillBankItem[]
}

export interface BnccKnowledgeAreaGroup {
  areaId: BnccKnowledgeAreaId | 'outros'
  area: string
  areaOrder: number
  components: BnccComponentGroup[]
  totalItems: number
}

function sortItems(items: SkillBankItem[]): SkillBankItem[] {
  return [...items].sort(
    (a, b) =>
      bnccCodeSortKey(a.code).localeCompare(bnccCodeSortKey(b.code), 'pt-BR') ||
      a.label.localeCompare(b.label, 'pt-BR'),
  )
}

/** Agrupa habilidades BNCC por área e componente curricular (5º ano). */
export function groupBnccByKnowledgeArea(
  items: SkillBankItem[],
  options?: { fifthYearOnly?: boolean },
): BnccKnowledgeAreaGroup[] {
  const fifthYearOnly = options?.fifthYearOnly ?? true
  const areaMap = new Map<string, Map<string, SkillBankItem[]>>()
  const outros: SkillBankItem[] = []

  for (const item of items) {
    const parsed = parseBnccCode(item.code)
    if (!parsed) {
      outros.push(item)
      continue
    }
    if (fifthYearOnly && !bnccAppliesToFifthYear(parsed.yearsKey)) continue

    const meta = BNCC_COMPONENT_META[parsed.component]
    if (!meta) {
      outros.push(item)
      continue
    }

    const areaLabel =
      BNCC_KNOWLEDGE_AREAS.find((a) => a.id === meta.areaId)?.label ?? 'Outros'
    if (!areaMap.has(areaLabel)) areaMap.set(areaLabel, new Map())
    const compMap = areaMap.get(areaLabel)!
    const list = compMap.get(meta.component) || []
    list.push(item)
    compMap.set(meta.component, list)
  }

  const groups: BnccKnowledgeAreaGroup[] = BNCC_KNOWLEDGE_AREAS.map((area) => {
    const compMap = areaMap.get(area.label) ?? new Map<string, SkillBankItem[]>()
    const components: BnccComponentGroup[] = [...compMap.entries()]
      .map(([component, compItems]) => ({
        component,
        componentOrder:
          Object.values(BNCC_COMPONENT_META).find((m) => m.component === component)
            ?.componentOrder ?? 99,
        items: sortItems(compItems),
      }))
      .sort((a, b) => a.componentOrder - b.componentOrder)

    const totalItems = components.reduce((sum, c) => sum + c.items.length, 0)
    return {
      areaId: area.id,
      area: area.label,
      areaOrder: area.order,
      components,
      totalItems,
    }
  })

  if (outros.length > 0) {
    groups.push({
      areaId: 'outros',
      area: 'Sem classificação',
      areaOrder: 99,
      components: [{ component: 'Outros', componentOrder: 1, items: sortItems(outros) }],
      totalItems: outros.length,
    })
  }

  return groups
}

export function filterBnccFifthYear(items: SkillBankItem[]): SkillBankItem[] {
  return items.filter((item) => {
    const parsed = parseBnccCode(item.code)
    if (!parsed) return true
    return bnccAppliesToFifthYear(parsed.yearsKey)
  })
}
