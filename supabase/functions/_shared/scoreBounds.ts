/** Limites compatíveis com DECIMAL(5,2) e DECIMAL(6,3) no Postgres. */

const MAX_SCORE = 999.99
const MAX_THETA = 99.999

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(Math.min(MAX_SCORE, Math.max(0, value)) * 100) / 100
}

export function clampTheta(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(Math.min(MAX_THETA, Math.max(-MAX_THETA, value)) * 1000) / 1000
}

export function clampPointValue(value: number, fallback = 1): number {
  if (!Number.isFinite(value)) return fallback
  return Math.round(Math.min(MAX_SCORE, Math.max(0, value)) * 100) / 100
}

export function sanitizeItemTriParams(params: { a: number; b: number; c: number }) {
  const clamp = (value: number, fallback: number, max: number) => {
    if (!Number.isFinite(value)) return fallback
    return Math.round(Math.min(max, Math.max(-max, value)) * 1000) / 1000
  }
  const clampGuess = (value: number, fallback: number) => {
    if (!Number.isFinite(value)) return fallback
    return Math.round(Math.min(0.999, Math.max(0, value)) * 1000) / 1000
  }
  return {
    a: clamp(params.a, 1, 9.999),
    b: clamp(params.b, 0, 99.999),
    c: clampGuess(params.c, 0.25),
  }
}
