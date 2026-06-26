import { supabase } from '@/lib/supabase'
import { flattenNestedAnswers } from '@/lib/responseAnswers'
import {
  applyProfessorProfileScope,
  applyProfileLocationScope,
  getProfessorLinkIds,
  isScopedAdminRole,
  profileLocationFilters,
} from '@/lib/dashboardScope'
import type { RawAnswerRow, ResponseWithForm } from '@/lib/reportAnalytics'
import type { Profile } from '@/types/database'

const RESPONSES_SELECT = `
  *,
  form:forms(id, title, turma),
  response_answers(is_correct, question:questions(habilidade_bncc, descritor_saeb, nivel_bloom))
`

export interface ReportDataSnapshot {
  responses: ResponseWithForm[]
  answers: RawAnswerRow[]
}

let cachedSnapshot: ReportDataSnapshot | null = null
let cacheKey: string | null = null

const REPORT_DATA_CACHE_VERSION = 3

function reportCacheKey(
  userId: string,
  role: Profile['role'],
  profile?: Pick<Profile, 'municipio' | 'school_name'> | null,
): string {
  const scope = profile
    ? `${profile.municipio?.trim() || ''}|${profile.school_name?.trim() || ''}`
    : ''
  return `${userId}:${role}:v${REPORT_DATA_CACHE_VERSION}:${scope}`
}

export function getReportDataCache(
  userId: string,
  role: Profile['role'],
  profile?: Pick<Profile, 'municipio' | 'school_name'> | null,
): ReportDataSnapshot | null {
  const key = reportCacheKey(userId, role, profile)
  return cacheKey === key ? cachedSnapshot : null
}

export function setReportDataCache(
  userId: string,
  role: Profile['role'],
  snapshot: ReportDataSnapshot,
  profile?: Pick<Profile, 'municipio' | 'school_name'> | null,
) {
  cacheKey = reportCacheKey(userId, role, profile)
  cachedSnapshot = snapshot
}

export function clearReportDataCache() {
  cachedSnapshot = null
  cacheKey = null
}

export async function loadReportData(
  userId: string,
  role: Profile['role'],
  profile?: Pick<Profile, 'municipio' | 'school_name'> | null,
): Promise<ReportDataSnapshot> {
  let query = supabase
    .from('form_responses')
    .select(RESPONSES_SELECT)
    .order('completed_at', { ascending: false })

  if (role === 'professor') {
    const linkIds = await getProfessorLinkIds(userId, profile)
    if (linkIds.length === 0) {
      return { responses: [], answers: [] }
    }
    query = query.in('form_link_id', linkIds)
  } else if (isScopedAdminRole(role)) {
    const location = profileLocationFilters(profile)
    if (location.municipio) query = query.eq('municipio', location.municipio)
    if (location.school_name) query = query.eq('school_name', location.school_name)
  }

  const { data: respData, error: respError } = await query
  if (respError) throw respError

  let rawList = (respData || []) as ResponseWithForm[]

  if (role === 'professor') {
    rawList = applyProfessorProfileScope(rawList, profile)
  } else if (isScopedAdminRole(role)) {
    rawList = applyProfileLocationScope(rawList, profile)
  }

  return {
    responses: rawList,
    answers: flattenNestedAnswers(rawList),
  }
}
