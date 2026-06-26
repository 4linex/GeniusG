import type { SkillBankItem } from '@/types/database'
import { BNCC_KNOWLEDGE_AREAS } from '@/lib/bnccKnowledgeArea'
import { SAEB_LP5_DESCRIPTOR_CODES, SAEB_LP_KNOWLEDGE_AREA } from '@/lib/saebLp5Reference'

export const SAEB_LP_COMPONENT = 'Língua Portuguesa'

export function getSaebKnowledgeArea(item: SkillBankItem): string {
  const fromDesc = item.description?.split(' · ')[0]?.trim()
  if (fromDesc && BNCC_KNOWLEDGE_AREAS.some((area) => area.label === fromDesc)) {
    return fromDesc
  }
  const code = item.code?.trim().toUpperCase()
  if (code && SAEB_LP5_DESCRIPTOR_CODES.has(code)) return SAEB_LP_KNOWLEDGE_AREA
  return 'Sem classificação'
}

export function getSaebComponent(item: SkillBankItem): string {
  const code = item.code?.trim().toUpperCase()
  if (code && SAEB_LP5_DESCRIPTOR_CODES.has(code)) return SAEB_LP_COMPONENT
  return 'Outros'
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
  }
  return values[match[1]] ?? 8000
}

function saebCodeOrder(code: string | null | undefined): number {
  const match = code?.trim().match(/^D(\d+)$/i)
  return match ? parseInt(match[1], 10) : 9999
}

function sortSaebItems(items: SkillBankItem[]): SkillBankItem[] {
  return [...items].sort(
    (a, b) =>
      saebCodeOrder(a.code) - saebCodeOrder(b.code) ||
      a.label.localeCompare(b.label, 'pt-BR'),
  )
}

export interface SaebTopicGroup {
  topic: string
  items: SkillBankItem[]
}

export interface SaebComponentGroup {
  component: string
  componentOrder: number
  topics: SaebTopicGroup[]
  items: SkillBankItem[]
}

export interface SaebKnowledgeAreaGroup {
  areaId: string
  area: string
  areaOrder: number
  components: SaebComponentGroup[]
  totalItems: number
}

const COMPONENT_ORDER: Record<string, number> = {
  [SAEB_LP_COMPONENT]: 1,
  Outros: 99,
}

/** Agrupa descritores SAEB por área do conhecimento e componente (LP 5º ano). */
export function groupSaebByKnowledgeArea(items: SkillBankItem[]): SaebKnowledgeAreaGroup[] {
  const areaMap = new Map<string, Map<string, SkillBankItem[]>>()
  const outros: SkillBankItem[] = []

  for (const item of items) {
    const area = getSaebKnowledgeArea(item)
    const component = getSaebComponent(item)

    if (area === 'Sem classificação') {
      outros.push(item)
      continue
    }

    if (!areaMap.has(area)) areaMap.set(area, new Map())
    const compMap = areaMap.get(area)!
    const list = compMap.get(component) || []
    list.push(item)
    compMap.set(component, list)
  }

  const groups: SaebKnowledgeAreaGroup[] = BNCC_KNOWLEDGE_AREAS.map((area) => {
    const compMap = areaMap.get(area.label) ?? new Map<string, SkillBankItem[]>()
    const components: SaebComponentGroup[] = [...compMap.entries()]
      .map(([component, compItems]) => {
        const topicMap = new Map<string, SkillBankItem[]>()
        for (const item of compItems) {
          const topic = item.topic?.trim() || 'Sem tópico'
          const list = topicMap.get(topic) || []
          list.push(item)
          topicMap.set(topic, list)
        }

        const topics: SaebTopicGroup[] = [...topicMap.entries()]
          .map(([topic, topicItems]) => ({
            topic,
            items: sortSaebItems(topicItems),
          }))
          .sort(
            (a, b) =>
              romanTopicOrder(a.topic) - romanTopicOrder(b.topic) ||
              a.topic.localeCompare(b.topic, 'pt-BR'),
          )

        return {
          component,
          componentOrder: COMPONENT_ORDER[component] ?? 50,
          topics,
          items: sortSaebItems(compItems),
        }
      })
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
      components: [
        {
          component: 'Outros',
          componentOrder: 1,
          topics: [{ topic: 'Sem tópico', items: sortSaebItems(outros) }],
          items: sortSaebItems(outros),
        },
      ],
      totalItems: outros.length,
    })
  }

  return groups
}
