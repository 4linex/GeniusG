import {
  findFormTrailByPercent,
  type FormTrailMatch,
} from '@/lib/formTrails'
import type { RawAnswerRow } from '@/lib/reportAnalytics'
import { aggregateSkillsFromAnswers } from '@/lib/reportAnalytics'

export type TrailTier = 1 | 2 | 3

export type DiagnosticClassification =
  | 'insuficiente'
  | 'em_desenvolvimento'
  | 'proficiente'

export interface SkillPerformanceRow {
  key: string
  percentage: number
  total: number
}

export interface AnswerForTrail {
  is_correct: boolean
  point_value: number
  nivel_dificuldade?: string | null
}

export interface TrailDiagnosis {
  easyCorrect: number
  easyTotal: number
  mediumCorrect: number
  mediumTotal: number
  hardCorrect: number
  hardTotal: number
  weightedScore: number
  maxScore: number
  scorePercent: number
  classification: DiagnosticClassification
  trailTier: TrailTier
  safetyRuleApplied: boolean
  priorityBncc: SkillPerformanceRow[]
  prioritySaeb: SkillPerformanceRow[]
}

/** Referência do modelo diagnóstico (60 itens, 20 fáceis). */
export const SAFETY_EASY_RATIO = 12 / 20
export const SKILL_PRIORITY_HIGH_MAX = 49
const MIN_BAND_ITEMS = 2
const MIN_EASY_FOR_FULL_SAFETY = 10

export const DIAGNOSTIC_CLASSIFICATION_LABELS: Record<DiagnosticClassification, string> = {
  insuficiente: 'Insuficiente',
  em_desenvolvimento: 'Em desenvolvimento',
  proficiente: 'Proficiente',
}

export const TRAIL_TIER_LABELS: Record<TrailTier, string> = {
  1: 'Trilha 1 — Recomposição de base',
  2: 'Trilha 2 — Desenvolvimento da compreensão textual',
  3: 'Trilha 3 — Ampliação e aprofundamento',
}

function clampScore(value: number): number {
  return Math.round(Math.max(0, value) * 10) / 10
}

function bandPercent(correct: number, total: number): number | null {
  if (total === 0) return null
  return Math.round((correct / total) * 100)
}

function classificationFromTier(tier: TrailTier): DiagnosticClassification {
  if (tier === 1) return 'insuficiente'
  if (tier === 2) return 'em_desenvolvimento'
  return 'proficiente'
}

function tierFromScorePercent(scorePercent: number): TrailTier {
  if (scorePercent < 50) return 1
  if (scorePercent < 75) return 2
  return 3
}

export function normalizeDifficultyBand(
  nivelDificuldade: string | null | undefined,
  pointValue?: number,
): 'easy' | 'medium' | 'hard' | 'other' {
  const name = nivelDificuldade?.trim().toLowerCase() ?? ''
  if (/f[aá]cil|easy/.test(name)) return 'easy'
  if (/m[eé]dio|medium/.test(name)) return 'medium'
  if (/dif[ií]cil|hard/.test(name)) return 'hard'

  const points = Number(pointValue ?? 1)
  if (points <= 1) return 'easy'
  if (points <= 1.5) return 'medium'
  if (points > 1.5) return 'hard'
  return 'other'
}

function shouldApplySafetyRule(
  easyCorrect: number,
  easyTotal: number,
  scorePercent: number,
): boolean {
  if (easyTotal === 0) return false
  // Bom desempenho ponderado não deve ser rebaixado por amostra pequena de itens fáceis.
  if (scorePercent >= 75) return false

  const easyRatio = easyCorrect / easyTotal
  if (easyTotal >= MIN_EASY_FOR_FULL_SAFETY) {
    return easyRatio < SAFETY_EASY_RATIO
  }
  if (easyTotal >= MIN_BAND_ITEMS) {
    return easyRatio < SAFETY_EASY_RATIO && scorePercent < 60
  }
  return false
}

export function resolveTrailTier(input: {
  easyCorrect: number
  easyTotal: number
  mediumCorrect: number
  mediumTotal: number
  hardCorrect: number
  hardTotal: number
  scorePercent: number
}): {
  trailTier: TrailTier
  classification: DiagnosticClassification
  safetyRuleApplied: boolean
} {
  const {
    easyCorrect,
    easyTotal,
    mediumCorrect,
    mediumTotal,
    hardCorrect,
    hardTotal,
    scorePercent,
  } = input

  if (shouldApplySafetyRule(easyCorrect, easyTotal, scorePercent)) {
    return {
      trailTier: 1,
      classification: 'insuficiente',
      safetyRuleApplied: true,
    }
  }

  let tier = tierFromScorePercent(scorePercent)
  let classification = classificationFromTier(tier)

  const easyPct = bandPercent(easyCorrect, easyTotal)
  const medPct = bandPercent(mediumCorrect, mediumTotal)
  const hardPct = bandPercent(hardCorrect, hardTotal)

  const lowEasy = easyTotal >= MIN_BAND_ITEMS && easyPct != null && easyPct < 50
  const lowMed = mediumTotal >= MIN_BAND_ITEMS && medPct != null && medPct < 50
  const lowHard = hardTotal >= MIN_BAND_ITEMS && hardPct != null && hardPct < 50
  const goodEasy = easyTotal < MIN_BAND_ITEMS || easyPct == null || easyPct >= 50
  const goodMed = mediumTotal < MIN_BAND_ITEMS || medPct == null || medPct >= 50
  const goodHard = hardTotal < MIN_BAND_ITEMS || hardPct == null || hardPct >= 50

  if (lowEasy && scorePercent < 60) {
    return { trailTier: 1, classification: 'insuficiente', safetyRuleApplied: false }
  }
  if (goodEasy && lowMed) {
    tier = Math.min(tier, 2) as TrailTier
    classification = classificationFromTier(tier)
  }
  if (goodEasy && goodMed && lowHard) {
    tier = 2
    classification = 'em_desenvolvimento'
  }
  if (goodEasy && goodMed && goodHard && scorePercent >= 75) {
    tier = 3
    classification = 'proficiente'
  }

  return { trailTier: tier, classification, safetyRuleApplied: false }
}

export function computeTrailDiagnosisFromAnswers(
  answers: AnswerForTrail[],
  bnccSkills: SkillPerformanceRow[] = [],
  saebSkills: SkillPerformanceRow[] = [],
): TrailDiagnosis {
  let easyCorrect = 0
  let easyTotal = 0
  let mediumCorrect = 0
  let mediumTotal = 0
  let hardCorrect = 0
  let hardTotal = 0
  let weightedScore = 0
  let maxScore = 0

  for (const answer of answers) {
    const points = Number(answer.point_value) > 0 ? Number(answer.point_value) : 0
    if (points <= 0) continue

    maxScore += points
    if (answer.is_correct) weightedScore += points

    const band = normalizeDifficultyBand(answer.nivel_dificuldade, points)
    if (band === 'easy') {
      easyTotal++
      if (answer.is_correct) easyCorrect++
    } else if (band === 'medium') {
      mediumTotal++
      if (answer.is_correct) mediumCorrect++
    } else if (band === 'hard') {
      hardTotal++
      if (answer.is_correct) hardCorrect++
    }
  }

  const scorePercent =
    maxScore > 0 ? Math.round((weightedScore / maxScore) * 1000) / 10 : 0

  const tierResult = resolveTrailTier({
    easyCorrect,
    easyTotal,
    mediumCorrect,
    mediumTotal,
    hardCorrect,
    hardTotal,
    scorePercent,
  })

  return {
    easyCorrect,
    easyTotal,
    mediumCorrect,
    mediumTotal,
    hardCorrect,
    hardTotal,
    weightedScore: clampScore(weightedScore),
    maxScore: clampScore(maxScore),
    scorePercent,
    ...tierResult,
    priorityBncc: bnccSkills.filter((s) => s.total > 0 && s.percentage <= SKILL_PRIORITY_HIGH_MAX),
    prioritySaeb: saebSkills.filter((s) => s.total > 0 && s.percentage <= SKILL_PRIORITY_HIGH_MAX),
  }
}

/** Fallback quando respostas por questão não estão no cache (alunos antigos). */
export function computeTrailDiagnosisFromResponseSummary(
  percentualAcerto: number | null | undefined,
  options?: {
    weightedScore?: number | null
    maxScore?: number | null
    correctAnswers?: number | null
    totalQuestions?: number | null
  },
): TrailDiagnosis | null {
  if (percentualAcerto == null && options?.weightedScore == null) return null

  const maxScore = Number(options?.maxScore ?? 0)
  const weightedScore = Number(options?.weightedScore ?? 0)
  const scorePercent =
    maxScore > 0
      ? Math.round((weightedScore / maxScore) * 1000) / 10
      : Number(percentualAcerto ?? 0)

  const tierResult = resolveTrailTier({
    easyCorrect: 0,
    easyTotal: 0,
    mediumCorrect: 0,
    mediumTotal: 0,
    hardCorrect: 0,
    hardTotal: 0,
    scorePercent,
  })

  return {
    easyCorrect: 0,
    easyTotal: 0,
    mediumCorrect: 0,
    mediumTotal: 0,
    hardCorrect: 0,
    hardTotal: 0,
    weightedScore: clampScore(weightedScore),
    maxScore: clampScore(maxScore),
    scorePercent,
    ...tierResult,
    priorityBncc: [],
    prioritySaeb: [],
  }
}

export function recommendFormTrail(
  formTrails: FormTrailMatch[],
  diagnosis: TrailDiagnosis,
): FormTrailMatch | null {
  if (formTrails.length === 0) return null

  const byPercent = findFormTrailByPercent(formTrails, diagnosis.scorePercent)
  if (byPercent) return byPercent

  const sorted = [...formTrails].sort(
    (a, b) => Number(a.min_percent) - Number(b.min_percent),
  )
  if (sorted.length >= diagnosis.trailTier) {
    return sorted[diagnosis.trailTier - 1]
  }

  return sorted[sorted.length - 1] ?? null
}

export function rawAnswersToTrailItems(answers: RawAnswerRow[]): AnswerForTrail[] {
  return answers.map((a) => ({
    is_correct: a.is_correct,
    point_value: Number(a.point_value ?? 1),
    nivel_dificuldade: a.nivel_dificuldade ?? null,
  }))
}

export function buildResponseTrailContext(
  answers: RawAnswerRow[],
  responseId: string,
  responseSummary?: {
    percentualAcerto?: number | null
    weightedScore?: number | null
    maxScore?: number | null
    correctAnswers?: number | null
    totalQuestions?: number | null
  },
): {
  bnccSkills: SkillPerformanceRow[]
  saebSkills: SkillPerformanceRow[]
  diagnosis: TrailDiagnosis
} {
  const ids = new Set([responseId])
  const bncc = aggregateSkillsFromAnswers(answers, ids, 'bncc')
  const saeb = aggregateSkillsFromAnswers(answers, ids, 'saeb')
  const responseAnswers = answers.filter((a) => a.response_id === responseId)

  let diagnosis: TrailDiagnosis
  if (responseAnswers.length > 0) {
    diagnosis = computeTrailDiagnosisFromAnswers(
      rawAnswersToTrailItems(responseAnswers),
      bncc,
      saeb,
    )
  } else {
    diagnosis =
      computeTrailDiagnosisFromResponseSummary(
        responseSummary?.percentualAcerto,
        {
          weightedScore: responseSummary?.weightedScore,
          maxScore: responseSummary?.maxScore,
          correctAnswers: responseSummary?.correctAnswers,
          totalQuestions: responseSummary?.totalQuestions,
        },
      ) ??
      computeTrailDiagnosisFromResponseSummary(responseSummary?.percentualAcerto, {
        correctAnswers: responseSummary?.correctAnswers,
        totalQuestions: responseSummary?.totalQuestions,
      })!
  }

  return { bnccSkills: bncc, saebSkills: saeb, diagnosis }
}

export function computeTrailDiagnosisForResponse(
  answers: RawAnswerRow[],
  responseId: string,
  responseSummary?: Parameters<typeof buildResponseTrailContext>[2],
): TrailDiagnosis {
  return buildResponseTrailContext(answers, responseId, responseSummary).diagnosis
}

function isEmptySkill(value: string | null | undefined, emptyLabel: string): boolean {
  const trimmed = value?.trim()
  return !trimmed || trimmed === emptyLabel
}

export function aggregateSkillsFromSubmitAnswers(
  answers: Array<{ question_id: string; is_correct: boolean }>,
  questionMap: Map<
    string,
    {
      habilidade_bncc?: string | null
      descritor_saeb?: string | null
      nivel_dificuldade?: string | null
      point_value?: number | null
    }
  >,
): {
  bncc: SkillPerformanceRow[]
  saeb: SkillPerformanceRow[]
  trailAnswers: AnswerForTrail[]
} {
  const bnccMap = new Map<string, { total: number; correct: number }>()
  const saebMap = new Map<string, { total: number; correct: number }>()
  const trailAnswers: AnswerForTrail[] = []

  for (const answer of answers) {
    const question = questionMap.get(answer.question_id)
    if (!question) continue

    trailAnswers.push({
      is_correct: answer.is_correct,
      point_value: Number(question.point_value ?? 1),
      nivel_dificuldade: question.nivel_dificuldade ?? null,
    })

    const bnccKey = question.habilidade_bncc?.trim()
    if (bnccKey && !isEmptySkill(bnccKey, 'Sem habilidade BNCC')) {
      const cur = bnccMap.get(bnccKey) || { total: 0, correct: 0 }
      cur.total++
      if (answer.is_correct) cur.correct++
      bnccMap.set(bnccKey, cur)
    }

    const saebKey = question.descritor_saeb?.trim()
    if (saebKey && !isEmptySkill(saebKey, 'Sem descritor SAEB')) {
      const cur = saebMap.get(saebKey) || { total: 0, correct: 0 }
      cur.total++
      if (answer.is_correct) cur.correct++
      saebMap.set(saebKey, cur)
    }
  }

  const toRows = (map: Map<string, { total: number; correct: number }>): SkillPerformanceRow[] =>
    Array.from(map.entries()).map(([key, s]) => ({
      key,
      total: s.total,
      percentage: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    }))

  return {
    bncc: toRows(bnccMap),
    saeb: toRows(saebMap),
    trailAnswers,
  }
}
