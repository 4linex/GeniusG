import { supabase } from '@/lib/supabase'
import type { School } from '@/types/database'

export function formatSchoolMunicipio(school: Pick<School, 'municipio' | 'state_uf'>): string {
  return `${school.municipio} - ${school.state_uf}`
}

export function formatSchoolLabel(school: School): string {
  return `${school.name} (${formatSchoolMunicipio(school)})`
}

export function schoolToProfileFields(school: School) {
  return {
    municipio: formatSchoolMunicipio(school),
    school_name: school.name,
    school_id: school.id,
  }
}

export async function listSchools(): Promise<School[]> {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .order('municipio')
    .order('name')

  if (error) throw error
  return (data || []) as School[]
}

export async function createSchool(payload: {
  name: string
  municipio: string
  state_uf: string
}): Promise<School> {
  const name = payload.name.trim()
  const municipio = payload.municipio.trim()
  const state_uf = payload.state_uf.trim().toUpperCase()

  const { data, error } = await supabase
    .from('schools')
    .insert({ name, municipio, state_uf })
    .select('*')
    .single()

  if (error) throw error
  return data as School
}

export async function updateSchool(
  id: string,
  payload: { name: string; municipio: string; state_uf: string },
): Promise<School> {
  const { data, error } = await supabase
    .from('schools')
    .update({
      name: payload.name.trim(),
      municipio: payload.municipio.trim(),
      state_uf: payload.state_uf.trim().toUpperCase(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as School
}

export async function deleteSchool(id: string): Promise<void> {
  const { error } = await supabase.from('schools').delete().eq('id', id)
  if (error) throw error
}

export async function getSchoolById(id: string): Promise<School | null> {
  const { data, error } = await supabase.from('schools').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as School | null
}

export function collectSchoolFilterOptions(schools: School[]) {
  const municipios = new Set<string>()
  const escolas = new Set<string>()

  for (const school of schools) {
    municipios.add(formatSchoolMunicipio(school))
    escolas.add(school.name)
  }

  const sort = (values: Set<string>) =>
    [...values].sort((a, b) => a.localeCompare(b, 'pt-BR'))

  return {
    municipios: sort(municipios),
    escolas: sort(escolas),
  }
}

export function getEscolasForMunicipio(schools: School[], municipio?: string): string[] {
  const list = municipio
    ? schools.filter((school) => formatSchoolMunicipio(school) === municipio)
    : schools
  return [...new Set(list.map((school) => school.name))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  )
}

export function findSchoolByName(
  schools: School[],
  schoolName?: string | null,
): School | undefined {
  const name = schoolName?.trim()
  if (!name) return undefined
  const matches = schools.filter((school) => school.name === name)
  return matches.length === 1 ? matches[0] : matches[0]
}

export function findSchoolByProfileFields(
  schools: School[],
  municipio?: string | null,
  schoolName?: string | null,
): School | undefined {
  const m = municipio?.trim()
  const s = schoolName?.trim()
  if (!m || !s) return undefined
  return schools.find(
    (school) => school.name === s && formatSchoolMunicipio(school) === m,
  )
}
