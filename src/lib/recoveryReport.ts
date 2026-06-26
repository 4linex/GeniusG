import { loadFormAssessmentDetail, loadTriByFormChart, type SkillBreakdownRow } from '@/lib/formAssessmentReport'
import { fetchAnswersByResponseIds } from '@/lib/responseAnswers'
import { EMPTY_SKILL_LABELS } from '@/lib/reportAnalytics'
import { APP_NAME, APP_TAGLINE } from '@/lib/branding'
import { formatPercentRange } from '@/lib/formTrails'
import { resolveScopedFormIds } from '@/lib/scopedForms'
import { reportScopeLabel, type ReportFilters } from '@/lib/reportAnalytics'
import { applyDashboardContextFilters, applyProfileLocationScope, isScopedAdminRole } from '@/lib/dashboardScope'
import { stripHtml } from '@/lib/richText'
import { PROFESSOR_TRAIL_COLUMNS } from '@/lib/trailAreas'
import { NIVEL_PROFICIENCIA_LABELS } from '@/lib/scoring'
import { supabase } from '@/lib/supabase'
import type { LearningTrail, NivelProficiencia, Profile } from '@/types/database'

export type RecoveryReportKind = 'student' | 'form' | 'skills' | 'dashboard'

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

export interface RecoveryReportTrailRow {
  studentName?: string
  studentEmail?: string
  formTitle?: string
  percentRange: string | null
  studentPercent: number | null
  trailTitle: string
  pedagogicalObjectives?: string | null
  teacherNotes?: string | null
  pedagogicalSummary?: string | null
  pedagogicalPdfUrl?: string | null
  pedagogicalLinkUrl?: string | null
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
  saebRows?: AreaPerformanceRow[]
  weakSkills: string[]
  recommendations: string[]
  triSummary?: TriSummaryRow[]
  bloomRows?: AreaPerformanceRow[]
  summaryMetrics?: { label: string; value: string }[]
  criticalSkillRows?: AreaPerformanceRow[]
  recommendedTrails?: RecoveryReportTrailRow[]
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
  } else if (kind === 'dashboard') {
    recs.push('Monitorar formulários com menor média TCT e revisar os itens associados.')
    recs.push('Priorizar trilhas de recomposição para alunos na faixa inicial de proficiência.')
    recs.push('Cruzar dados de Bloom, BNCC e TRI para planejar intervenções por turma ou escola.')
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
    return {
      bncc: [] as SkillBreakdownRow[],
      saeb: [] as SkillBreakdownRow[],
      bloom: [] as SkillBreakdownRow[],
    }
  }

  const answers = await fetchAnswersByResponseIds(responseIds)

  const byBncc = new Map<string, { total: number; correct: number }>()
  const bySaeb = new Map<string, { total: number; correct: number }>()
  const byBloom = new Map<string, { total: number; correct: number }>()

  for (const a of answers) {
    if (a.habilidade_bncc !== EMPTY_SKILL_LABELS.bncc) {
      const hab = byBncc.get(a.habilidade_bncc) || { total: 0, correct: 0 }
      hab.total++
      if (a.is_correct) hab.correct++
      byBncc.set(a.habilidade_bncc, hab)
    }

    if (a.descritor_saeb !== EMPTY_SKILL_LABELS.saeb) {
      const saeb = bySaeb.get(a.descritor_saeb) || { total: 0, correct: 0 }
      saeb.total++
      if (a.is_correct) saeb.correct++
      bySaeb.set(a.descritor_saeb, saeb)
    }

    const bloomKey = a.bloom
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

  return { bncc: toRows(byBncc), saeb: toRows(bySaeb), bloom: toRows(byBloom) }
}

async function fetchRecommendedTrailsByResponseIds(
  responseIds: string[],
): Promise<RecoveryReportTrailRow[]> {
  if (responseIds.length === 0) return []

  const { data } = await supabase
    .from('form_responses')
    .select(
      `
      id,
      student_name,
      student_email,
      percentual_acerto,
      form:forms(title),
      trail_assignment:student_trail_assignments(
        form_trail:form_trails(
          min_percent,
          max_percent,
          title,
          learning_trail:learning_trails(${PROFESSOR_TRAIL_COLUMNS})
        )
      )
    `,
    )
    .in('id', responseIds)

  const rows: RecoveryReportTrailRow[] = []

  for (const response of data || []) {
    const assignment = response.trail_assignment as {
      form_trail?: {
        min_percent: number
        max_percent: number
        title?: string | null
        learning_trail?: LearningTrail | null
      } | null
    } | null

    const formTrail = assignment?.form_trail
    if (!formTrail) continue

    const trail = formTrail.learning_trail
    const pedagogicalSummary = trail?.pedagogical_content
      ? stripHtml(trail.pedagogical_content).slice(0, 280)
      : null

    rows.push({
      studentName: response.student_name,
      studentEmail: response.student_email,
      formTitle: (response.form as { title?: string } | null)?.title,
      percentRange:
        formTrail.min_percent != null && formTrail.max_percent != null
          ? formatPercentRange(formTrail.min_percent, formTrail.max_percent)
          : null,
      studentPercent: response.percentual_acerto ?? null,
      trailTitle: trail?.title || formTrail.title || 'Trilha de recomposição',
      pedagogicalObjectives: trail?.pedagogical_objectives ?? null,
      teacherNotes: trail?.teacher_notes ?? null,
      pedagogicalSummary: pedagogicalSummary || null,
      pedagogicalPdfUrl: trail?.pedagogical_pdf_url ?? null,
      pedagogicalLinkUrl: trail?.pedagogical_link_url ?? null,
    })
  }

  return rows.sort((a, b) => (a.studentName || '').localeCompare(b.studentName || '', 'pt-BR'))
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
  const [{ bncc, saeb, bloom }, recommendedTrails] = await Promise.all([
    aggregateSkillsFromResponseIds(responseIds),
    fetchRecommendedTrailsByResponseIds(responseIds),
  ])

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

  const weakSkills = [
    ...bncc.filter((s) => s.percentage < 60).map((s) => s.label),
    ...saeb.filter((s) => s.percentage < 60).map((s) => s.label),
  ]
  const strongSkills = [
    ...bncc.filter((s) => s.percentage >= 70).map((s) => s.label),
    ...saeb.filter((s) => s.percentage >= 70).map((s) => s.label),
  ]

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

  if (recommendedTrails.length > 0) {
    highlights.push(
      `${recommendedTrails.length} trilha(s) de recomposição atribuída(s) com base no desempenho.`,
    )
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
    recommendedTrails,
  }
}

export async function buildFormRecoveryReport(formId: string): Promise<RecoveryReportData | null> {
  const data = await loadFormAssessmentDetail(formId)
  if (!data) return null

  const { summary, students, bnccSkills, bloomSkills } = data
  const weakSkills = bnccSkills.filter((s) => s.percentage < 60).map((s) => s.label)
  const recommendedTrails = await fetchRecommendedTrailsByResponseIds(students.map((s) => s.id))

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

  if (recommendedTrails.length > 0) {
    highlights.push(
      `${recommendedTrails.length} aluno(s) com trilha de recomposição atribuída automaticamente.`,
    )
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
    recommendedTrails,
  }
}

export async function buildSkillsRecoveryReport(
  responseIds: string[],
  scopedFormIds: string[] | null,
  scope?: Pick<ReportFilters, 'scopeType' | 'municipio' | 'school_name'>,
): Promise<RecoveryReportData | null> {
  if (responseIds.length === 0) return null

  const { bncc, saeb, bloom } = await aggregateSkillsFromResponseIds(responseIds)
  const triSummary = await loadTriByFormChart(scopedFormIds)

  const allSkillPcts = [...bncc, ...saeb, ...bloom].map((s) => s.percentage)
  const overallPercentage = allSkillPcts.length > 0 ? avg(allSkillPcts) : 0
  const weakSkills = [
    ...bncc.filter((s) => s.percentage < 60).map((s) => s.label),
    ...saeb.filter((s) => s.percentage < 60).map((s) => s.label),
  ]
  const criticalCount =
    bncc.filter((s) => s.percentage < 60).length + saeb.filter((s) => s.percentage < 60).length

  const highlights: string[] = [
    `${responseIds.length} resposta(s) analisadas.`,
    `${bncc.length} habilidade(s) BNCC e ${saeb.length} descritor(es) SAEB mapeados.`,
    criticalCount > 0
      ? `${criticalCount} competência(s) críticas (abaixo de 60%).`
      : 'Nenhuma competência crítica identificada no conjunto analisado.',
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
    escola: reportScopeLabel(scope ?? { scopeType: 'all' }),
    periodo: formatReportDate(),
    overallPercentage,
    totalItems: bncc.length + saeb.length + bloom.length,
    highlights,
    performanceBreakdown: buildBreakdownFromPercentages(bncc.map((s) => ({ pct: s.percentage }))),
    areaRows: skillsToAreaRows(bncc.slice(0, 12), 'BNCC'),
    saebRows: skillsToAreaRows(saeb.slice(0, 12), 'SAEB'),
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

export async function buildDashboardRecoveryReport(
  userId: string,
  role: Profile['role'],
  scope?: Pick<ReportFilters, 'scopeType' | 'municipio' | 'school_name'>,
  profile?: Pick<Profile, 'municipio' | 'school_name'> | null,
): Promise<RecoveryReportData | null> {
  const scopedFormIds = await resolveScopedFormIds(userId, role)

  if (scopedFormIds !== null && scopedFormIds.length === 0) return null

  let formsQuery = supabase
    .from('forms')
    .select('id, title, created_at, turma')
    .order('created_at', { ascending: false })

  if (scopedFormIds) formsQuery = formsQuery.in('id', scopedFormIds)

  let linksQuery = supabase.from('form_links').select('id, form_id')
  if (scopedFormIds) linksQuery = linksQuery.in('form_id', scopedFormIds)
  else if (role === 'professor') linksQuery = linksQuery.eq('professor_id', userId)

  let responsesQuery = supabase
    .from('form_responses')
    .select(
      'id, form_id, student_email, percentual_acerto, theta, nivel_proficiencia, completed_at, municipio, school_name, turma',
    )

  const [{ data: forms }, { data: links }] = await Promise.all([formsQuery, linksQuery])

  const formIds = (forms || []).map((f) => f.id)
  if (scopedFormIds && formIds.length > 0) {
    responsesQuery = responsesQuery.in('form_id', formIds)
  } else if (scopedFormIds) {
    responsesQuery = responsesQuery.in('form_id', ['00000000-0000-0000-0000-000000000000'])
  }

  let effectiveScope = scope
  if (isScopedAdminRole(role) && profile) {
    effectiveScope = {
      scopeType: profile.school_name ? 'escola' : 'municipio',
      municipio: profile.municipio ?? undefined,
      school_name: profile.school_name ?? undefined,
    }
  }

  const { data: responses } = await responsesQuery
  let responseList = responses || []

  if (effectiveScope?.scopeType === 'municipio' && effectiveScope.municipio) {
    responseList = applyDashboardContextFilters(responseList, {
      municipio: effectiveScope.municipio,
    })
  } else if (effectiveScope?.scopeType === 'escola') {
    responseList = applyDashboardContextFilters(responseList, {
      municipio: effectiveScope.municipio,
      school_name: effectiveScope.school_name,
    })
  } else if (isScopedAdminRole(role) && profile) {
    responseList = applyProfileLocationScope(responseList, profile)
  }

  if (responseList.length === 0) return null

  const responseIds = responseList.map((r) => r.id)
  const { bncc, saeb, bloom } = await aggregateSkillsFromResponseIds(responseIds)
  const triSummary = await loadTriByFormChart(scopedFormIds)

  const tctScores = responseList
    .map((r) => r.percentual_acerto)
    .filter((s): s is number => s != null)
  const overallPercentage = avg(tctScores)
  const averageTheta = avgTheta(responseList.map((r) => r.theta ?? null))

  const uniqueStudents = new Set(responseList.map((r) => r.student_email)).size
  const weakSkills = [
    ...bncc.filter((s) => s.percentage < 60).map((s) => s.label),
    ...saeb.filter((s) => s.percentage < 60).map((s) => s.label),
  ]
  const criticalCount = weakSkills.length

  const byNivel: Record<NivelProficiencia, number> = {
    inicial: 0,
    intermediario: 0,
    avancado: 0,
  }
  for (const r of responseList) {
    const n = r.nivel_proficiencia as NivelProficiencia | null
    if (n && n in byNivel) byNivel[n]++
  }

  const formStats = new Map<
    string,
    { count: number; tct: number[]; theta: (number | null)[] }
  >()
  for (const r of responseList) {
    const cur = formStats.get(r.form_id) || { count: 0, tct: [], theta: [] }
    cur.count++
    if (r.percentual_acerto != null) cur.tct.push(r.percentual_acerto)
    cur.theta.push(r.theta)
    formStats.set(r.form_id, cur)
  }

  const formAreaRows: AreaPerformanceRow[] = []
  for (const f of forms || []) {
    const s = formStats.get(f.id)
    if (!s || s.count === 0) continue
    const formTct = avg(s.tct)
    const formTheta = avgTheta(s.theta)
    formAreaRows.push({
      label: f.title,
      percentage: formTct,
      level: percentageToLevel(formTct),
      detail: `${s.count} respostas${formTheta != null ? ` · θ ${formTheta.toFixed(2)}` : ''}`,
    })
  }
  formAreaRows.sort((a, b) => b.percentage - a.percentage)

  const formsWithResponses = formAreaRows.length
  const nivelParts = (['inicial', 'intermediario', 'avancado'] as NivelProficiencia[])
    .filter((n) => byNivel[n] > 0)
    .map((n) => `${NIVEL_PROFICIENCIA_LABELS[n]}: ${byNivel[n]}`)

  const highlights: string[] = [
    `${responseList.length} resposta(s) de ${uniqueStudents} aluno(s) em ${formsWithResponses} formulário(s).`,
    `Média geral TCT: ${overallPercentage}%.`,
    averageTheta != null
      ? `Proficiência TRI média (θ): ${averageTheta.toFixed(2)}.`
      : 'Dados TRI consolidados por avaliação abaixo.',
    criticalCount > 0
      ? `${criticalCount} habilidade(s) críticas (abaixo de 60% de acerto).`
      : 'Nenhuma habilidade crítica identificada no conjunto analisado.',
  ]

  if (nivelParts.length > 0) {
    highlights.push(`Proficiência — ${nivelParts.join('; ')}.`)
  }

  return {
    kind: 'dashboard',
    reportTitle: `${APP_NAME} — Relatório Geral`,
    reportDate: formatReportDate(),
    turma: 'Visão consolidada',
    escola: reportScopeLabel(effectiveScope ?? scope ?? { scopeType: 'all' }),
    periodo: formatReportDate(),
    overallPercentage,
    averageTheta,
    totalItems: responseList.length,
    highlights,
    summaryMetrics: [
      { label: 'Avaliações (links)', value: String(links?.length ?? 0) },
      { label: 'Formulários c/ respostas', value: String(formsWithResponses) },
      { label: 'Alunos avaliados', value: String(uniqueStudents) },
      { label: 'Total de respostas', value: String(responseList.length) },
      { label: 'Média TCT geral', value: `${overallPercentage}%` },
      { label: 'Habilidades críticas', value: String(criticalCount) },
    ],
    performanceBreakdown: buildBreakdownFromPercentages(
      tctScores.map((pct) => ({ pct })),
    ),
    areaRows: formAreaRows.slice(0, 12),
    criticalSkillRows: skillsToAreaRows(
      [
        ...bncc.filter((s) => s.percentage < 60),
        ...saeb.filter((s) => s.percentage < 60),
      ].slice(0, 8),
      'BNCC/SAEB',
    ),
    saebRows: skillsToAreaRows(saeb.filter((s) => s.percentage < 60).slice(0, 8), 'SAEB'),
    bloomRows: skillsToAreaRows(bloom.slice(0, 8), 'Bloom'),
    weakSkills: weakSkills.slice(0, 8),
    recommendations: buildRecommendations(weakSkills, 'dashboard'),
    triSummary: triSummary.slice(0, 10).map((t) => ({
      label: t.title,
      averageTheta: t.averageTheta,
      averageTct: t.averageTct,
      totalResponses: t.totalResponses,
    })),
  }
}

export function recoveryReportFilename(data: RecoveryReportData): string {
  if (data.kind === 'dashboard') {
    return `relatorio-geral-dashboard-${Date.now()}.pdf`
  }
  const slug = data.studentName || data.formTitle || 'habilidades'
  const safe = slug.replace(/[^a-zA-Z0-9\u00C0-\u024F]+/g, '-').slice(0, 40)
  return `relatorio-${data.kind}-${safe}-${Date.now()}.pdf`
}

export { APP_TAGLINE }
