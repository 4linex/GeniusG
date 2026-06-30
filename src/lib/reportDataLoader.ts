import { supabase } from '@/lib/supabase'
import { flattenNestedAnswers } from '@/lib/responseAnswers'
import {
  applyProfessorProfileScope,
  applyProfileLocationScope,
  getProfessorLinkIds,
  isScopedAdminRole,
} from '@/lib/dashboardScope'
import {
  getProfileMunicipios,
  getProfileSchoolNames,
  profileLocationCacheKey,
  type ProfileLocationFields,
} from '@/lib/profileLocations'
import type { RawAnswerRow, ResponseWithForm } from '@/lib/reportAnalytics'
import type { Profile } from '@/types/database'

const RESPONSES_SELECT = `
  *,
  form:forms(id, title, turma),
  response_answers(is_correct, question:questions(habilidade_bncc, descritor_saeb, nivel_bloom, point_value, nivel_dificuldade))
`

export interface ReportDataSnapshot {
  responses: ResponseWithForm[]
  answers: RawAnswerRow[]
}

let cachedSnapshot: ReportDataSnapshot | null = null
let cacheKey: string | null = null

const REPORT_DATA_CACHE_VERSION = 6

function reportCacheKey(
  userId: string,
  role: Profile['role'],
  profile?: ProfileLocationFields | null,
): string {
  const scope = profile ? profileLocationCacheKey(profile) : ''
  return `${userId}:${role}:v${REPORT_DATA_CACHE_VERSION}:${scope}`
}

export function getReportDataCache(
  userId: string,
  role: Profile['role'],
  profile?: ProfileLocationFields | null,
): ReportDataSnapshot | null {
  const key = reportCacheKey(userId, role, profile)
  return cacheKey === key ? cachedSnapshot : null
}

export function setReportDataCache(
  userId: string,
  role: Profile['role'],
  snapshot: ReportDataSnapshot,
  profile?: ProfileLocationFields | null,
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
  profile?: ProfileLocationFields | null,
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
    const municipios = getProfileMunicipios(profile)
    const schoolNames = getProfileSchoolNames(profile)
    if (municipios.length === 1) query = query.eq('municipio', municipios[0])
    else if (municipios.length > 1) query = query.in('municipio', municipios)
    if (schoolNames.length === 1) query = query.eq('school_name', schoolNames[0])
    else if (schoolNames.length > 1) query = query.in('school_name', schoolNames)
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
