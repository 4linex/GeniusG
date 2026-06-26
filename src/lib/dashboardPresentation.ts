import type { DashboardCharts, DashboardStats } from '@/hooks/useDashboardData'
import type { TriFormChartRow } from '@/lib/formAssessmentReport'
import { getPerformanceStatus, PERFORMANCE_STATUS_LABELS } from '@/hooks/useScopedResponses'
import { parseSkillLabel } from '@/lib/skillBank'
import type { TrailDistributionRow } from '@/lib/trailDistribution'

export const BI_BAR_PALETTE = [
  '#8b5cf6',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#06b6d4',
  '#ec4899',
  '#6366f1',
  '#14b8a6',
]

export const NIVEL_DISTRIBUTION = [
  { key: 'excelente' as const, label: 'Avançado', color: '#10b981' },
  { key: 'bom' as const, label: 'Proficiente', color: '#3b82f6' },
  { key: 'regular' as const, label: 'Em Desenvolvimento', color: '#f59e0b' },
  { key: 'atencao' as const, label: 'Iniciante', color: '#f97316' },
]

export type SkillPriority = 'alta' | 'media' | 'baixa'

export function averageTri(thetaRows: TriFormChartRow[]): number | null {
  const values = thetaRows
    .map((row) => row.averageTheta)
    .filter((value): value is number => value != null)
  if (values.length === 0) return null
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100
}

export function performanceLevelLabel(tct: number): string {
  const status = getPerformanceStatus(tct)
  const map = {
    excelente: 'Nível: Avançado',
    bom: 'Nível: Proficiente',
    regular: 'Nível: Em desenvolvimento',
    atencao: 'Nível: Iniciante',
  }
  return map[status]
}

export function competencyCount(charts: DashboardCharts): number {
  const labels = new Set<string>()
  for (const skill of charts.criticalBnccSkills) labels.add(skill.label)
  for (const skill of charts.criticalSaebSkills) labels.add(skill.label)
  for (const skill of charts.bloomSkills) labels.add(skill.label)
  return labels.size
}

export function skillPriority(percentage: number): SkillPriority {
  if (percentage < 40) return 'alta'
  if (percentage < 50) return 'media'
  return 'baixa'
}

export function skillPriorityLabel(priority: SkillPriority): string {
  if (priority === 'alta') return 'Alta'
  if (priority === 'media') return 'Média'
  return 'Baixa'
}

export function bnccSituation(percentage: number): {
  label: string
  variant: 'success' | 'info' | 'warning' | 'danger'
} {
  if (percentage >= 80) return { label: 'Excelente', variant: 'success' }
  if (percentage >= 60) return { label: 'Bom', variant: 'info' }
  if (percentage >= 40) return { label: 'Em Desenvolvimento', variant: 'warning' }
  return { label: 'Crítico', variant: 'danger' }
}

export function sparklineFromBuckets(
  buckets: { label: string; count: number }[],
  fallback: number[],
): number[] {
  const values = buckets.map((bucket) => bucket.count)
  if (values.some((value) => value > 0)) return values
  return fallback
}

export function sparklineFromForms(forms: { averageTct: number }[]): number[] {
  if (forms.length === 0) return [0]
  return forms.slice(0, 8).map((form) => form.averageTct)
}

export function participationRate(stats: DashboardStats): number {
  if (stats.avaliacoesAplicadas === 0) return 0
  return Math.round((stats.totalRespostas / stats.avaliacoesAplicadas) * 100)
}

export function splitSkillLabel(label: string) {
  const parsed = parseSkillLabel(label)
  return {
    code: parsed.code || label.slice(0, 12),
    description: parsed.description || label,
  }
}

export function mergeCriticalSkills(charts: DashboardCharts) {
  const rows = [
    ...charts.criticalBnccSkills.map((skill) => ({ ...skill, kind: 'BNCC' as const })),
    ...charts.criticalSaebSkills.map((skill) => ({ ...skill, kind: 'SAEB' as const })),
  ]
  return rows
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 8)
    .map((skill) => {
      const { code, description } = splitSkillLabel(skill.label)
      const priority = skillPriority(skill.percentage)
      return { ...skill, code, description, priority }
    })
}

export function rankingForms(
  forms: { formId: string; title: string; averageTct: number; totalResponses: number }[],
) {
  return [...forms].sort((a, b) => a.averageTct - b.averageTct).slice(0, 8)
}

export function rankingTrails(rows: TrailDistributionRow[]) {
  return [...rows]
    .filter((row) => row.key !== 'sem-trilha')
    .sort((a, b) => b.studentCount - a.studentCount)
}

export function evolutionLabel(stats: DashboardStats): string {
  if (stats.mediaMesAnterior <= 0) return 'Sem histórico do mês anterior'
  const delta = Math.round((stats.mediaTurma - stats.mediaMesAnterior) * 10) / 10
  return `${delta >= 0 ? '+' : ''}${delta}% vs mês anterior`
}

export function dominantStatusLabel(charts: DashboardCharts): string {
  const entries = Object.entries(charts.statusCounts) as Array<
    [keyof DashboardCharts['statusCounts'], number]
  >
  const top = entries.sort((a, b) => b[1] - a[1])[0]
  if (!top || top[1] === 0) return 'Sem classificação'
  return PERFORMANCE_STATUS_LABELS[top[0]]
}
