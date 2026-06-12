/**
 * Estimativa empírica de parâmetros TRI 3PL a partir das respostas coletadas.
 */

export interface ItemTriParams {
  a: number
  b: number
  c: number
}

export function defaultTriParams(numAlternatives = 4): ItemTriParams {
  return {
    a: 1.0,
    b: 0,
    c: Math.round((1 / numAlternatives) * 1000) / 1000,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** Correlação ponto-biserial simplificada entre acerto no item e desempenho no teste */
export function pointBiserial(itemScores: number[], testScores: number[]): number {
  const n = itemScores.length
  if (n < 3) return 1.0

  const meanItem = itemScores.reduce((s, v) => s + v, 0) / n
  const meanTest = testScores.reduce((s, v) => s + v, 0) / n

  let cov = 0
  let varItem = 0
  let varTest = 0

  for (let i = 0; i < n; i++) {
    const di = itemScores[i] - meanItem
    const dt = testScores[i] - meanTest
    cov += di * dt
    varItem += di * di
    varTest += dt * dt
  }

  if (varItem === 0 || varTest === 0) return 1.0
  const r = cov / Math.sqrt(varItem * varTest)
  return clamp(Number.isFinite(r) ? r : 1.0, 0.2, 2.5)
}

/** Converte proporção de acertos em parâmetro de dificuldade b (escala logit) */
export function difficultyFromProportion(p: number): number {
  const clamped = clamp(p, 0.05, 0.95)
  return Math.round(-Math.log(clamped / (1 - clamped)) * 100) / 100
}

export function estimateItemParamsFromResponses(
  correctCount: number,
  totalAttempts: number,
  numAlternatives: number,
  itemScores?: number[],
  testScores?: number[],
): ItemTriParams {
  const c = Math.round((1 / numAlternatives) * 1000) / 1000

  if (totalAttempts === 0) {
    return defaultTriParams(numAlternatives)
  }

  const p = correctCount / totalAttempts
  const b = difficultyFromProportion(p)

  let a = 1.0
  if (itemScores && testScores && itemScores.length >= 3) {
    a = pointBiserial(itemScores, testScores)
  } else if (totalAttempts >= 5) {
    a = clamp(1 + (0.5 - p), 0.4, 2.0)
  }

  return {
    a: Math.round(a * 100) / 100,
    b,
    c,
  }
}
