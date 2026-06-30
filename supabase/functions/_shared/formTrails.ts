/** Espelho de src/lib/formTrails.ts — matching de trilhas por % de acerto */

export interface FormTrailRow {
  id: string
  title?: string | null
  description?: string | null
  min_percent: number
  max_percent: number
  pdf_url?: string | null
  link_url?: string | null
  content?: string | null
  difficulty?: string
  learning_trail?: {
    title?: string
    description?: string | null
    pdf_url?: string | null
    link_url?: string | null
    content?: string | null
  } | null
}

export function resolveTrailContent(row: FormTrailRow): {
  title: string
  description?: string | null
  pdf_url?: string | null
  link_url?: string | null
  content?: string | null
} {
  const bank = row.learning_trail
  return {
    title: bank?.title || row.title || 'Trilha de aprendizagem',
    description: bank?.description ?? row.description ?? null,
    pdf_url: bank?.pdf_url ?? row.pdf_url ?? null,
    link_url: bank?.link_url ?? row.link_url ?? null,
    content: bank?.content ?? row.content ?? null,
  }
}

export function findFormTrailByPercent(
  trails: FormTrailRow[],
  percent: number,
): FormTrailRow | null {
  if (trails.length === 0) return null

  const normalized = normalizeAcertoPercent(percent)
  const sorted = [...trails].sort((a, b) => Number(a.min_percent) - Number(b.min_percent))
  const epsilon = 0.01

  for (const trail of sorted) {
    const min = Number(trail.min_percent)
    const max = Number(trail.max_percent)
    if (normalized + epsilon >= min && normalized - epsilon <= max) {
      return trail
    }
  }

  let fallback: FormTrailRow | null = null
  for (const trail of sorted) {
    if (normalized >= Number(trail.min_percent)) {
      fallback = trail
    }
  }
  if (fallback) return fallback

  return sorted[0] ?? null
}

function normalizeAcertoPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0
  const value = Number(percent)
  if (value > 0 && value <= 1) return Math.round(value * 10000) / 100
  return value
}
