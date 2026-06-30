import {
  findFormTrailByPercent,
  formatPercentRange,
  type FormTrailMatch,
} from '@/lib/formTrails'
import { PROFESSOR_TRAIL_COLUMNS, getProfessorTrailPdfUrl, getStudentTrailPdfUrl } from '@/lib/trailAreas'
import {
  recommendFormTrail,
  buildResponseTrailContext,
  TRAIL_TIER_LABELS,
  type TrailDiagnosis,
  type TrailTier,
  DIAGNOSTIC_CLASSIFICATION_LABELS,
} from '@/lib/trailRecommendation'
import type { RawAnswerRow } from '@/lib/reportAnalytics'
import { supabase } from '@/lib/supabase'
import type { LearningTrail } from '@/types/database'

const BASIC_LEARNING_TRAIL_COLUMNS =
  'id, title, description, pdf_url, link_url, content' as const

const FORM_TRAILS_BASE_SELECT =
  'id, form_id, min_percent, max_percent, title, pdf_url, learning_trail_id' as const

export function pickNestedOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export interface ResolvedStudentTrail {
  trail: LearningTrail | null
  displayTitle: string
  percentRange: string | null
  pdfUrl?: string | null
  studentPdfUrl?: string | null
  diagnosis?: TrailDiagnosis
  trailTier?: TrailTier
  classificationLabel?: string
  matchPercent?: number | null
}

export interface ResponseTrailInput {
  percentualAcerto: number | null | undefined
  score?: number | null
  correctAnswers?: number | null
  totalQuestions?: number | null
  answers?: RawAnswerRow[]
  responseId?: string
}

export function buildResponseTrailInput(
  response: {
    id: string
    percentual_acerto?: number | null
    score?: number | null
    correct_answers?: number | null
    total_questions?: number | null
  },
  answers?: RawAnswerRow[],
): ResponseTrailInput {
  return {
    percentualAcerto: response.percentual_acerto,
    correctAnswers: response.correct_answers,
    totalQuestions: response.total_questions,
    answers,
    responseId: response.id,
  }
}

type FormTrailEmbed = {
  min_percent: number
  max_percent: number
  title?: string | null
  pdf_url?: string | null
  learning_trail?: LearningTrail | LearningTrail[] | null
}

type TrailAssignmentEmbed =
  | {
      form_trail?: FormTrailEmbed | FormTrailEmbed[] | null
      trail?: LearningTrail | LearningTrail[] | null
      learning_trails?: LearningTrail | LearningTrail[] | null
    }
  | Array<{
      form_trail?: FormTrailEmbed | FormTrailEmbed[] | null
      trail?: LearningTrail | LearningTrail[] | null
      learning_trails?: LearningTrail | LearningTrail[] | null
    }>

function trailFromFormTrailEmbed(formTrail: FormTrailEmbed): ResolvedStudentTrail | null {
  const learningTrail = pickNestedOne(formTrail.learning_trail ?? null)
  const displayTitle =
    learningTrail?.title || formTrail.title?.trim() || 'Trilha de recomposição'

  if (!learningTrail && !formTrail.title?.trim()) return null

  return {
    trail: learningTrail,
    displayTitle,
    pdfUrl: getProfessorTrailPdfUrl(learningTrail, formTrail.pdf_url),
    studentPdfUrl: getStudentTrailPdfUrl(learningTrail, formTrail.pdf_url),
    percentRange:
      formTrail.min_percent != null && formTrail.max_percent != null
        ? formatPercentRange(Number(formTrail.min_percent), Number(formTrail.max_percent))
        : null,
  }
}

function trailFromLegacyLearningTrail(learningTrail: LearningTrail): ResolvedStudentTrail {
  return {
    trail: learningTrail,
    displayTitle: learningTrail.title?.trim() || 'Trilha de recomposição',
    pdfUrl: getProfessorTrailPdfUrl(learningTrail),
    studentPdfUrl: getStudentTrailPdfUrl(learningTrail),
    percentRange: null,
  }
}

export function resolveTrailFromAssignmentEmbed(
  trailAssignment: TrailAssignmentEmbed | null | undefined,
): ResolvedStudentTrail | null {
  const assignment = pickNestedOne(trailAssignment ?? null)
  if (!assignment) return null

  const formTrail = pickNestedOne(assignment.form_trail ?? null)
  if (formTrail) {
    const resolved = trailFromFormTrailEmbed(formTrail)
    if (resolved) return resolved
  }

  const legacyTrail = pickNestedOne(
    assignment.trail ?? assignment.learning_trails ?? null,
  )
  if (legacyTrail) return trailFromLegacyLearningTrail(legacyTrail)

  return null
}

function buildDiagnosis(input: ResponseTrailInput): TrailDiagnosis | null {
  if (input.responseId && input.answers) {
    const { diagnosis } = buildResponseTrailContext(
      input.answers,
      input.responseId,
      {
        percentualAcerto: input.percentualAcerto,
        weightedScore: input.score,
        correctAnswers: input.correctAnswers,
        totalQuestions: input.totalQuestions,
      },
    )
    return diagnosis
  }

  if (input.percentualAcerto == null && input.score == null) return null

  const { diagnosis } = buildResponseTrailContext([], input.responseId ?? '', {
    percentualAcerto: input.percentualAcerto,
    weightedScore: input.score,
    correctAnswers: input.correctAnswers,
    totalQuestions: input.totalQuestions,
  })
  return diagnosis
}

function resolvedFromDiagnosis(
  diagnosis: TrailDiagnosis,
  matched: FormTrailMatch | null,
): ResolvedStudentTrail {
  if (matched) {
    const learningTrail = pickNestedOne(
      (matched.learning_trail as LearningTrail | LearningTrail[] | null | undefined) ?? null,
    )
    return {
      trail: learningTrail,
      displayTitle:
        learningTrail?.title || matched.title?.trim() || TRAIL_TIER_LABELS[diagnosis.trailTier],
      pdfUrl: getProfessorTrailPdfUrl(learningTrail, matched.pdf_url),
      studentPdfUrl: getStudentTrailPdfUrl(learningTrail, matched.pdf_url),
      percentRange: formatPercentRange(
        Number(matched.min_percent),
        Number(matched.max_percent),
      ),
      diagnosis,
      trailTier: diagnosis.trailTier,
      classificationLabel: DIAGNOSTIC_CLASSIFICATION_LABELS[diagnosis.classification],
      matchPercent: diagnosis.scorePercent,
    }
  }

  return {
    trail: null,
    displayTitle: TRAIL_TIER_LABELS[diagnosis.trailTier],
    percentRange: null,
    diagnosis,
    trailTier: diagnosis.trailTier,
    classificationLabel: DIAGNOSTIC_CLASSIFICATION_LABELS[diagnosis.classification],
    matchPercent: diagnosis.scorePercent,
  }
}

export function resolveTrailFromFormTrails(
  input: ResponseTrailInput,
  formTrails: FormTrailMatch[],
): ResolvedStudentTrail | null {
  const diagnosis = buildDiagnosis(input)
  if (!diagnosis) return null

  if (formTrails.length === 0) {
    return resolvedFromDiagnosis(diagnosis, null)
  }

  const matched =
    recommendFormTrail(formTrails, diagnosis) ??
    findFormTrailByPercent(formTrails, diagnosis.scorePercent)

  return resolvedFromDiagnosis(diagnosis, matched)
}

export function resolveStudentResponseTrail(
  trailAssignment: TrailAssignmentEmbed | null | undefined,
  input: ResponseTrailInput,
  formTrails: FormTrailMatch[],
): ResolvedStudentTrail | null {
  return (
    resolveTrailFromFormTrails(input, formTrails) ??
    resolveTrailFromAssignmentEmbed(trailAssignment)
  )
}

async function loadLearningTrailsByIds(ids: string[]): Promise<Map<string, LearningTrail>> {
  if (ids.length === 0) return new Map()

  try {
    const { data, error } = await supabase
      .from('learning_trails')
      .select(PROFESSOR_TRAIL_COLUMNS)
      .in('id', ids)

    if (!error && data?.length) {
      return new Map((data as LearningTrail[]).map((trail) => [trail.id, trail]))
    }
  } catch {
    // Colunas pedagógicas podem não existir em ambientes sem migração 020.
  }

  const { data: basic, error: basicError } = await supabase
    .from('learning_trails')
    .select(BASIC_LEARNING_TRAIL_COLUMNS)
    .in('id', ids)

  if (basicError) {
    console.warn('Não foi possível carregar learning_trails:', basicError.message)
    return new Map()
  }

  return new Map(((basic ?? []) as LearningTrail[]).map((trail) => [trail.id, trail]))
}

export async function loadFormTrailsByFormIds(
  formIds: string[],
): Promise<Record<string, FormTrailMatch[]>> {
  if (formIds.length === 0) return {}

  const { data, error } = await supabase
    .from('form_trails')
    .select(FORM_TRAILS_BASE_SELECT)
    .in('form_id', formIds)
    .order('min_percent')

  if (error) {
    console.warn('Não foi possível carregar form_trails:', error.message)
    return {}
  }

  type FormTrailRow = {
    id: string
    form_id: string
    min_percent: number
    max_percent: number
    title?: string | null
    pdf_url?: string | null
    learning_trail_id?: string | null
  }

  const rows = (data ?? []) as unknown as FormTrailRow[]
  const learningTrailIds = [
    ...new Set(rows.map((row) => row.learning_trail_id).filter(Boolean)),
  ] as string[]

  const learningTrailsById = await loadLearningTrailsByIds(learningTrailIds)

  const map: Record<string, FormTrailMatch[]> = {}
  for (const row of rows) {
    const formId = row.form_id
    if (!map[formId]) map[formId] = []

    const learningTrail = row.learning_trail_id
      ? learningTrailsById.get(row.learning_trail_id) ?? null
      : null

    map[formId].push({
      id: row.id,
      title: learningTrail?.title || row.title || 'Trilha de recomposição',
      min_percent: Number(row.min_percent),
      max_percent: Number(row.max_percent),
      pdf_url: row.pdf_url ?? learningTrail?.pedagogical_pdf_url ?? learningTrail?.pdf_url ?? null,
      learning_trail: learningTrail,
    })
  }

  return map
}
