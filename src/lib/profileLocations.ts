import type { Profile } from '@/types/database'
import { formatSchoolMunicipio } from '@/lib/schools'
import type { School } from '@/types/database'

export type ProfileLocationFields = Pick<
  Profile,
  | 'municipio'
  | 'school_name'
  | 'school_id'
  | 'municipios'
  | 'school_names'
  | 'school_ids'
  | 'turmas'
>

function norm(value: string | null | undefined): string {
  return value?.trim() || ''
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map(norm).filter(Boolean))]
}

export function getProfileMunicipios(
  profile: ProfileLocationFields | null | undefined,
): string[] {
  if (!profile) return []
  const fromArray = uniqueStrings(profile.municipios ?? [])
  if (fromArray.length > 0) return fromArray
  const single = norm(profile.municipio)
  return single ? [single] : []
}

export function getProfileSchoolNames(
  profile: ProfileLocationFields | null | undefined,
): string[] {
  if (!profile) return []
  const fromArray = uniqueStrings(profile.school_names ?? [])
  if (fromArray.length > 0) return fromArray
  const single = norm(profile.school_name)
  return single ? [single] : []
}

export function getProfileSchoolIds(
  profile: ProfileLocationFields | null | undefined,
): string[] {
  if (!profile) return []
  const fromArray = (profile.school_ids ?? []).filter(Boolean)
  if (fromArray.length > 0) return [...new Set(fromArray)]
  return profile.school_id ? [profile.school_id] : []
}

export function rowMatchesProfileLocation<
  T extends { municipio?: string | null; school_name?: string | null },
>(row: T, profile: ProfileLocationFields | null | undefined): boolean {
  const municipios = getProfileMunicipios(profile)
  const schools = getProfileSchoolNames(profile)
  if (municipios.length === 0 && schools.length === 0) return true

  const rowMunicipio = norm(row.municipio)
  const rowSchool = norm(row.school_name)

  if (municipios.length > 0 && rowMunicipio && !municipios.includes(rowMunicipio)) {
    return false
  }
  if (schools.length > 0 && rowSchool && !schools.includes(rowSchool)) {
    return false
  }
  return true
}

export function schoolMatchesProfile(
  school: School,
  profile: ProfileLocationFields | null | undefined,
): boolean {
  const municipios = getProfileMunicipios(profile)
  const schoolNames = getProfileSchoolNames(profile)
  const schoolIds = getProfileSchoolIds(profile)
  const schoolMunicipio = formatSchoolMunicipio(school)

  if (schoolIds.length > 0 && !schoolIds.includes(school.id)) return false
  if (municipios.length > 0 && !municipios.includes(schoolMunicipio)) return false
  if (schoolNames.length > 0 && !schoolNames.includes(school.name)) return false
  return true
}

export function profileLocationCacheKey(profile: ProfileLocationFields | null | undefined): string {
  if (!profile) return ''
  return [
    getProfileMunicipios(profile).join(','),
    getProfileSchoolNames(profile).join(','),
    getProfileSchoolIds(profile).join(','),
    (profile.turmas || []).join(','),
  ].join('|')
}
