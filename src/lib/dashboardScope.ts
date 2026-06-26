import { supabase } from '@/lib/supabase'
import { collectSchoolFilterOptions, formatSchoolMunicipio, listSchools } from '@/lib/schools'
import { listAllSchoolClasses } from '@/lib/schoolClasses'
import type { Profile, School } from '@/types/database'

export interface DashboardContextFilters {
  municipio?: string
  school_name?: string
  turma?: string
}

export const EMPTY_DASHBOARD_CONTEXT_FILTERS: DashboardContextFilters = {}

export interface DashboardFilterOptions {
  municipios: string[]
  escolas: string[]
  turmas: string[]
  schools: School[]
}

type ContextRow = {
  municipio?: string | null
  school_name?: string | null
  turma?: string | null
}

function norm(value: string | null | undefined): string {
  return value?.trim() || ''
}

export function isRootRole(role: Profile['role'] | undefined): boolean {
  return role === 'root'
}

/** Root ou admin (acesso a telas administrativas). */
export function isAdminRole(role: Profile['role'] | undefined): boolean {
  return role === 'root' || role === 'admin'
}

export function isScopedAdminRole(role: Profile['role'] | undefined): boolean {
  return role === 'admin'
}

export function profileLocationFilters(
  profile: Pick<Profile, 'municipio' | 'school_name'> | null | undefined,
): DashboardContextFilters {
  const filters: DashboardContextFilters = {}
  const municipio = norm(profile?.municipio)
  const school = norm(profile?.school_name)
  if (municipio) filters.municipio = municipio
  if (school) filters.school_name = school
  return filters
}

/** Professor e admin: restringe a município/escola do cadastro quando informados. */
export function applyProfessorProfileScope<T extends ContextRow>(
  rows: T[],
  profile: Pick<Profile, 'municipio' | 'school_name'> | null | undefined,
): T[] {
  if (!profile) return rows

  const profileMunicipio = norm(profile.municipio)
  const profileSchool = norm(profile.school_name)

  if (!profileMunicipio && !profileSchool) return rows

  return rows.filter((row) => {
    const rowMunicipio = norm(row.municipio)
    const rowSchool = norm(row.school_name)

    if (profileMunicipio) {
      if (rowMunicipio && rowMunicipio !== profileMunicipio) return false
    }
    if (profileSchool) {
      if (rowSchool && rowSchool !== profileSchool) return false
    }
    return true
  })
}

/** Professor: restringe às turmas do cadastro quando informadas. */
export function applyProfileTurmaScope<T extends { turma?: string | null }>(
  rows: T[],
  turmas: string[] | null | undefined,
): T[] {
  if (!turmas?.length) return rows

  const allowed = new Set(turmas.map((t) => norm(t)).filter(Boolean))
  if (allowed.size === 0) return rows

  return rows.filter((row) => {
    const t = norm(row.turma)
    return t && allowed.has(t)
  })
}

/** Alias semântico — mesma regra de escopo por localização no perfil. */
export const applyProfileLocationScope = applyProfessorProfileScope

function schoolMatchesProfile(
  school: School,
  profile: Pick<Profile, 'municipio' | 'school_name'> | null | undefined,
): boolean {
  const profileMunicipio = norm(profile?.municipio)
  const profileSchool = norm(profile?.school_name)
  const schoolMunicipio = `${school.municipio} - ${school.state_uf}`

  if (profileMunicipio && schoolMunicipio !== profileMunicipio) return false
  if (profileSchool && school.name !== profileSchool) return false
  return true
}

/** Admin: filtros opcionais de município, escola e turma (root). */
export function applyDashboardContextFilters<T extends ContextRow>(
  rows: T[],
  filters: DashboardContextFilters,
): T[] {
  const municipio = norm(filters.municipio)
  const school = norm(filters.school_name)
  const turma = norm(filters.turma)

  if (!municipio && !school && !turma) return rows

  return rows.filter((row) => {
    if (municipio && norm(row.municipio) !== municipio) return false
    if (school && norm(row.school_name) !== school) return false
    if (turma && norm(row.turma) !== turma) return false
    return true
  })
}

export async function getProfessorLinkIds(
  professorId: string,
  profile?: Pick<Profile, 'municipio' | 'school_name' | 'turmas'> | null,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('form_links')
    .select('id, municipio, school_name, turma')
    .eq('professor_id', professorId)

  if (error) throw error

  let scoped = applyProfessorProfileScope(data || [], profile)
  scoped = applyProfileTurmaScope(scoped, profile?.turmas)
  return scoped.map((l) => l.id)
}

export async function loadDashboardFilterOptions(
  profile?: Pick<Profile, 'role' | 'municipio' | 'school_name'> | null,
): Promise<DashboardFilterOptions> {
  const [{ data: responses }, allSchools, allClasses] = await Promise.all([
    supabase.from('form_responses').select('municipio, school_name, turma'),
    listSchools().catch(() => [] as School[]),
    listAllSchoolClasses().catch(() => []),
  ])

  const schools =
    profile?.role === 'admin'
      ? allSchools.filter((school) => schoolMatchesProfile(school, profile))
      : allSchools

  const schoolIds = new Set(schools.map((school) => school.id))

  const schoolOptions = collectSchoolFilterOptions(schools)
  const municipios = new Set(schoolOptions.municipios)
  const escolas = new Set(schoolOptions.escolas)
  const turmas = new Set<string>()

  const profileFilters = profile?.role === 'admin' ? profileLocationFilters(profile) : null

  for (const row of allClasses) {
    if (!schoolIds.has(row.school_id)) continue
    if (profileFilters) {
      const school = schools.find((s) => s.id === row.school_id)
      if (
        school &&
        applyProfileLocationScope(
          [{ municipio: formatSchoolMunicipio(school), school_name: school.name }],
          profile,
        ).length === 0
      ) {
        continue
      }
    }
    turmas.add(row.name)
  }

  for (const row of responses || []) {
    if (profileFilters) {
      const scoped = applyProfileLocationScope([row], profile)
      if (scoped.length === 0) continue
    }
    const m = norm(row.municipio)
    const s = norm(row.school_name)
    const t = norm(row.turma)
    if (m) municipios.add(m)
    if (s) escolas.add(s)
    if (t) turmas.add(t)
  }

  return {
    municipios: [...municipios].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    escolas: [...escolas].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    turmas: [...turmas].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    schools,
  }
}

export function dashboardScopeCacheKey(
  userId: string,
  role: Profile['role'],
  filters: DashboardContextFilters,
  profile?: Pick<Profile, 'municipio' | 'school_name' | 'turmas'> | null,
): string {
  const f = JSON.stringify({
    municipio: filters.municipio || '',
    school_name: filters.school_name || '',
    turma: filters.turma || '',
  })
  const p = profile
    ? `${norm(profile.municipio)}|${norm(profile.school_name)}|${(profile.turmas || []).join(',')}`
    : ''
  return `${userId}:${role}:${f}:${p}`
}

export function hasDashboardContextFilters(filters: DashboardContextFilters): boolean {
  return Boolean(filters.municipio || filters.school_name || filters.turma)
}
