import { loadFormAssessmentDetail, loadTriByFormChart, type SkillBreakdownRow } from '@/lib/formAssessmentReport'
import { fetchAnswersByResponseIds } from '@/lib/responseAnswers'
import { EMPTY_SKILL_LABELS, aggregateSkillsFromAnswers, type RawAnswerRow } from '@/lib/reportAnalytics'
import { APP_NAME, APP_TAGLINE } from '@/lib/branding'
import { formatPercentRange, type FormTrailMatch } from '@/lib/formTrails'
import {
  buildResponseTrailInput,
  resolveStudentResponseTrail,
} from '@/lib/studentResponseTrail'
import { resolveScopedFormIds } from '@/lib/scopedForms'
import { reportScopeLabel, formatReportPeriod, type ReportFilters } from '@/lib/reportAnalytics'
import {
  buildCriticalSkillsTable,
  buildErrorDescriptors,
  buildEvolutionSeries,
  buildExecutiveSummary,
  buildNivelDistribution,
  buildTrailRanking,
  type RecoveryReportCriticalSkill,
  type RecoveryReportErrorDescriptor,
  type RecoveryReportEvolutionPoint,
  type RecoveryReportNivelSegment,
  type RecoveryReportTrailRanking,
} from '@/lib/recoveryReportSections'
import { applyDashboardContextFilters, applyProfileLocationScope, applyDashboardDateFilters, isScopedAdminRole, isRootRole } from '@/lib/dashboardScope'
import type { ReportComparativoRow } from '@/lib/recoveryReportLayout'
import { stripHtml } from '@/lib/richText'
import { PROFESSOR_TRAIL_COLUMNS } from '@/lib/trailAreas'
import { NIVEL_PROFICIENCIA_LABELS } from '@/lib/scoring'
import { supabase } from '@/lib/supabase'
import type { LearningTrail, NivelProficiencia, Profile } from '@/types/database'

export type RecoveryReportKind =
  | 'student'
  | 'studentForm'
  | 'form'
  | 'skills'
  | 'dashboard'
  | 'turma'
  | 'escola'
  | 'municipio'

export interface StudentReportOptions {
  dateFrom?: string
  dateTo?: string
  /** Respostas por questão já carregadas na tela — evita nova consulta que pode falhar por RLS. */
  preloadedAnswers?: RawAnswerRow[]
  /** Quando true, `responses` já é o recorte do aluno (sem filtrar por e-mail de novo). */
  alreadyScoped?: boolean
  /** Trilhas já carregadas na tela do aluno. */
  preloadedTrails?: RecoveryReportTrailRow[]
}

export type {
  RecoveryReportCriticalSkill,
  RecoveryReportErrorDescriptor,
  RecoveryReportNivelSegment,
  RecoveryReportTrailRanking,
}

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
  bnccRows?: AreaPerformanceRow[]
  saebRows?: AreaPerformanceRow[]
  weakSkills: string[]
  strongSkills?: string[]
  recommendations?: string[]
  triSummary?: TriSummaryRow[]
  bloomRows?: AreaPerformanceRow[]
  summaryMetrics?: { label: string; value: string }[]
  criticalSkillRows?: AreaPerformanceRow[]
  recommendedTrails?: RecoveryReportTrailRow[]
  nivelDistribution?: RecoveryReportNivelSegment[]
  criticalSkillsTable?: RecoveryReportCriticalSkill[]
  errorDescriptors?: RecoveryReportErrorDescriptor[]
  trailRanking?: RecoveryReportTrailRanking[]
  executiveSummary?: string
  municipio?: string
  professor?: string
  comparisonRows?: ReportComparativoRow[]
  evolutionSeries?: RecoveryReportEvolutionPoint[]
  evolutionDelta?: number | null
  participation?: { evaluated: number; expected: number; rate: number } | null
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

function aggregateAllSkillsFromRawAnswers(answers: RawAnswerRow[], responseIds: string[]) {
  const idSet = new Set(responseIds)
  return {
    bncc: aggregateSkillsFromAnswers(answers, idSet, 'bncc'),
    saeb: aggregateSkillsFromAnswers(answers, idSet, 'saeb'),
    bloom: aggregateSkillsFromAnswers(answers, idSet, 'bloom'),
  }
}

async function loadSkillsForResponses(
  responseIds: string[],
  preloadedAnswers?: RawAnswerRow[],
) {
  if (preloadedAnswers) {
    return aggregateAllSkillsFromRawAnswers(preloadedAnswers, responseIds)
  }
  try {
    return await aggregateSkillsFromResponseIds(responseIds)
  } catch {
    return {
      bncc: [] as SkillBreakdownRow[],
      saeb: [] as SkillBreakdownRow[],
      bloom: [] as SkillBreakdownRow[],
    }
  }
}

function normalizeStudentEmail(email: string): string {
  return email.trim().toLowerCase()
}

function matchesStudentEmail(rowEmail: string, email: string): boolean {
  return normalizeStudentEmail(rowEmail) === normalizeStudentEmail(email)
}

function matchesStudentForm(
  row: StudentResponseRow,
  email: string,
  formId: string,
): boolean {
  if (!matchesStudentEmail(row.student_email, email)) return false
  const nestedFormId = row.form && 'id' in row.form ? row.form.id : undefined
  return row.form_id === formId || nestedFormId === formId
}

export type StudentPageResponse = StudentResponseRow & {
  trail_assignment?:
    | {
        form_trail?:
          | {
              min_percent: number
              max_percent: number
              title?: string | null
              learning_trail?: LearningTrail | LearningTrail[] | null
            }
          | Array<{
              min_percent: number
              max_percent: number
              title?: string | null
              learning_trail?: LearningTrail | LearningTrail[] | null
            }>
          | null
      }
    | Array<{
        form_trail?:
          | {
              min_percent: number
              max_percent: number
              title?: string | null
              learning_trail?: LearningTrail | LearningTrail[] | null
            }
          | null
      }>
    | null
}

export function buildRecommendedTrailsFromPageResponses(
  responses: StudentPageResponse[],
  formTrailsByFormId?: Record<string, FormTrailMatch[]>,
  preloadedAnswers?: RawAnswerRow[],
): RecoveryReportTrailRow[] {
  const rows: RecoveryReportTrailRow[] = []

  for (const response of responses) {
    const resolved = resolveStudentResponseTrail(
      response.trail_assignment,
      buildResponseTrailInput(response, preloadedAnswers),
      response.form_id && formTrailsByFormId
        ? formTrailsByFormId[response.form_id] ?? []
        : [],
    )
    if (!resolved) continue

    const trail = resolved.trail
    const pedagogicalSummary = trail?.pedagogical_content
      ? stripHtml(trail.pedagogical_content).slice(0, 280)
      : null

    rows.push({
      studentName: response.student_name,
      studentEmail: response.student_email,
      formTitle: response.form?.title,
      percentRange: resolved.percentRange,
      studentPercent: response.percentual_acerto ?? null,
      trailTitle: resolved.displayTitle,
      pedagogicalObjectives: trail?.pedagogical_objectives ?? null,
      teacherNotes: trail?.teacher_notes ?? null,
      pedagogicalSummary: pedagogicalSummary || null,
      pedagogicalPdfUrl: trail?.pedagogical_pdf_url ?? null,
      pedagogicalLinkUrl: trail?.pedagogical_link_url ?? null,
    })
  }

  return rows.sort((a, b) => (a.studentName || '').localeCompare(b.studentName || '', 'pt-BR'))
}

function buildStudentReportSectionsSync(
  studentResponses: StudentResponseRow[],
  bncc: SkillBreakdownRow[],
  saeb: SkillBreakdownRow[],
  _bloom: SkillBreakdownRow[],
  _areaRows: AreaPerformanceRow[],
) {
  const evolutionSeries = buildEvolutionSeries(studentResponses)
  const evolutionDelta =
    evolutionSeries.length >= 2
      ? Math.round(
          (evolutionSeries[evolutionSeries.length - 1].value - evolutionSeries[0].value) * 10,
        ) / 10
      : null

  return {
    nivelDistribution: buildNivelDistribution(studentResponses),
    criticalSkillsTable: buildCriticalSkillsTable(bncc, saeb),
    errorDescriptors: buildErrorDescriptors(saeb),
    trailRanking: [] as RecoveryReportTrailRanking[],
    evolutionSeries,
    evolutionDelta,
    executiveSummary: undefined,
  }
}

function buildStudentAreaRows(studentResponses: StudentResponseRow[]): AreaPerformanceRow[] {
  if (studentResponses.length <= 1) return []

  return studentResponses
    .map((r) => ({
      label: r.form?.title || 'Formulário',
      percentage: r.percentual_acerto ?? 0,
      level: percentageToLevel(r.percentual_acerto ?? 0),
      detail:
        r.percentual_acerto != null
          ? formPerformanceTier(r.percentual_acerto)
          : r.nivel_proficiencia
            ? NIVEL_PROFICIENCIA_LABELS[r.nivel_proficiencia]
            : undefined,
    }))
    .sort((a, b) => b.percentage - a.percentage)
}

function assembleStudentRecoveryReportData(
  studentResponses: StudentResponseRow[],
  bncc: SkillBreakdownRow[],
  saeb: SkillBreakdownRow[],
  bloom: SkillBreakdownRow[],
  recommendedTrails: RecoveryReportTrailRow[],
): RecoveryReportData {
  const student = studentResponses[0]
  const tctScores = studentResponses
    .map((r) => r.percentual_acerto)
    .filter((s): s is number => s != null)
  const overallPercentage = tctScores.length > 0 ? avg(tctScores) : 0
  const averageTheta = avgTheta(studentResponses.map((r) => r.theta ?? null))
  const areaRows = buildStudentAreaRows(studentResponses)

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

  const sections = buildStudentReportSectionsSync(studentResponses, bncc, saeb, bloom, areaRows)

  return {
    kind: 'student',
    reportTitle: `${APP_NAME} — Relatório do Aluno`,
    reportDate: formatReportDate(),
    studentName: student.student_name,
    studentEmail: student.student_email,
    turma: studentResponses[0]?.turma || student.form?.turma || '—',
    escola: studentResponses[0]?.school_name || '—',
    municipio: studentResponses[0]?.municipio || undefined,
    periodo: formatReportPeriod(studentResponses),
    overallPercentage,
    averageTheta,
    totalItems: studentResponses.length,
    highlights,
    performanceBreakdown: buildBreakdownFromPercentages(
      areaRows.length > 0
        ? areaRows.map((r) => ({ pct: r.percentage }))
        : studentResponses.map((r) => ({ pct: r.percentual_acerto ?? 0 })),
    ),
    areaRows,
    weakSkills: weakSkills.slice(0, 6),
    strongSkills: strongSkills.slice(0, 6),
    recommendedTrails,
    ...sections,
  }
}

/** Gera relatório geral do aluno só com dados já carregados na página (sem Supabase). */
export function buildStudentRecoveryReportSync(
  studentResponses: StudentResponseRow[],
  preloadedAnswers: RawAnswerRow[],
  options?: Pick<StudentReportOptions, 'dateFrom' | 'dateTo'> & {
    preloadedTrails?: RecoveryReportTrailRow[]
  },
): RecoveryReportData | null {
  let rows = [...studentResponses]
  if (rows.length === 0) return null

  rows = applyDashboardDateFilters(rows, {
    dateFrom: options?.dateFrom,
    dateTo: options?.dateTo,
  })
  if (rows.length === 0) return null

  const responseIds = rows.map((r) => r.id)
  const { bncc, saeb, bloom } = aggregateAllSkillsFromRawAnswers(preloadedAnswers, responseIds)
  const recommendedTrails =
    options?.preloadedTrails ??
    buildRecommendedTrailsFromPageResponses(
      rows as StudentPageResponse[],
      undefined,
      preloadedAnswers,
    )

  return assembleStudentRecoveryReportData(rows, bncc, saeb, bloom, recommendedTrails)
}

function findStudentFormResponse(
  responses: StudentResponseRow[],
  formId: string,
): StudentResponseRow | undefined {
  return responses.find((r) => {
    const nestedFormId = r.form && 'id' in r.form ? r.form.id : undefined
    return r.form_id === formId || nestedFormId === formId
  })
}

function assembleStudentFormRecoveryReportData(
  response: StudentResponseRow,
  bncc: SkillBreakdownRow[],
  saeb: SkillBreakdownRow[],
  bloom: SkillBreakdownRow[],
  recommendedTrails: RecoveryReportTrailRow[],
): RecoveryReportData {
  const overallPercentage = response.percentual_acerto ?? 0
  const averageTheta = response.theta ?? null
  const correct = response.correct_answers
  const total = response.total_questions

  const weakSkills = [
    ...bncc.filter((s) => s.percentage < 60).map((s) => s.label),
    ...saeb.filter((s) => s.percentage < 60).map((s) => s.label),
  ]
  const strongSkills = [
    ...bncc.filter((s) => s.percentage >= 70).map((s) => s.label),
    ...saeb.filter((s) => s.percentage >= 70).map((s) => s.label),
  ]

  const highlights: string[] = [
    response.form?.title
      ? `Formulário: ${response.form.title}.`
      : 'Avaliação individual do aluno.',
    correct != null && total != null
      ? `Acertou ${correct} de ${total} questões (${overallPercentage}%).`
      : `Desempenho TCT: ${overallPercentage}%.`,
  ]
  if (weakSkills.length > 0) {
    highlights.push(`${weakSkills.length} habilidade(s) com déficit nesta avaliação.`)
  }
  if (strongSkills.length > 0) {
    highlights.push(`Destaque em: ${strongSkills.slice(0, 2).join(', ')}.`)
  }
  if (recommendedTrails.length > 0) {
    highlights.push(`Trilha recomendada: ${recommendedTrails[0].trailTitle}.`)
  }

  const areaRow = {
    label: response.form?.title || 'Formulário',
    percentage: overallPercentage,
    level: percentageToLevel(overallPercentage),
  }
  const sections = buildStudentReportSectionsSync([response], bncc, saeb, bloom, [areaRow])

  return {
    kind: 'studentForm',
    reportTitle: `${APP_NAME} — Relatório por Formulário`,
    reportDate: formatReportDate(),
    studentName: response.student_name,
    studentEmail: response.student_email,
    formTitle: response.form?.title,
    turma: response.turma || response.form?.turma || '—',
    escola: response.school_name || '—',
    municipio: response.municipio || undefined,
    periodo: formatReportPeriod([response]),
    overallPercentage,
    averageTheta,
    totalItems: total ?? undefined,
    highlights,
    performanceBreakdown: buildBreakdownFromPercentages([{ pct: overallPercentage }]),
    areaRows: [areaRow],
    weakSkills: weakSkills.slice(0, 8),
    strongSkills: strongSkills.slice(0, 8),
    recommendedTrails,
    summaryMetrics:
      correct != null && total != null
        ? [
            { label: 'Questões corretas', value: `${correct} de ${total}` },
            { label: 'Taxa de acerto', value: `${overallPercentage}%` },
          ]
        : undefined,
    ...sections,
  }
}

/** Gera relatório por formulário só com dados já carregados na página (sem Supabase). */
export function buildStudentFormRecoveryReportSync(
  studentResponses: StudentResponseRow[],
  formId: string,
  preloadedAnswers: RawAnswerRow[],
  formTrailsByFormId?: Record<string, FormTrailMatch[]>,
): RecoveryReportData | null {
  const response = findStudentFormResponse(studentResponses, formId)
  if (!response) return null

  const responseIds = [response.id]
  const { bncc, saeb, bloom } = aggregateAllSkillsFromRawAnswers(preloadedAnswers, responseIds)
  const recommendedTrails = buildRecommendedTrailsFromPageResponses(
    [response as StudentPageResponse],
    formTrailsByFormId,
    preloadedAnswers,
  )

  return assembleStudentFormRecoveryReportData(
    response,
    bncc,
    saeb,
    bloom,
    recommendedTrails,
  )
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
  form_id?: string
  student_name: string
  student_email: string
  percentual_acerto?: number | null
  theta?: number | null
  nivel_proficiencia?: NivelProficiencia | null
  correct_answers?: number | null
  total_questions?: number | null
  completed_at: string
  municipio?: string | null
  school_name?: string | null
  turma?: string | null
  form?: { id?: string; title: string; turma?: string | null } | null
}

function reportKindTitle(kind: RecoveryReportKind): string {
  const map: Record<RecoveryReportKind, string> = {
    student: 'Relatório Geral do Aluno',
    studentForm: 'Relatório do Aluno por Formulário',
    form: 'Relatório do Formulário',
    skills: 'Relatório de Habilidades',
    dashboard: 'Relatório Geral — Dashboard',
    turma: 'Relatório da Turma',
    escola: 'Relatório da Escola',
    municipio: 'Relatório do Município',
  }
  return map[kind]
}

function normLabel(value: string | null | undefined): string {
  return value?.trim() || ''
}

function formPerformanceTier(pct: number): string {
  if (pct >= 70) return 'Desempenho alto'
  if (pct >= 40) return 'Desempenho médio'
  return 'Desempenho baixo'
}

function buildGroupedAreaRows(
  responses: StudentResponseRow[],
  groupBy: 'school' | 'turma',
): AreaPerformanceRow[] {
  const map = new Map<string, { scores: number[]; students: Set<string> }>()

  for (const r of responses) {
    const key = groupBy === 'school' ? normLabel(r.school_name) : normLabel(r.turma)
    if (!key) continue
    const cur = map.get(key) || { scores: [], students: new Set<string>() }
    if (r.percentual_acerto != null) cur.scores.push(r.percentual_acerto)
    cur.students.add(r.student_email)
    map.set(key, cur)
  }

  return [...map.entries()]
    .map(([label, stats]) => {
      const pct = avg(stats.scores)
      return {
        label,
        percentage: pct,
        level: percentageToLevel(pct),
        detail: `${stats.students.size} aluno(s) · ${stats.scores.length} resposta(s)`,
      }
    })
    .sort((a, b) => b.percentage - a.percentage)
}

function buildTurmaSummaryMetrics(
  responses: StudentResponseRow[],
  trailCount: number,
  predominantSkill?: string,
) {
  const byStudent = new Map<string, number[]>()
  for (const r of responses) {
    const scores = byStudent.get(r.student_email) || []
    if (r.percentual_acerto != null) scores.push(r.percentual_acerto)
    byStudent.set(r.student_email, scores)
  }

  let bom = 0
  let ruim = 0
  for (const scores of byStudent.values()) {
    if (scores.length === 0) continue
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
    if (avgScore >= 60) bom++
    else ruim++
  }

  const metrics = [
    { label: 'Alunos avaliados', value: String(byStudent.size) },
    { label: 'Média TCT da turma', value: `${responseAvgTct(responses)}%` },
    { label: 'Alunos com bom desempenho', value: String(bom) },
    { label: 'Alunos com desempenho ruim', value: String(ruim) },
    { label: 'Alunos em trilhas', value: String(trailCount) },
  ]

  if (predominantSkill) {
    metrics.push({ label: 'Habilidade prioritária', value: predominantSkill })
  }

  return metrics
}

function responseAvgTct(rows: { percentual_acerto?: number | null }[]): number {
  const scores = rows.map((r) => r.percentual_acerto).filter((s): s is number => s != null)
  if (!scores.length) return 0
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
}

function buildScopeComparison(
  filtered: Array<{ student_email: string; percentual_acerto?: number | null; theta?: number | null; completed_at: string; school_name?: string | null; municipio?: string | null }>,
  referencePool: typeof filtered,
  scope: ReportFilters | undefined,
  kind: RecoveryReportKind,
): ReportComparativoRow[] {
  if (kind === 'student' || kind === 'studentForm' || kind === 'form' || kind === 'skills') return []

  let ref = referencePool
  let scopeLabel = 'Recorte'
  let refLabel = 'Referência'

  if (kind === 'turma' || scope?.turma) {
    scopeLabel = 'Turma'
    refLabel = 'Escola'
    const school = scope?.school_name || filtered[0]?.school_name
    const municipio = scope?.municipio || filtered[0]?.municipio
    ref = referencePool.filter(
      (r) =>
        (!school || r.school_name === school) &&
        (!municipio || r.municipio === municipio),
    )
  } else if (kind === 'escola' || scope?.school_name) {
    scopeLabel = 'Escola'
    refLabel = 'Município'
    const municipio = scope?.municipio || filtered[0]?.municipio
    ref = referencePool.filter((r) => !municipio || r.municipio === municipio)
  } else if (kind === 'municipio' || scope?.municipio) {
    scopeLabel = 'Município'
    refLabel = 'Rede'
    ref = referencePool
  } else {
    scopeLabel = 'Período atual'
    refLabel = 'Mês anterior'
    const now = new Date()
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    const previous = referencePool.filter((r) => {
      const d = new Date(r.completed_at)
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear
    })
    ref = previous.length > 0 ? previous : referencePool
  }

  const scopeTct = responseAvgTct(filtered)
  const refTct = responseAvgTct(ref)
  if (!scopeTct && !refTct) return []

  const rows: ReportComparativoRow[] = [
    {
      label: 'Desempenho Geral',
      scopeLabel,
      scopeValue: scopeTct,
      referenceLabel: refLabel,
      referenceValue: refTct,
    },
  ]

  const scopeTheta = avgTheta(filtered.map((r) => r.theta ?? null))
  const refTheta = avgTheta(ref.map((r) => r.theta ?? null))
  if (scopeTheta != null && refTheta != null) {
    rows.push({
      label: 'TRI Médio',
      scopeLabel,
      scopeValue: scopeTheta,
      referenceLabel: refLabel,
      referenceValue: refTheta,
    })
  }

  const scopeStudents = new Set(filtered.map((r) => r.student_email)).size
  const refStudents = new Set(ref.map((r) => r.student_email)).size
  if (scopeStudents > 0) {
    rows.push({
      label: 'Alunos Avaliados',
      scopeLabel,
      scopeValue: scopeStudents,
      referenceLabel: refLabel,
      referenceValue: refStudents,
    })
  }

  return rows
}

async function enrichReportSections(
  responses: StudentResponseRow[],
  bncc: SkillBreakdownRow[],
  saeb: SkillBreakdownRow[],
  bloom: SkillBreakdownRow[],
  formAreaRows: AreaPerformanceRow[],
  scope?: { municipio?: string; escola?: string; turma?: string },
) {
  const tctScores = responses
    .map((r) => r.percentual_acerto)
    .filter((s): s is number => s != null)
  const overallPercentage = avg(tctScores)
  const uniqueStudents = new Set(responses.map((r) => r.student_email)).size
  const weakSkills = [
    ...bncc.filter((s) => s.percentage < 60).map((s) => s.label),
    ...saeb.filter((s) => s.percentage < 60).map((s) => s.label),
  ]
  const trailRanking = await buildTrailRanking(
    responses.map((r) => ({
      id: r.id,
      student_email: r.student_email,
      form_id: r.form_id,
      percentual_acerto: r.percentual_acerto,
      correct_answers: r.correct_answers,
      total_questions: r.total_questions,
    })),
  ).catch(() => [] as Awaited<ReturnType<typeof buildTrailRanking>>)

  const evolutionSeries = buildEvolutionSeries(responses)
  const evolutionDelta =
    evolutionSeries.length >= 2
      ? Math.round((evolutionSeries[evolutionSeries.length - 1].value - evolutionSeries[0].value) * 10) / 10
      : null

  return {
    nivelDistribution: buildNivelDistribution(responses),
    criticalSkillsTable: buildCriticalSkillsTable(bncc, saeb),
    errorDescriptors: buildErrorDescriptors(saeb),
    trailRanking,
    evolutionSeries,
    evolutionDelta,
    executiveSummary: buildExecutiveSummary({
      overallPercentage,
      uniqueStudents,
      totalResponses: responses.length,
      weakSkills,
      weakestForm: [...formAreaRows].sort((a, b) => a.percentage - b.percentage)[0]?.label,
      weakestBloom: [...bloom].sort((a, b) => a.percentage - b.percentage)[0]?.label,
      municipio: scope?.municipio,
      escola: scope?.escola,
      turma: scope?.turma,
      trailRanking,
    }),
  }
}

export async function buildStudentRecoveryReport(
  responses: StudentResponseRow[],
  email: string,
  options?: StudentReportOptions,
): Promise<RecoveryReportData | null> {
  const scoped = options?.alreadyScoped
    ? responses
    : responses.filter((r) => matchesStudentEmail(r.student_email, email))

  if (scoped.length === 0) return null

  if (options?.preloadedAnswers) {
    return buildStudentRecoveryReportSync(scoped, options.preloadedAnswers, {
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
      preloadedTrails: options.preloadedTrails,
    })
  }

  let studentResponses = applyDashboardDateFilters(scoped, {
    dateFrom: options?.dateFrom,
    dateTo: options?.dateTo,
  })
  if (studentResponses.length === 0) return null

  const responseIds = studentResponses.map((r) => r.id)
  const [{ bncc, saeb, bloom }, recommendedTrails] = await Promise.all([
    loadSkillsForResponses(responseIds),
    fetchRecommendedTrailsByResponseIds(responseIds).catch(() => []),
  ])

  return assembleStudentRecoveryReportData(
    studentResponses,
    bncc,
    saeb,
    bloom,
    recommendedTrails,
  )
}

/** Relatório de um único formulário respondido pelo aluno. */
export async function buildStudentFormRecoveryReport(
  responses: StudentResponseRow[],
  email: string,
  formId: string,
  options?: Pick<StudentReportOptions, 'preloadedAnswers' | 'preloadedTrails' | 'alreadyScoped'>,
): Promise<RecoveryReportData | null> {
  const scoped = options?.alreadyScoped
    ? responses
    : responses.filter((r) => matchesStudentEmail(r.student_email, email))

  if (options?.preloadedAnswers) {
    return buildStudentFormRecoveryReportSync(scoped, formId, options.preloadedAnswers)
  }

  const response = scoped.find((r) => matchesStudentForm(r, email, formId))
  if (!response) return null

  const responseIds = [response.id]
  const [{ bncc, saeb, bloom }, recommendedTrails] = await Promise.all([
    loadSkillsForResponses(responseIds),
    fetchRecommendedTrailsByResponseIds(responseIds).catch(() => []),
  ])

  return assembleStudentFormRecoveryReportData(
    response,
    bncc,
    saeb,
    bloom,
    recommendedTrails,
  )
}

export async function buildFormRecoveryReport(
  formId: string,
  filters?: Pick<ReportFilters, 'dateFrom' | 'dateTo' | 'turma' | 'studentEmail'>,
): Promise<RecoveryReportData | null> {
  const data = await loadFormAssessmentDetail(formId)
  if (!data) return null

  let students = data.students
  if (filters?.studentEmail) {
    students = students.filter((s) => s.student_email === filters.studentEmail)
  }
  if (filters?.turma) {
    students = students.filter((s) => (s as { turma?: string | null }).turma === filters.turma)
  }
  if (filters?.dateFrom || filters?.dateTo) {
    students = students.filter((s) => {
      const completed = new Date(s.completed_at)
      if (filters.dateFrom && completed < new Date(`${filters.dateFrom}T00:00:00`)) return false
      if (filters.dateTo && completed > new Date(`${filters.dateTo}T23:59:59`)) return false
      return true
    })
  }
  if (students.length === 0) return null

  const { summary, bnccSkills, bloomSkills, saebSkills } = data
  const weakSkills = bnccSkills.filter((s) => s.percentage < 60).map((s) => s.label)
  const recommendedTrails = await fetchRecommendedTrailsByResponseIds(students.map((s) => s.id))
  const formAreaRows = skillsToAreaRows(bnccSkills.slice(0, 10), 'BNCC')
  const studentRows: StudentResponseRow[] = students.map((s) => ({
    id: s.id,
    student_name: s.student_name,
    student_email: s.student_email,
    percentual_acerto: s.percentual_acerto,
    theta: s.theta,
    nivel_proficiencia: s.nivel_proficiencia,
    completed_at: s.completed_at,
    turma: summary.turma,
    school_name: null,
    municipio: null,
    form: { title: summary.title, turma: summary.turma },
  }))
  const sections = await enrichReportSections(
    studentRows,
    bnccSkills,
    saebSkills ?? [],
    bloomSkills,
    formAreaRows,
    { turma: summary.turma ?? undefined },
  )

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

  const avgTct =
    students.length > 0
      ? avg(students.map((s) => s.percentual_acerto).filter((v): v is number => v != null))
      : summary.averageTct

  return {
    kind: 'form',
    reportTitle: `${APP_NAME} — Relatório do Formulário`,
    reportDate: formatReportDate(),
    formTitle: summary.title,
    turma: summary.turma || '—',
    escola: '—',
    periodo: formatReportPeriod(students, filters),
    overallPercentage: avgTct,
    averageTheta: avgTheta(students.map((s) => s.theta ?? null)),
    totalItems: students.length,
    highlights,
    performanceBreakdown: buildBreakdownFromPercentages(
      students.map((s) => ({ pct: s.percentual_acerto ?? 0 })),
    ),
    areaRows: [],
    weakSkills: weakSkills.slice(0, 6),
    bloomRows: skillsToAreaRows(bloomSkills.slice(0, 8), 'Bloom'),
    recommendedTrails,
    summaryMetrics: [
      {
        label: 'Alunos avaliados',
        value: String(new Set(students.map((s) => s.student_email)).size),
      },
      { label: 'Total de respostas', value: String(students.length) },
    ],
    triSummary:
      summary.averageTheta != null
        ? [
            {
              label: summary.title,
              averageTheta: summary.averageTheta,
              averageTct: summary.averageTct,
              totalResponses: summary.totalResponses,
            },
          ]
        : [],
    ...sections,
  }
}

export async function buildFormsOverviewRecoveryReport(
  responseIds: string[],
  scope?: ReportFilters,
): Promise<RecoveryReportData | null> {
  if (responseIds.length === 0) return null

  const { data: responseRows } = await supabase
    .from('form_responses')
    .select(
      'id, form_id, student_name, student_email, percentual_acerto, theta, nivel_proficiencia, completed_at, municipio, school_name, turma, form:forms(title, turma)',
    )
    .in('id', responseIds)

  type OverviewRow = StudentResponseRow & { form_id?: string }
  const responses = (responseRows || []) as unknown as OverviewRow[]
  if (responses.length === 0) return null

  const formGroups = new Map<string, { title: string; rows: OverviewRow[] }>()
  for (const r of responses) {
    const formId = r.form_id || 'unknown'
    const title = r.form?.title || 'Formulário'
    const group = formGroups.get(formId) || { title, rows: [] }
    group.rows.push(r)
    formGroups.set(formId, group)
  }

  const { bncc, saeb, bloom } = await aggregateSkillsFromResponseIds(responseIds)
  const formIds = [...formGroups.keys()].filter((id) => id !== 'unknown')
  const [recommendedTrails, triSummary] = await Promise.all([
    fetchRecommendedTrailsByResponseIds(responseIds),
    loadTriByFormChart(formIds.length > 0 ? formIds : null),
  ])
  const weakSkills = [
    ...bncc.filter((s) => s.percentage < 60).map((s) => s.label),
    ...saeb.filter((s) => s.percentage < 60).map((s) => s.label),
  ]

  const formAreaRows = [...formGroups.values()]
    .map(({ title, rows }) => {
      const pct = responseAvgTct(rows)
      return {
        label: title,
        percentage: pct,
        level: percentageToLevel(pct),
        detail: `${rows.length} resposta(s) · ${new Set(rows.map((row) => row.student_email)).size} aluno(s)`,
      }
    })
    .sort((a, b) => b.percentage - a.percentage)

  const overallPct = responseAvgTct(responses)
  const byNivel: Record<NivelProficiencia, number> = {
    inicial: 0,
    intermediario: 0,
    avancado: 0,
  }
  for (const r of responses) {
    const nivel = r.nivel_proficiencia as NivelProficiencia | null
    if (nivel) byNivel[nivel]++
  }

  const highlights: string[] = [
    `${responses.length} resposta(s) em ${formGroups.size} formulário(s).`,
    `TCT médio geral: ${overallPct}%.`,
    `Alunos únicos: ${new Set(responses.map((r) => r.student_email)).size}.`,
  ]

  const nivelParts = (['inicial', 'intermediario', 'avancado'] as NivelProficiencia[])
    .filter((n) => byNivel[n] > 0)
    .map((n) => `${NIVEL_PROFICIENCIA_LABELS[n]}: ${byNivel[n]}`)

  if (nivelParts.length > 0) {
    highlights.push(`Distribuição por nível — ${nivelParts.join('; ')}.`)
  }

  if (formAreaRows.length > 0) {
    const best = formAreaRows[0]
    highlights.push(`Melhor desempenho: "${best.label}" (${best.percentage}%).`)
    if (formAreaRows.length > 1) {
      const worst = formAreaRows[formAreaRows.length - 1]
      highlights.push(`Menor desempenho: "${worst.label}" (${worst.percentage}%).`)
    }
  }

  const sections = await enrichReportSections(
    responses,
    bncc,
    saeb,
    bloom,
    formAreaRows,
    {
      municipio: scope?.municipio,
      escola: scope?.school_name,
      turma: scope?.turma,
    },
  )

  const scopedFormTitle = scope?.formId
    ? [...formGroups.values()][0]?.title
    : undefined

  return {
    kind: 'form',
    reportTitle: `${APP_NAME} — ${reportKindTitle('form')}`,
    reportDate: formatReportDate(),
    formTitle: scopedFormTitle ?? 'Visão geral — todos os formulários',
    turma: scope?.turma || 'Todas as turmas',
    escola: reportScopeLabel(scope ?? { scopeType: 'all' }),
    municipio: scope?.municipio,
    periodo: formatReportPeriod(responses, scope),
    overallPercentage: overallPct,
    averageTheta: avgTheta(responses.map((r) => r.theta ?? null)),
    totalItems: responses.length,
    highlights,
    performanceBreakdown: buildBreakdownFromPercentages(
      responses.map((r) => ({ pct: r.percentual_acerto ?? 0 })),
    ),
    areaRows: formAreaRows,
    weakSkills: weakSkills.slice(0, 8),
    bloomRows: skillsToAreaRows(bloom.slice(0, 8), 'Bloom'),
    recommendedTrails,
    summaryMetrics: [
      { label: 'Formulários analisados', value: String(formGroups.size) },
      {
        label: 'Alunos únicos',
        value: String(new Set(responses.map((r) => r.student_email)).size),
      },
    ],
    triSummary: triSummary.slice(0, 8).map((t) => ({
      label: t.title,
      averageTheta: t.averageTheta,
      averageTct: t.averageTct,
      totalResponses: t.totalResponses,
    })),
    ...sections,
  }
}

export async function buildSkillsRecoveryReport(
  responseIds: string[],
  scopedFormIds: string[] | null,
  scope?: ReportFilters,
): Promise<RecoveryReportData | null> {
  if (responseIds.length === 0) return null

  const { bncc, saeb, bloom } = await aggregateSkillsFromResponseIds(responseIds)
  const triSummary = await loadTriByFormChart(scopedFormIds)

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

  const { data: responseRows } = await supabase
    .from('form_responses')
    .select(
      'id, student_name, student_email, percentual_acerto, theta, nivel_proficiencia, completed_at, municipio, school_name, turma',
    )
    .in('id', responseIds)

  const responses = (responseRows || []) as StudentResponseRow[]
  const overallPercentage = responseAvgTct(responses)
  const averageTheta = avgTheta(responses.map((r) => r.theta ?? null))

  const sections = await enrichReportSections(
    responses,
    bncc,
    saeb,
    bloom,
    skillsToAreaRows(bncc.slice(0, 12), 'BNCC'),
    {
      municipio: scope?.municipio,
      escola: scope?.school_name,
      turma: scope?.turma,
    },
  )

  return {
    kind: 'skills',
    reportTitle: `${APP_NAME} — ${reportKindTitle('skills')}`,
    reportDate: formatReportDate(),
    turma: scope?.turma || 'Todas as turmas',
    escola: reportScopeLabel(scope ?? { scopeType: 'all' }),
    municipio: scope?.municipio,
    periodo: formatReportPeriod(responses, scope),
    overallPercentage,
    averageTheta,
    totalItems: responseIds.length,
    highlights,
    performanceBreakdown: buildBreakdownFromPercentages(bncc.map((s) => ({ pct: s.percentage }))),
    areaRows: [],
    bnccRows: skillsToAreaRows(bncc.slice(0, 12), 'BNCC'),
    saebRows: skillsToAreaRows(saeb.slice(0, 12), 'SAEB'),
    bloomRows: skillsToAreaRows(bloom.slice(0, 8), 'Bloom'),
    weakSkills: weakSkills.slice(0, 8),
    summaryMetrics: [{ label: 'Respostas analisadas', value: String(responseIds.length) }],
    triSummary: triSummary.slice(0, 6).map((t) => ({
      label: t.title,
      averageTheta: t.averageTheta,
      averageTct: t.averageTct,
      totalResponses: t.totalResponses,
    })),
    ...sections,
  }
}

export async function buildDashboardRecoveryReport(
  userId: string,
  role: Profile['role'],
  scope?: ReportFilters,
  profile?: Pick<Profile, 'municipio' | 'school_name' | 'turmas'> | null,
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
      'id, form_id, student_name, student_email, percentual_acerto, theta, nivel_proficiencia, completed_at, municipio, school_name, turma',
    )

  const [{ data: forms }, { data: links }] = await Promise.all([formsQuery, linksQuery])

  const formIds = (forms || []).map((f) => f.id)
  if (scopedFormIds && formIds.length > 0) {
    responsesQuery = responsesQuery.in('form_id', formIds)
  } else if (scopedFormIds) {
    responsesQuery = responsesQuery.in('form_id', ['00000000-0000-0000-0000-000000000000'])
  }

  let effectiveScope = scope
  if (isScopedAdminRole(role) && profile && !scope?.scopeType) {
    effectiveScope = {
      scopeType: profile.school_name ? 'escola' : 'municipio',
      municipio: profile.municipio ?? undefined,
      school_name: profile.school_name ?? undefined,
      dateFrom: scope?.dateFrom,
      dateTo: scope?.dateTo,
    }
  } else if (scope) {
    effectiveScope = {
      ...scope,
      municipio: scope.municipio ?? profile?.municipio ?? undefined,
      school_name: scope.school_name ?? profile?.school_name ?? undefined,
    }
  }

  const { data: responses } = await responsesQuery
  let responseList = responses || []

  if (isScopedAdminRole(role) && profile && !scope?.scopeType) {
    responseList = applyProfileLocationScope(responseList, profile)
  }

  const comparisonPool = applyDashboardDateFilters(
    applyDashboardContextFilters(responseList, {
      municipio: effectiveScope?.municipio,
      school_name: effectiveScope?.school_name,
    }),
    {
      dateFrom: effectiveScope?.dateFrom,
      dateTo: effectiveScope?.dateTo,
    },
  )

  responseList = applyDashboardContextFilters(responseList, {
    municipio: effectiveScope?.municipio,
    school_name: effectiveScope?.school_name,
    turma: effectiveScope?.turma,
  })
  responseList = applyDashboardDateFilters(responseList, {
    dateFrom: effectiveScope?.dateFrom,
    dateTo: effectiveScope?.dateTo,
  })

  if (responseList.length === 0) return null

  const responseIds = responseList.map((r) => r.id)
  const { bncc, saeb, bloom } = await aggregateSkillsFromResponseIds(responseIds)

  const filteredFormIds = [...new Set(responseList.map((r) => r.form_id))]
  const triFormScope =
    isRootRole(role) &&
    !effectiveScope?.municipio &&
    !effectiveScope?.school_name &&
    !effectiveScope?.turma &&
    !effectiveScope?.dateFrom &&
    !effectiveScope?.dateTo
      ? null
      : filteredFormIds
  const triSummary = await loadTriByFormChart(triFormScope)

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

  const reportKind: RecoveryReportKind =
    effectiveScope?.scopeType === 'turma'
      ? 'turma'
      : effectiveScope?.scopeType === 'escola'
        ? 'escola'
        : effectiveScope?.scopeType === 'municipio'
          ? 'municipio'
          : 'dashboard'

  const scopedAreaRows =
    reportKind === 'municipio'
      ? buildGroupedAreaRows(responseList as StudentResponseRow[], 'school')
      : reportKind === 'escola'
        ? buildGroupedAreaRows(responseList as StudentResponseRow[], 'turma')
        : formAreaRows

  const comparisonRows = buildScopeComparison(
    responseList,
    comparisonPool,
    effectiveScope,
    reportKind,
  )

  const predominantSkill = [...bncc, ...saeb].sort((a, b) => a.percentage - b.percentage)[0]?.label

  const sections = await enrichReportSections(
    responseList as StudentResponseRow[],
    bncc,
    saeb,
    bloom,
    scopedAreaRows,
    {
      municipio: effectiveScope?.municipio,
      escola: effectiveScope?.school_name,
      turma: effectiveScope?.turma,
    },
  )

  const trailStudentCount =
    sections.trailRanking?.reduce((sum, row) => sum + row.studentCount, 0) ?? 0

  const defaultSummaryMetrics = [
    { label: 'Avaliações (links)', value: String(links?.length ?? 0) },
    { label: 'Formulários c/ respostas', value: String(formsWithResponses) },
    { label: 'Alunos avaliados', value: String(uniqueStudents) },
    { label: 'Total de respostas', value: String(responseList.length) },
    { label: 'Média TCT geral', value: `${overallPercentage}%` },
    { label: 'Habilidades críticas', value: String(criticalCount) },
  ]

  const summaryMetrics =
    reportKind === 'turma'
      ? buildTurmaSummaryMetrics(
          responseList as StudentResponseRow[],
          trailStudentCount,
          predominantSkill,
        )
      : defaultSummaryMetrics

  return {
    kind: reportKind,
    reportTitle: `${APP_NAME} — ${reportKindTitle(reportKind)}`,
    reportDate: formatReportDate(),
    turma: effectiveScope?.turma || 'Visão consolidada',
    escola:
      effectiveScope?.school_name ||
      (reportKind === 'dashboard' && isRootRole(role) ? 'Todas as escolas' : reportScopeLabel(effectiveScope ?? scope ?? { scopeType: 'all' })),
    municipio: effectiveScope?.municipio,
    periodo: formatReportPeriod(responseList, effectiveScope),
    overallPercentage,
    averageTheta,
    totalItems: responseList.length,
    highlights,
    summaryMetrics,
    performanceBreakdown: buildBreakdownFromPercentages(
      tctScores.map((pct) => ({ pct })),
    ),
    areaRows: scopedAreaRows.slice(0, 12),
    bnccRows: skillsToAreaRows(bncc.slice(0, 12), 'BNCC'),
    criticalSkillRows: skillsToAreaRows(
      [
        ...bncc.filter((s) => s.percentage < 60),
        ...saeb.filter((s) => s.percentage < 60),
      ].slice(0, 8),
      'BNCC/SAEB',
    ),
    saebRows: skillsToAreaRows(saeb.slice(0, 12), 'SAEB'),
    bloomRows: skillsToAreaRows(bloom.slice(0, 8), 'Bloom'),
    weakSkills: weakSkills.slice(0, 8),
    recommendations: buildRecommendations(weakSkills, 'dashboard'),
    triSummary: triSummary.slice(0, 10).map((t) => ({
      label: t.title,
      averageTheta: t.averageTheta,
      averageTct: t.averageTct,
      totalResponses: t.totalResponses,
    })),
    comparisonRows,
    ...sections,
  }
}

export function recoveryReportFilename(data: RecoveryReportData): string {
  const kindSlug =
    data.kind === 'dashboard'
      ? 'dashboard'
      : data.kind === 'turma'
        ? `turma-${(data.turma || 'geral').replace(/\s+/g, '-').slice(0, 24)}`
        : data.kind === 'escola'
          ? 'escola'
          : data.kind === 'municipio'
            ? 'municipio'
            : data.kind
  if (data.kind === 'dashboard' || data.kind === 'turma' || data.kind === 'escola' || data.kind === 'municipio') {
    return `relatorio-${kindSlug}-${Date.now()}.pdf`
  }
  if (data.kind === 'studentForm') {
    const slug = (data.formTitle || data.studentName || 'formulario')
      .replace(/[^a-zA-Z0-9\u00C0-\u024F]+/g, '-')
      .slice(0, 40)
    return `relatorio-aluno-formulario-${slug}-${Date.now()}.pdf`
  }
  const slug = data.studentName || data.formTitle || 'habilidades'
  const safe = slug.replace(/[^a-zA-Z0-9\u00C0-\u024F]+/g, '-').slice(0, 40)
  return `relatorio-${data.kind}-${safe}-${Date.now()}.pdf`
}

export { APP_TAGLINE }
