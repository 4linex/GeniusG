import { supabase } from '@/lib/supabase'
import { collectSchoolFilterOptions, formatSchoolMunicipio, listSchools } from '@/lib/schools'
import { listAllSchoolClasses } from '@/lib/schoolClasses'
import {
  getProfileMunicipios,
  getProfileSchoolNames,
  profileLocationCacheKey,
  rowMatchesProfileLocation,
  schoolMatchesProfile,
  type ProfileLocationFields,
} from '@/lib/profileLocations'
import type { Profile, School, SchoolClass } from '@/types/database'

export interface DashboardContextFilters {
  municipio?: string
  school_name?: string
  turma?: string
  dateFrom?: string
  dateTo?: string
}

export const EMPTY_DASHBOARD_CONTEXT_FILTERS: DashboardContextFilters = {}

export interface DashboardFilterOptions {
  municipios: string[]
  escolas: string[]
  turmas: string[]
  schools: School[]
  schoolClasses: SchoolClass[]
}

/**
 * Turmas disponíveis dado o recorte de município/escola, usando as entidades
 * (school_classes). Quando uma escola é selecionada, mostra apenas as turmas dela;
 * com apenas o município, mostra as turmas de todas as escolas daquele município.
 * Sem recorte, retorna a lista completa (entidades + valores legados das respostas).
 */
export function getTurmasForScope(
  options: Pick<DashboardFilterOptions, 'schools' | 'schoolClasses' | 'turmas'>,
  municipio?: string,
  schoolName?: string,
): string[] {
  const m = norm(municipio)
  const s = norm(schoolName)
  if (!m && !s) return options.turmas

  const matchingSchoolIds = new Set(
    options.schools
      .filter((school) => {
        if (m && formatSchoolMunicipio(school) !== m) return false
        if (s && school.name !== s) return false
        return true
      })
      .map((school) => school.id),
  )

  const turmas = new Set<string>()
  for (const cls of options.schoolClasses) {
    if (matchingSchoolIds.has(cls.school_id)) turmas.add(cls.name)
  }

  // Se não há entidades para o recorte, cai para a lista geral (valores legados).
  if (turmas.size === 0) return options.turmas

  return [...turmas].sort((a, b) => a.localeCompare(b, 'pt-BR'))
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
  profile: ProfileLocationFields | null | undefined,
): DashboardContextFilters {
  const filters: DashboardContextFilters = {}
  const municipios = getProfileMunicipios(profile)
  const schools = getProfileSchoolNames(profile)
  if (municipios.length === 1) filters.municipio = municipios[0]
  if (schools.length === 1) filters.school_name = schools[0]
  return filters
}

/** Professor e admin: restringe a município/escola do cadastro quando informados. */
export function applyProfessorProfileScope<T extends ContextRow>(
  rows: T[],
  profile: ProfileLocationFields | null | undefined,
): T[] {
  if (!profile) return rows
  const municipios = getProfileMunicipios(profile)
  const schools = getProfileSchoolNames(profile)
  if (municipios.length === 0 && schools.length === 0) return rows
  return rows.filter((row) => rowMatchesProfileLocation(row, profile))
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
  profile?: ProfileLocationFields | null,
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
  profile?: Pick<Profile, 'role' | 'turmas'> & ProfileLocationFields | null,
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
  const scopedClasses: SchoolClass[] = []

  const profileFilters =
    profile?.role === 'admin' || profile?.role === 'professor'
      ? profileLocationFilters(profile)
      : null
  const profileTurmas =
    profile?.role === 'professor' && profile.turmas?.length ? profile.turmas : null

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
    scopedClasses.push(row)
  }

  for (const row of responses || []) {
    if (profileFilters) {
      const scoped = applyProfileLocationScope([row], profile)
      if (scoped.length === 0) continue
    }
    if (profileTurmas) {
      const scoped = applyProfileTurmaScope([row], profileTurmas)
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
    schoolClasses: scopedClasses,
  }
}

export function dashboardScopeCacheKey(
  userId: string,
  role: Profile['role'],
  filters: DashboardContextFilters,
  profile?: ProfileLocationFields | null,
): string {
  const f = JSON.stringify({
    municipio: filters.municipio || '',
    school_name: filters.school_name || '',
    turma: filters.turma || '',
    dateFrom: filters.dateFrom || '',
    dateTo: filters.dateTo || '',
  })
  const p = profile ? profileLocationCacheKey(profile) : ''
  return `${userId}:${role}:${f}:${p}`
}

export function hasDashboardContextFilters(filters: DashboardContextFilters): boolean {
  return Boolean(filters.municipio || filters.school_name || filters.turma || filters.dateFrom || filters.dateTo)
}

export function applyDashboardDateFilters<T extends { completed_at: string }>(
  rows: T[],
  filters: Pick<DashboardContextFilters, 'dateFrom' | 'dateTo'>,
): T[] {
  const { dateFrom, dateTo } = filters
  if (!dateFrom && !dateTo) return rows

  return rows.filter((row) => {
    const completed = new Date(row.completed_at)
    if (dateFrom && completed < new Date(`${dateFrom}T00:00:00`)) return false
    if (dateTo && completed > new Date(`${dateTo}T23:59:59`)) return false
    return true
  })
}
