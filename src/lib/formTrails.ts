import type { FormTrailConfig, LearningTrail } from '@/types/database'

export function createFormTrailAssignment(
  learningTrailId: string,
  overrides?: Partial<FormTrailConfig>,
): FormTrailConfig {
  return {
    localId: crypto.randomUUID(),
    learningTrailId,
    minPercent: 0,
    maxPercent: 100,
    enabled: true,
    ...overrides,
  }
}

export function enrichFormTrailConfig(
  config: FormTrailConfig,
  bankTrail?: Pick<LearningTrail, 'title' | 'description' | 'pdf_url' | 'link_url'> | null,
): FormTrailConfig {
  if (!bankTrail) return config
  return {
    ...config,
    title: bankTrail.title,
    description: bankTrail.description || '',
    pdfUrl: bankTrail.pdf_url || '',
    linkUrl: bankTrail.link_url || '',
  }
}

export function formTrailRowToConfig(row: {
  id?: string
  learning_trail_id?: string | null
  title?: string | null
  description?: string | null
  min_percent?: number
  max_percent?: number
  pdf_url?: string | null
  link_url?: string | null
  learning_trail?: Pick<LearningTrail, 'id' | 'title' | 'description' | 'pdf_url' | 'link_url'> | null
}): FormTrailConfig {
  const bank = row.learning_trail
  return {
    localId: row.id || crypto.randomUUID(),
    learningTrailId: row.learning_trail_id || bank?.id || '',
    minPercent: Number(row.min_percent ?? 0),
    maxPercent: Number(row.max_percent ?? 100),
    enabled: true,
    title: bank?.title || row.title || '',
    description: bank?.description || row.description || '',
    pdfUrl: bank?.pdf_url || row.pdf_url || '',
    linkUrl: bank?.link_url || row.link_url || '',
  }
}

export function validateFormTrails(trails: FormTrailConfig[]): string | null {
  const active = trails.filter((t) => t.enabled && t.learningTrailId)
  if (active.length === 0) return null

  const seen = new Set<string>()

  for (const trail of active) {
    const label = trail.title?.trim() || 'trilha selecionada'

    if (seen.has(trail.learningTrailId)) {
      return `A trilha "${label}" foi adicionada mais de uma vez`
    }
    seen.add(trail.learningTrailId)

    if (!Number.isFinite(trail.minPercent) || !Number.isFinite(trail.maxPercent)) {
      return `Informe percentuais válidos para "${label}"`
    }
    if (trail.minPercent < 0 || trail.maxPercent > 100) {
      return `Os percentuais devem estar entre 0 e 100 para "${label}"`
    }
    if (trail.minPercent > trail.maxPercent) {
      return `O percentual mínimo não pode ser maior que o máximo para "${label}"`
    }
  }

  return null
}

export interface FormTrailMatch {
  id: string
  title?: string | null
  description?: string | null
  pdf_url?: string | null
  link_url?: string | null
  content?: string | null
  min_percent: number
  max_percent: number
  learning_trail?: {
    title?: string
    description?: string | null
    pdf_url?: string | null
    link_url?: string | null
    content?: string | null
  } | null
}

export function resolveTrailContent(
  row: {
    title?: string | null
    description?: string | null
    pdf_url?: string | null
    link_url?: string | null
    content?: string | null
    learning_trail?: {
      title?: string
      description?: string | null
      pdf_url?: string | null
      link_url?: string | null
      content?: string | null
    } | null
  },
): {
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
  trails: FormTrailMatch[],
  percent: number,
): FormTrailMatch | null {
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

export function formatPercentRange(min: number, max: number): string {
  return `${min}% a ${max}% de acerto`
}
