import { supabase } from '@/lib/supabase'
import { flattenNestedAnswers } from '@/lib/responseAnswers'
import type { RawAnswerRow, ResponseWithForm } from '@/lib/reportAnalytics'
import type { Profile } from '@/types/database'

const RESPONSES_SELECT = `
  *,
  form:forms(id, title, turma),
  response_answers(is_correct, question:questions(habilidade_bncc, descritor_saeb, nivel_bloom))
`

async function getProfessorLinkIds(professorId: string): Promise<string[]> {
  const { data: links } = await supabase
    .from('form_links')
    .select('id')
    .eq('professor_id', professorId)

  return links?.map((l) => l.id) || []
}

export interface ReportDataSnapshot {
  responses: ResponseWithForm[]
  answers: RawAnswerRow[]
}

let cachedSnapshot: ReportDataSnapshot | null = null
let cacheKey: string | null = null

export function getReportDataCache(userId: string, role: Profile['role']): ReportDataSnapshot | null {
  const key = `${userId}:${role}`
  return cacheKey === key ? cachedSnapshot : null
}

export function setReportDataCache(
  userId: string,
  role: Profile['role'],
  snapshot: ReportDataSnapshot,
) {
  cacheKey = `${userId}:${role}`
  cachedSnapshot = snapshot
}

export function clearReportDataCache() {
  cachedSnapshot = null
  cacheKey = null
}

export async function loadReportData(
  userId: string,
  role: Profile['role'],
): Promise<ReportDataSnapshot> {
  let query = supabase
    .from('form_responses')
    .select(RESPONSES_SELECT)
    .order('completed_at', { ascending: false })

  if (role === 'professor') {
    const linkIds = await getProfessorLinkIds(userId)
    if (linkIds.length === 0) {
      return { responses: [], answers: [] }
    }
    query = query.in('form_link_id', linkIds)
  }

  const { data: respData, error: respError } = await query
  if (respError) throw respError

  const rawList = (respData || []) as ResponseWithForm[]
  return {
    responses: rawList,
    answers: flattenNestedAnswers(rawList),
  }
}
