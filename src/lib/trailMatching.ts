import type { LearningTrail } from '@/types/database'

/** Encontra a trilha cuja faixa [min_score, max_score] contém o % de acerto. */
export function findTrailByScore(
  trails: Pick<LearningTrail, 'id' | 'min_score' | 'max_score'>[],
  score: number,
): Pick<LearningTrail, 'id'> | null {
  const sorted = [...trails].sort(
    (a, b) => Number(a.min_score) - Number(b.min_score),
  )

  for (const trail of sorted) {
    const min = Number(trail.min_score)
    const max = Number(trail.max_score)
    if (score >= min && score <= max) {
      return trail
    }
  }

  return null
}

export function formatPercentRange(min: number, max: number): string {
  return `${min}% a ${max}%`
}

/** @deprecated Use formatPercentRange — colunas min_score/max_score armazenam % de acerto */
export function formatScoreRange(min: number, max: number): string {
  return formatPercentRange(min, max)
}
