import { supabase } from '@/lib/supabase'
import { fetchAllInBatches } from '@/lib/supabaseBatch'
import { EMPTY_SKILL_LABELS, type RawAnswerRow } from '@/lib/reportAnalytics'

export interface NestedResponseAnswer {
  is_correct: boolean | null
  question: {
    habilidade_bncc: string | null
    descritor_saeb: string | null
    nivel_bloom: string | null
    point_value?: number | null
    nivel_dificuldade?: string | null
  } | null
}

function skillLabel(value: string | null | undefined, empty: string): string {
  const trimmed = value?.trim()
  return trimmed || empty
}

export function parseNestedAnswer(
  responseId: string,
  answer: NestedResponseAnswer,
): RawAnswerRow {
  const q = answer.question
  return {
    response_id: responseId,
    is_correct: Boolean(answer.is_correct),
    habilidade_bncc: skillLabel(q?.habilidade_bncc, EMPTY_SKILL_LABELS.bncc),
    descritor_saeb: skillLabel(q?.descritor_saeb, EMPTY_SKILL_LABELS.saeb),
    bloom: skillLabel(q?.nivel_bloom, EMPTY_SKILL_LABELS.bloom),
    point_value: Number(q?.point_value ?? 1),
    nivel_dificuldade: q?.nivel_dificuldade ?? null,
  }
}

export function flattenNestedAnswers(
  responses: Array<{ id: string; response_answers?: NestedResponseAnswer[] | null }>,
): RawAnswerRow[] {
  const rows: RawAnswerRow[] = []
  for (const response of responses) {
    for (const answer of response.response_answers || []) {
      rows.push(parseNestedAnswer(response.id, answer))
    }
  }
  return rows
}

const ANSWER_SELECT =
  'is_correct, question:questions(habilidade_bncc, descritor_saeb, nivel_bloom, point_value, nivel_dificuldade)'

export async function fetchAnswersByResponseIds(responseIds: string[]): Promise<RawAnswerRow[]> {
  if (responseIds.length === 0) return []

  const chunks = await fetchAllInBatches(responseIds, async (chunk) => {
    const { data, error } = await supabase
      .from('response_answers')
      .select(`response_id, ${ANSWER_SELECT}`)
      .in('response_id', chunk)

    if (error) throw error

    return (data || []).map((row) => {
      const q = row.question as unknown as NestedResponseAnswer['question']
      return {
        response_id: row.response_id,
        is_correct: Boolean(row.is_correct),
        habilidade_bncc: skillLabel(q?.habilidade_bncc, EMPTY_SKILL_LABELS.bncc),
        descritor_saeb: skillLabel(q?.descritor_saeb, EMPTY_SKILL_LABELS.saeb),
        bloom: skillLabel(q?.nivel_bloom, EMPTY_SKILL_LABELS.bloom),
        point_value: Number(q?.point_value ?? 1),
        nivel_dificuldade: q?.nivel_dificuldade ?? null,
      }
    })
  })

  return chunks
}
