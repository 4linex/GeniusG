import { countByPerformanceStatus } from '@/lib/reportAnalytics'
import { skillPriority } from '@/lib/dashboardPresentation'
import { parseSkillLabel } from '@/lib/skillBank'
import { loadTrailDistribution } from '@/lib/trailDistribution'
import type { SkillBreakdownRow } from '@/lib/formAssessmentReport'

export interface RecoveryReportNivelSegment {
  label: string
  count: number
  percentage: number
  color: string
}

export interface RecoveryReportCriticalSkill {
  code: string
  description: string
  percentage: number
  priority: 'alta' | 'media' | 'baixa'
}

export interface RecoveryReportTrailRanking {
  rank: number
  title: string
  percentRange: string
  studentCount: number
  responseCount: number
}

export interface RecoveryReportErrorDescriptor {
  code: string
  description: string
  errorRate: number
}

export interface RecoveryReportEvolutionPoint {
  label: string
  value: number
}

const MONTH_LABELS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

/** Série temporal de desempenho (TCT médio) agrupada por mês a partir das respostas reais. */
export function buildEvolutionSeries(
  responses: Array<{ completed_at: string; percentual_acerto?: number | null }>,
  maxPoints = 6,
): RecoveryReportEvolutionPoint[] {
  const buckets = new Map<string, { sum: number; count: number; sort: number; label: string }>()

  for (const r of responses) {
    if (r.percentual_acerto == null || !r.completed_at) continue
    const d = new Date(r.completed_at)
    if (Number.isNaN(d.getTime())) continue
    const year = d.getFullYear()
    const month = d.getMonth()
    const key = `${year}-${String(month).padStart(2, '0')}`
    const cur =
      buckets.get(key) ||
      {
        sum: 0,
        count: 0,
        sort: year * 12 + month,
        label: `${MONTH_LABELS[month]}/${String(year).slice(2)}`,
      }
    cur.sum += r.percentual_acerto
    cur.count += 1
    buckets.set(key, cur)
  }

  return [...buckets.values()]
    .sort((a, b) => a.sort - b.sort)
    .slice(-maxPoints)
    .map((b) => ({ label: b.label, value: Math.round((b.sum / b.count) * 10) / 10 }))
}

const NIVEL_COLORS = {
  excelente: '#10b981',
  bom: '#3b82f6',
  regular: '#f59e0b',
  atencao: '#f97316',
} as const

const NIVEL_LABELS = {
  excelente: 'Avançado',
  bom: 'Proficiente',
  regular: 'Em Desenvolvimento',
  atencao: 'Iniciante',
} as const

export function buildNivelDistribution(
  responses: { percentual_acerto?: number | null }[],
): RecoveryReportNivelSegment[] {
  const counts = countByPerformanceStatus(responses as Parameters<typeof countByPerformanceStatus>[0])
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0) || 1

  return (Object.keys(counts) as Array<keyof typeof counts>).map((key) => ({
    label: NIVEL_LABELS[key],
    count: counts[key],
    percentage: Math.round((counts[key] / total) * 100),
    color: NIVEL_COLORS[key],
  }))
}

export function buildCriticalSkillsTable(
  bncc: SkillBreakdownRow[],
  saeb: SkillBreakdownRow[],
): RecoveryReportCriticalSkill[] {
  const rows = [
    ...bncc.filter((skill) => skill.percentage < 60),
    ...saeb.filter((skill) => skill.percentage < 60),
  ]
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 8)

  return rows.map((skill) => {
    const { code, description } = parseSkillLabel(skill.label)
    const priority = skillPriority(skill.percentage)
    return {
      code: code || skill.label.slice(0, 12),
      description: description || skill.label,
      percentage: skill.percentage,
      priority,
    }
  })
}

export function buildErrorDescriptors(saeb: SkillBreakdownRow[]): RecoveryReportErrorDescriptor[] {
  return [...saeb]
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 8)
    .map((skill) => {
      const { code, description } = parseSkillLabel(skill.label)
      return {
        code: code || skill.label.slice(0, 12),
        description: description || skill.label,
        errorRate: 100 - skill.percentage,
      }
    })
}

export async function buildTrailRanking(
  responses: Array<{
    id: string
    student_email: string
    form_id?: string
    percentual_acerto?: number | null
    correct_answers?: number | null
    total_questions?: number | null
  }>,
): Promise<RecoveryReportTrailRanking[]> {
  const rows = await loadTrailDistribution(responses)
  return rows
    .filter((row) => row.key !== 'sem-trilha')
    .sort((a, b) => b.studentCount - a.studentCount)
    .map((row, index) => ({
      rank: index + 1,
      title: row.title,
      percentRange: row.percentRange,
      studentCount: row.studentCount,
      responseCount: row.responseCount,
    }))
}

export function buildExecutiveSummary(input: {
  overallPercentage: number
  uniqueStudents: number
  totalResponses: number
  weakSkills: string[]
  weakestForm?: string
  weakestBloom?: string
  municipio?: string
  escola?: string
  turma?: string
  trailRanking?: RecoveryReportTrailRanking[]
}): string {
  const scope = [input.turma, input.escola, input.municipio].filter(Boolean).join(' · ')
  const scopeText = scope ? ` no recorte ${scope}` : ''

  const parts = [
    `A análise${scopeText} considera ${input.totalResponses} resposta(s) de ${input.uniqueStudents} aluno(s), com desempenho médio de ${input.overallPercentage.toFixed(1)}%.`,
  ]

  if (input.weakSkills.length >= 2) {
    const { code: a } = parseSkillLabel(input.weakSkills[0])
    const { code: b } = parseSkillLabel(input.weakSkills[1])
    parts.push(`As maiores dificuldades concentram-se nas habilidades ${a} e ${b}.`)
  }

  if (input.weakestForm) {
    parts.push(`O menor desempenho médio foi registrado em "${input.weakestForm}".`)
  }

  if (input.weakestBloom) {
    parts.push(`O nível Bloom "${input.weakestBloom}" apresentou o menor resultado.`)
  }

  const topTrail = input.trailRanking?.[0]
  if (topTrail) {
    parts.push(
      `A trilha "${topTrail.title}" concentra ${topTrail.studentCount} aluno(s) (${topTrail.percentRange}).`,
    )
  }

  return parts.join(' ')
}
