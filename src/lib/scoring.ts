/**
 * Motor de pontuação conforme PRD:
 * - TCT: percentual de acerto (leitura pedagógica imediata)
 * - TRI 3PL: estimativa de theta (proficiência latente)
 * - Classificação em 3 níveis: inicial | intermediario | avancado
 */

import { clampTheta } from '@/lib/scoreBounds'

export type NivelProficiencia = 'inicial' | 'intermediario' | 'avancado'

export interface ItemTriParams {
  a: number // discriminação
  b: number // dificuldade
  c: number // acerto ao acaso
}

export interface ScoredResponse {
  isCorrect: boolean
  params: ItemTriParams
  /** Pontos da questão (padrão 1). Questões com 0 não entram no cálculo. */
  pointValue?: number
}

export const NIVEL_PROFICIENCIA_LABELS: Record<NivelProficiencia, string> = {
  inicial: 'Inicial / Emergente',
  intermediario: 'Intermediário / Em Desenvolvimento',
  avancado: 'Avançado / Consolidado',
}

/** Probabilidade de acerto no modelo 3PL: P = c + (1-c) / (1 + exp(-a*(θ-b))) */
export function probability3PL(theta: number, { a, b, c }: ItemTriParams): number {
  const expTerm = Math.exp(-a * (theta - b))
  return c + (1 - c) / (1 + expTerm)
}

/** TCT — percentual de acertos (cada questão vale igual) */
export function calculateTCT(correct: number, total: number): number {
  if (total === 0) return 0
  return Math.round((correct / total) * 1000) / 10
}

/** TCT ponderado — percentual com base na pontuação definida por questão */
export function calculateWeightedTCT(responses: ScoredResponse[]): number {
  const scorable = responses.filter((r) => (r.pointValue ?? 1) > 0)
  if (scorable.length === 0) return 0

  const totalPoints = scorable.reduce((sum, r) => sum + (r.pointValue ?? 1), 0)
  if (totalPoints === 0) return 0

  const earned = scorable
    .filter((r) => r.isCorrect)
    .reduce((sum, r) => sum + (r.pointValue ?? 1), 0)

  return Math.round((earned / totalPoints) * 1000) / 10
}

function scorableResponses(responses: ScoredResponse[]): ScoredResponse[] {
  return responses.filter((r) => (r.pointValue ?? 1) > 0)
}

/**
 * Estima θ via MLE (Newton-Raphson) considerando parâmetros a, b, c de cada item.
 */
export function estimateTheta(responses: ScoredResponse[]): number {
  if (responses.length === 0) return 0

  let theta = 0
  const maxIter = 50
  const tolerance = 1e-4

  for (let iter = 0; iter < maxIter; iter++) {
    let firstDeriv = 0
    let secondDeriv = 0

    for (const { isCorrect, params } of responses) {
      const { a, b, c } = params
      const p = probability3PL(theta, params)
      const q = 1 - p
      const L = 1 / (1 + Math.exp(-a * (theta - b)))
      const dp = (1 - c) * a * L * (1 - L)

      const u = isCorrect ? 1 : 0
      if (p > 1e-10 && q > 1e-10) {
        firstDeriv += (u - p) * (dp / (p * q))
        secondDeriv -= (dp * dp) / (p * q)
      }
    }

    if (Math.abs(secondDeriv) < 1e-10) break

    const delta = firstDeriv / secondDeriv
    theta += delta

    if (Math.abs(delta) < tolerance) break
  }

  return clampTheta(Math.round(theta * 1000) / 1000)
}

/** Converte θ em escala de proficiência percentual para exibição (0–100) */
export function thetaToProficiencyScale(theta: number): number {
  const safeTheta = Number.isFinite(theta) ? theta : 0
  const p = 1 / (1 + Math.exp(-safeTheta))
  return Math.round(Math.min(100, Math.max(0, p * 1000))) / 10
}

/**
 * Classificação em 3 níveis (PRD Épico 3.3).
 * Prioriza θ quando TRI disponível; fallback TCT quando θ=0 e todos params default.
 */
export function classifyProficiency(
  theta: number,
  percentualAcerto: number,
  usedTri: boolean,
): NivelProficiencia {
  if (usedTri) {
    if (theta < -0.5) return 'inicial'
    if (theta < 0.5) return 'intermediario'
    return 'avancado'
  }

  // Fallback TCT quando parâmetros TRI não calibrados
  if (percentualAcerto < 50) return 'inicial'
  if (percentualAcerto < 75) return 'intermediario'
  return 'avancado'
}

export function defaultTriParams(numAlternatives = 4): ItemTriParams {
  return {
    a: 1.0,
    b: 0,
    c: Math.round((1 / numAlternatives) * 1000) / 1000,
  }
}

export function hasCalibratedTriParams(
  dificuldade: number | null | undefined,
  discriminacao: number | null | undefined,
): boolean {
  return (
    dificuldade != null &&
    discriminacao != null &&
    (dificuldade !== 0 || discriminacao !== 1.0)
  )
}

export function processAssessment(
  responses: ScoredResponse[],
  usedTri: boolean,
): {
  percentualAcerto: number
  theta: number
  proficienciaEscala: number
  nivelProficiencia: NivelProficiencia
  correct: number
  total: number
} {
  const scored = scorableResponses(responses)
  const pool = scored.length > 0 ? scored : responses
  const correct = pool.filter((r) => r.isCorrect).length
  const total = pool.length
  const percentualAcerto = calculateTCT(correct, total)
  const theta = usedTri ? estimateTheta(pool) : 0
  const weightedScore = calculateWeightedTCT(responses)
  const proficienciaEscala = usedTri ? thetaToProficiencyScale(theta) : weightedScore
  const nivelProficiencia = classifyProficiency(theta, percentualAcerto, usedTri)

  return {
    percentualAcerto,
    theta,
    proficienciaEscala,
    nivelProficiencia,
    correct,
    total,
  }
}
