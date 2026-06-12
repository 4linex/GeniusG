import { supabase } from '@/lib/supabase'
import { loadFormAssessmentDetail, loadTriByFormChart, type SkillBreakdownRow } from '@/lib/formAssessmentReport'
import { APP_NAME, APP_TAGLINE } from '@/lib/branding'
import { NIVEL_PROFICIENCIA_LABELS } from '@/lib/scoring'
import type { NivelProficiencia } from '@/types/database'

export type RecoveryReportKind = 'student' | 'form' | 'skills'

export type PerformanceLevel = 'adequado' | 'desenvolvimento' | 'iniciante' | 'nao_desenvolvido'

export interface PerformanceBreakdownItem {
  level: PerformanceLevel
  label: string
  percentage: number
  count: number
}

export interface AreaPerformanceRow {
  label: string
  percentage: number
  level: PerformanceLevel
  detail?: string
}

export interface TriSummaryRow {
  label: string
  averageTheta: number | null
  averageTct: number
  totalResponses: number
}

export interface RecoveryReportData {
  kind: RecoveryReportKind
  reportTitle: string
  reportDate: string
  studentName?: string
  studentEmail?: string
  turma?: string
  escola?: string
  formTitle?: string
  periodo?: string
  overallPercentage: number
  averageTheta?: number | null
  totalItems?: number
  highlights: string[]
  performanceBreakdown: PerformanceBreakdownItem[]
  areaRows: AreaPerformanceRow[]
  weakSkills: string[]
  recommendations: string[]
  triSummary?: TriSummaryRow[]
  bloomRows?: AreaPerformanceRow[]
}

export const PERFORMANCE_LEVEL_LABELS: Record<PerformanceLevel, string> = {
  adequado: 'Adequado',
  desenvolvimento: 'Em desenvolvimento',
  iniciante: 'Iniciante',
  nao_desenvolvido: 'Não desenvolvido',
}

export const PERFORMANCE_LEVEL_COLORS: Record<PerformanceLevel, string> = {
  adequado: '#22c55e',
  desenvolvimento: '#a855f7',
  iniciante: '#eab308',
  nao_desenvolvido: '#ef4444',
}

export function percentageToLevel(pct: number): PerformanceLevel {
  if (pct >= 70) return 'adequado'
  if (pct >= 50) return 'desenvolvimento'
  if (pct >= 30) return 'iniciante'
  return 'nao_desenvolvido'
}

function formatReportDate(date = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

function avgTheta(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null)
  if (nums.length === 0) return null
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100
}

function skillsToAreaRows(skills: SkillBreakdownRow[], detailPrefix?: string): AreaPerformanceRow[] {
  return skills.map((s) => ({
    label: s.label,
    percentage: s.percentage,
    level: percentageToLevel(s.percentage),
    detail: detailPrefix ? `${detailPrefix}: ${s.correct}/${s.total}` : `${s.correct}/${s.total} acertos`,
  }))
}

function buildBreakdownFromPercentages(items: { pct: number }[]): PerformanceBreakdownItem[] {
  const counts: Record<PerformanceLevel, number> = {
    adequado: 0,
    desenvolvimento: 0,
    iniciante: 0,
    nao_desenvolvido: 0,
  }

  for (const item of items) {
    counts[percentageToLevel(item.pct)]++
  }

  const total = items.length || 1
  return (Object.keys(counts) as PerformanceLevel[]).map((level) => ({
    level,
    label: PERFORMANCE_LEVEL_LABELS[level],
    count: counts[level],
    percentage: Math.round((counts[level] / total) * 100),
  }))
}

function buildRecommendations(weakSkills: string[], kind: RecoveryReportKind): string[] {
  const recs: string[] = []

  if (weakSkills.length > 0) {
    recs.push(`Priorizar reforço nas habilidades: ${weakSkills.slice(0, 3).join(', ')}.`)
  }

  if (kind === 'student') {
    recs.push('Retomar atividades guiadas com foco nas questões incorretas dos formulários respondidos.')
    recs.push('Acompanhar a evolução nas próximas avaliações para verificar consolidação das habilidades.')
  } else if (kind === 'form') {
    recs.push('Revisar em sala as questões vinculadas às habilidades com menor desempenho.')
    recs.push('Utilizar trilhas de recomposição associadas à faixa de desempenho dos alunos.')
  } else {
    recs.push('Organizar intervenções por grupos de habilidades com desempenho abaixo de 60%.')
    recs.push('Cruzar dados de Bloom e BNCC para planejar atividades de complexidade gradual.')
  }

  if (recs.length < 3) {
    recs.push('Manter rotina de prática e feedback formativo para consolidar aprendizagens.')
  }

  return recs.slice(0, 4)
}

async function aggregateSkillsFromResponseIds(responseIds: string[]) {
  if (responseIds.length === 0) {
    return { bncc: [] as SkillBreakdownRow[], bloom: [] as SkillBreakdownRow[] }
  }

  const { data: answers } = await supabase
    .from('response_answers')
    .select('is_correct, question:questions(habilidade_bncc, descritor_saeb, nivel_bloom)')
    .in('response_id', responseIds)

  const byHabilidade = new Map<string, { total: number; correct: number }>()
  const byBloom = new Map<string, { total: number; correct: number }>()

  for (const a of answers || []) {
    const q = a.question as unknown as {
      habilidade_bncc: string | null
      descritor_saeb: string | null
      nivel_bloom: string | null
    } | null

    const habKey = q?.habilidade_bncc || q?.descritor_saeb || 'Sem habilidade'
    const hab = byHabilidade.get(habKey) || { total: 0, correct: 0 }
    hab.total++
    if (a.is_correct) hab.correct++
    byHabilidade.set(habKey, hab)

    const bloomKey = q?.nivel_bloom || 'Sem nível Bloom'
    const bloom = byBloom.get(bloomKey) || { total: 0, correct: 0 }
    bloom.total++
    if (a.is_correct) bloom.correct++
    byBloom.set(bloomKey, bloom)
  }

  const toRows = (map: Map<string, { total: number; correct: number }>) =>
    Array.from(map.entries())
      .map(([key, s]) => ({
        key,
        label: key,
        total: s.total,
        correct: s.correct,
        percentage: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      }))
      .sort((a, b) => a.percentage - b.percentage)

  return { bncc: toRows(byHabilidade), bloom: toRows(byBloom) }
}

interface StudentResponseRow {
  id: string
  student_name: string
  student_email: string
  percentual_acerto?: number | null
  theta?: number | null
  nivel_proficiencia?: NivelProficiencia | null
  completed_at: string
  form?: { title: string; turma?: string | null } | null
}

export async function buildStudentRecoveryReport(
  responses: StudentResponseRow[],
  email: string,
): Promise<RecoveryReportData | null> {
  const studentResponses = responses.filter((r) => r.student_email === email)
  if (studentResponses.length === 0) return null

  const student = studentResponses[0]
  const tctScores = studentResponses.map((r) => r.percentual_acerto).filter((s): s is number => s != null)
  const overallPercentage = avg(tctScores)
  const averageTheta = avgTheta(studentResponses.map((r) => r.theta ?? null))

  const responseIds = studentResponses.map((r) => r.id)
  const { bncc, bloom } = await aggregateSkillsFromResponseIds(responseIds)

  const areaRows: AreaPerformanceRow[] = studentResponses.map((r) => ({
    label: r.form?.title || 'Formulário',
    percentage: r.percentual_acerto ?? 0,
    level: percentageToLevel(r.percentual_acerto ?? 0),
    detail: r.nivel_proficiencia
      ? NIVEL_PROFICIENCIA_LABELS[r.nivel_proficiencia]
      : r.theta != null
        ? `θ ${r.theta.toFixed(2)}`
        : undefined,
  }))

  const weakSkills = bncc.filter((s) => s.percentage < 60).map((s) => s.label)
  const strongSkills = bncc.filter((s) => s.percentage >= 70).map((s) => s.label)

  const highlights: string[] = [
    `${studentResponses.length} formulário(s) analisado(s) no período.`,
    overallPercentage >= 60
      ? `Desempenho geral de ${overallPercentage}% indica progresso consistente.`
      : `Desempenho geral de ${overallPercentage}% — atenção às habilidades prioritárias.`,
  ]

  if (strongSkills.length > 0) {
    highlights.push(`Destaque positivo em: ${strongSkills.slice(0, 2).join(', ')}.`)
  } else if (weakSkills.length > 0) {
    highlights.push(`${weakSkills.length} habilidade(s) abaixo de 60% de acerto.`)
  } else {
    highlights.push('Continue acompanhando a evolução nas próximas avaliações.')
  }

  const dates = studentResponses.map((r) => r.completed_at).sort()
  const periodo =
    dates.length > 0
      ? `${new Intl.DateTimeFormat('pt-BR').format(new Date(dates[0]))} — ${new Intl.DateTimeFormat('pt-BR').format(new Date(dates[dates.length - 1]))}`
      : undefined

  return {
    kind: 'student',
    reportTitle: `${APP_NAME} — Relatório do Aluno`,
    reportDate: formatReportDate(),
    studentName: student.student_name,
    studentEmail: student.student_email,
    turma: student.form?.turma || '5º Ano',
    escola: '—',
    periodo,
    overallPercentage,
    averageTheta,
    totalItems: studentResponses.length,
    highlights,
    performanceBreakdown: buildBreakdownFromPercentages(areaRows.map((r) => ({ pct: r.percentage }))),
    areaRows,
    weakSkills: weakSkills.slice(0, 6),
    recommendations: buildRecommendations(weakSkills, 'student'),
    bloomRows: skillsToAreaRows(bloom.slice(0, 8), 'Bloom'),
  }
}

export async function buildFormRecoveryReport(formId: string): Promise<RecoveryReportData | null> {
  const data = await loadFormAssessmentDetail(formId)
  if (!data) return null

  const { summary, students, bnccSkills, bloomSkills } = data
  const weakSkills = bnccSkills.filter((s) => s.percentage < 60).map((s) => s.label)

  const highlights: string[] = [
    `${summary.totalResponses} resposta(s) registradas neste formulário.`,
    `TCT médio da turma: ${summary.averageTct}%.`,
    summary.averageTheta != null
      ? `Proficiência TRI média (θ): ${summary.averageTheta.toFixed(2)}.`
      : 'Dados TRI disponíveis por aluno quando calibrados.',
  ]

  const nivelParts = (['inicial', 'intermediario', 'avancado'] as NivelProficiencia[])
    .filter((n) => summary.byNivel[n] > 0)
    .map((n) => `${NIVEL_PROFICIENCIA_LABELS[n]}: ${summary.byNivel[n]}`)

  if (nivelParts.length > 0) {
    highlights.push(`Distribuição por nível — ${nivelParts.join('; ')}.`)
  }

  return {
    kind: 'form',
    reportTitle: `${APP_NAME} — Relatório do Formulário`,
    reportDate: formatReportDate(),
    formTitle: summary.title,
    turma: summary.turma || '5º Ano',
    escola: '—',
    periodo: formatReportDate(),
    overallPercentage: summary.averageTct,
    averageTheta: summary.averageTheta,
    totalItems: summary.totalResponses,
    highlights,
    performanceBreakdown: buildBreakdownFromPercentages(
      students.map((s) => ({ pct: s.percentual_acerto ?? 0 })),
    ),
    areaRows: skillsToAreaRows(bnccSkills.slice(0, 10), 'BNCC'),
    weakSkills: weakSkills.slice(0, 6),
    recommendations: buildRecommendations(weakSkills, 'form'),
    bloomRows: skillsToAreaRows(bloomSkills.slice(0, 8), 'Bloom'),
  }
}

export async function buildSkillsRecoveryReport(
  responseIds: string[],
  scopedFormIds: string[] | null,
): Promise<RecoveryReportData | null> {
  if (responseIds.length === 0) return null

  const { bncc, bloom } = await aggregateSkillsFromResponseIds(responseIds)
  const triSummary = await loadTriByFormChart(scopedFormIds)

  const allSkillPcts = [...bncc, ...bloom].map((s) => s.percentage)
  const overallPercentage = allSkillPcts.length > 0 ? avg(allSkillPcts) : 0
  const weakSkills = bncc.filter((s) => s.percentage < 60).map((s) => s.label)
  const criticalCount = bncc.filter((s) => s.percentage < 60).length

  const highlights: string[] = [
    `${responseIds.length} resposta(s) analisadas.`,
    `${bncc.length} habilidade(s) BNCC/SAEB mapeadas.`,
    criticalCount > 0
      ? `${criticalCount} habilidade(s) críticas (abaixo de 60%).`
      : 'Nenhuma habilidade crítica identificada no conjunto analisado.',
  ]

  if (triSummary.length > 0) {
    const top = triSummary[0]
    highlights.push(
      `Maior θ médio: "${top.title}" (${top.averageTheta?.toFixed(2) ?? '—'}).`,
    )
  }

  return {
    kind: 'skills',
    reportTitle: `${APP_NAME} — Relatório de Habilidades`,
    reportDate: formatReportDate(),
    turma: 'Todas as turmas',
    escola: '—',
    periodo: formatReportDate(),
    overallPercentage,
    totalItems: bncc.length + bloom.length,
    highlights,
    performanceBreakdown: buildBreakdownFromPercentages(bncc.map((s) => ({ pct: s.percentage }))),
    areaRows: skillsToAreaRows(bncc.slice(0, 12), 'BNCC'),
    bloomRows: skillsToAreaRows(bloom.slice(0, 8), 'Bloom'),
    weakSkills: weakSkills.slice(0, 8),
    recommendations: buildRecommendations(weakSkills, 'skills'),
    triSummary: triSummary.slice(0, 6).map((t) => ({
      label: t.title,
      averageTheta: t.averageTheta,
      averageTct: t.averageTct,
      totalResponses: t.totalResponses,
    })),
  }
}

export function recoveryReportFilename(data: RecoveryReportData): string {
  const slug = data.studentName || data.formTitle || 'habilidades'
  const safe = slug.replace(/[^a-zA-Z0-9\u00C0-\u024F]+/g, '-').slice(0, 40)
  return `relatorio-${data.kind}-${safe}-${Date.now()}.pdf`
}

export { APP_TAGLINE }
