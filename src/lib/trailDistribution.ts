import { formatPercentRange, type FormTrailMatch } from '@/lib/formTrails'
import type { RawAnswerRow } from '@/lib/reportAnalytics'
import {
  TRAIL_TIER_LABELS,
  type TrailTier,
} from '@/lib/trailRecommendation'
import {
  buildResponseTrailInput,
  loadFormTrailsByFormIds,
  resolveTrailFromFormTrails,
} from '@/lib/studentResponseTrail'
import { supabase } from '@/lib/supabase'
import { fetchAllInBatches } from '@/lib/supabaseBatch'
import { fetchAnswersByResponseIds } from '@/lib/responseAnswers'

export interface TrailDistributionRow {
  key: string
  title: string
  percentRange: string
  studentCount: number
  responseCount: number
}

export interface TrailDistributionResponse {
  id: string
  student_email: string
  form_id?: string
  percentual_acerto?: number | null
  correct_answers?: number | null
  total_questions?: number | null
}

const TIER_PERCENT_RANGE: Record<TrailTier, string> = {
  1: formatPercentRange(0, 49),
  2: formatPercentRange(50, 74),
  3: formatPercentRange(75, 100),
}

type TrailBucket = {
  title: string
  percentRange: string
  emails: Set<string>
  responses: number
}

function tierPercentRange(tier: TrailTier): string {
  return TIER_PERCENT_RANGE[tier]
}

async function enrichResponses(
  responses: TrailDistributionResponse[],
): Promise<TrailDistributionResponse[]> {
  const missing = responses.filter((r) => !r.form_id)
  if (missing.length === 0) return responses

  const byId = new Map(responses.map((r) => [r.id, { ...r }]))

  await fetchAllInBatches(
    missing.map((r) => r.id),
    async (chunk) => {
      const { data, error } = await supabase
        .from('form_responses')
        .select('id, form_id, percentual_acerto, correct_answers, total_questions, student_email')
        .in('id', chunk)

      if (error) throw error

      for (const row of data || []) {
        const current = byId.get(row.id)
        if (!current) continue
        byId.set(row.id, {
          ...current,
          form_id: row.form_id,
          student_email: current.student_email || row.student_email,
          percentual_acerto: row.percentual_acerto,
          correct_answers: row.correct_answers,
          total_questions: row.total_questions,
        })
      }
      return []
    },
  )

  return [...byId.values()]
}

export function buildTrailDistributionSync(
  responses: TrailDistributionResponse[],
  formTrailsByFormId: Record<string, FormTrailMatch[]>,
  answers: RawAnswerRow[] = [],
): TrailDistributionRow[] {
  if (responses.length === 0) return []

  const byTrail = new Map<string, TrailBucket>()
  let withoutTrailEmails = new Set<string>()
  let withoutTrailResponses = 0

  for (const response of responses) {
    if (!response.form_id || response.percentual_acerto == null) {
      withoutTrailEmails.add(response.student_email)
      withoutTrailResponses++
      continue
    }

    const formTrails = formTrailsByFormId[response.form_id] ?? []
    const resolved = resolveTrailFromFormTrails(
      buildResponseTrailInput(response, answers),
      formTrails,
    )

    if (!resolved?.diagnosis) {
      withoutTrailEmails.add(response.student_email)
      withoutTrailResponses++
      continue
    }

    const tier = resolved.trailTier ?? resolved.diagnosis.trailTier
    const key = `tier-${tier}`
    const title = TRAIL_TIER_LABELS[tier]
    const percentRange = tierPercentRange(tier)

    const entry = byTrail.get(key) || {
      title,
      percentRange,
      emails: new Set<string>(),
      responses: 0,
    }

    entry.emails.add(response.student_email)
    entry.responses++
    byTrail.set(key, entry)
  }

  const rows: TrailDistributionRow[] = [...byTrail.entries()]
    .map(([key, value]) => ({
      key,
      title: value.title,
      percentRange: value.percentRange,
      studentCount: value.emails.size,
      responseCount: value.responses,
    }))
    .sort((a, b) => {
      const tierA = a.key.startsWith('tier-') ? Number(a.key.slice(5)) : 99
      const tierB = b.key.startsWith('tier-') ? Number(b.key.slice(5)) : 99
      return tierA - tierB
    })

  if (withoutTrailResponses > 0) {
    rows.push({
      key: 'sem-trilha',
      title: 'Sem trilha atribuída',
      percentRange: '—',
      studentCount: withoutTrailEmails.size,
      responseCount: withoutTrailResponses,
    })
  }

  return rows
}

export async function loadTrailDistribution(
  responses: TrailDistributionResponse[],
  options?: {
    answers?: RawAnswerRow[]
    formTrailsByFormId?: Record<string, FormTrailMatch[]>
  },
): Promise<TrailDistributionRow[]> {
  if (responses.length === 0) return []

  const enriched = await enrichResponses(responses)
  const formIds = [...new Set(enriched.map((r) => r.form_id).filter(Boolean))] as string[]

  const [formTrailsByFormId, answers] = await Promise.all([
    options?.formTrailsByFormId ?? loadFormTrailsByFormIds(formIds),
    options?.answers ?? fetchAnswersByResponseIds(enriched.map((r) => r.id)),
  ])

  return buildTrailDistributionSync(enriched, formTrailsByFormId, answers)
}
