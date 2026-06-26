import type { DashboardCharts, DashboardStats } from '@/hooks/useDashboardData'
import type { TriFormChartRow } from '@/lib/formAssessmentReport'
import type { TrailDistributionRow } from '@/lib/trailDistribution'
import {
  averageTri,
  mergeCriticalSkills,
  performanceLevelLabel,
  splitSkillLabel,
} from '@/lib/dashboardPresentation'

export function buildDashboardInsights(input: {
  stats: DashboardStats
  charts: DashboardCharts
  triByForm: TriFormChartRow[]
  trailDistribution: TrailDistributionRow[]
}): string[] {
  const { stats, charts, triByForm, trailDistribution } = input
  if (stats.totalRespostas === 0) {
    return ['Ainda não há respostas no escopo selecionado para gerar conclusões automáticas.']
  }

  const insights: string[] = []

  if (stats.mediaTurma > 0) {
    insights.push(
      `O escopo apresenta desempenho médio de ${stats.mediaTurma.toFixed(1)}% (${performanceLevelLabel(stats.mediaTurma).toLowerCase()}).`,
    )
  }

  const critical = mergeCriticalSkills(charts)
  if (critical.length >= 2) {
    insights.push(
      `As maiores dificuldades estão nas habilidades ${critical[0].code} e ${critical[1].code}.`,
    )
  } else if (critical.length === 1) {
    insights.push(`A habilidade ${critical[0].code} concentra o maior déficit registrado.`)
  }

  const weakestForm = [...charts.formTctBars].sort((a, b) => a.averageTct - b.averageTct)[0]
  if (weakestForm) {
    insights.push(
      `O formulário com menor desempenho médio é "${weakestForm.title}" (${weakestForm.averageTct.toFixed(1)}%).`,
    )
  }

  const weakestBloom = [...charts.bloomSkills].sort((a, b) => a.percentage - b.percentage)[0]
  if (weakestBloom) {
    insights.push(
      `O nível Bloom "${weakestBloom.label}" apresentou o menor resultado (${weakestBloom.percentage}%).`,
    )
  }

  const weakestBncc = charts.criticalBnccSkills[0]
  if (weakestBncc) {
    const { code } = splitSkillLabel(weakestBncc.label)
    insights.push(
      `A competência ${code} da BNCC necessita intervenção imediata (${weakestBncc.percentage}% de acerto).`,
    )
  }

  const avgTri = averageTri(triByForm)
  if (avgTri != null) {
    insights.push(`A média TRI (θ) do escopo é ${avgTri.toFixed(2)} em ${triByForm.length} formulário(s).`)
  }

  const topTrail = trailDistribution
    .filter((row) => row.key !== 'sem-trilha')
    .sort((a, b) => b.studentCount - a.studentCount)[0]
  if (topTrail) {
    insights.push(
      `${topTrail.studentCount} aluno(s) foram direcionados à trilha "${topTrail.title}" (${topTrail.percentRange}).`,
    )
  }

  if (stats.habilidadesCriticas === 0) {
    insights.push('Nenhuma habilidade BNCC ou SAEB ficou abaixo de 60% no recorte atual.')
  }

  return insights.slice(0, 6)
}
