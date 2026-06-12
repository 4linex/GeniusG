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
  const sorted = [...trails].sort((a, b) => Number(a.min_percent) - Number(b.min_percent))

  for (const trail of sorted) {
    const min = Number(trail.min_percent)
    const max = Number(trail.max_percent)
    if (percent >= min && percent <= max) {
      return trail
    }
  }

  return null
}
