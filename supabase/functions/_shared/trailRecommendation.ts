/** Espelho de src/lib/trailRecommendation.ts — lógica diagnóstica adaptável */

import { findFormTrailByPercent } from './formTrails.ts'

export type TrailTier = 1 | 2 | 3
export type DiagnosticClassification = 'insuficiente' | 'em_desenvolvimento' | 'proficiente'

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
}

export const SAFETY_EASY_RATIO = 12 / 20
const MIN_BAND_ITEMS = 2
const MIN_EASY_FOR_FULL_SAFETY = 10

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
  if (scorePercent >= 75) return false
  const easyRatio = easyCorrect / easyTotal
  if (easyTotal >= MIN_EASY_FOR_FULL_SAFETY) return easyRatio < SAFETY_EASY_RATIO
  if (easyTotal >= MIN_BAND_ITEMS) return easyRatio < SAFETY_EASY_RATIO && scorePercent < 60
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
  const { easyCorrect, easyTotal, mediumCorrect, mediumTotal, hardCorrect, hardTotal, scorePercent } =
    input

  if (shouldApplySafetyRule(easyCorrect, easyTotal, scorePercent)) {
    return { trailTier: 1, classification: 'insuficiente', safetyRuleApplied: true }
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

export function computeTrailDiagnosisFromAnswers(answers: AnswerForTrail[]): TrailDiagnosis {
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

  const scorePercent = maxScore > 0 ? Math.round((weightedScore / maxScore) * 1000) / 10 : 0
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
    weightedScore: Math.round(weightedScore * 10) / 10,
    maxScore: Math.round(maxScore * 10) / 10,
    scorePercent,
    ...tierResult,
  }
}

export function trailTierToMatchPercent(tier: TrailTier): number {
  return tier === 1 ? 25 : tier === 2 ? 62 : 88
}

export function recommendFormTrail<
  T extends { id: string; min_percent: number; max_percent: number },
>(formTrails: T[], diagnosis: TrailDiagnosis): T | null {
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
): { trailAnswers: AnswerForTrail[] } {
  const trailAnswers: AnswerForTrail[] = []
  for (const answer of answers) {
    const question = questionMap.get(answer.question_id)
    if (!question) continue
    trailAnswers.push({
      is_correct: answer.is_correct,
      point_value: Number(question.point_value ?? 1),
      nivel_dificuldade: question.nivel_dificuldade ?? null,
    })
  }
  return { trailAnswers }
}
