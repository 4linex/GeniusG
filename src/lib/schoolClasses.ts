import { supabase } from '@/lib/supabase'
import type { SchoolClass } from '@/types/database'

function normName(value: string): string {
  return value.trim()
}

export function normalizeClassNames(names: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of names) {
    const name = normName(raw)
    if (!name || seen.has(name)) continue
    seen.add(name)
    result.push(name)
  }
  return result
}

export async function listSchoolClasses(schoolId?: string): Promise<SchoolClass[]> {
  let query = supabase.from('school_classes').select('*').order('name')
  if (schoolId) query = query.eq('school_id', schoolId)

  const { data, error } = await query
  if (error) throw error
  return (data || []) as SchoolClass[]
}

export async function listAllSchoolClasses(): Promise<SchoolClass[]> {
  const { data, error } = await supabase
    .from('school_classes')
    .select('*')
    .order('school_id')
    .order('name')

  if (error) throw error
  return (data || []) as SchoolClass[]
}

export function groupClassesBySchool(classes: SchoolClass[]): Map<string, SchoolClass[]> {
  const map = new Map<string, SchoolClass[]>()
  for (const item of classes) {
    const list = map.get(item.school_id) || []
    list.push(item)
    map.set(item.school_id, list)
  }
  return map
}

export async function syncSchoolClasses(schoolId: string, names: string[]): Promise<void> {
  const targetNames = normalizeClassNames(names)
  const existing = await listSchoolClasses(schoolId)

  const toDelete = existing.filter((row) => !targetNames.includes(row.name))
  const existingNames = new Set(existing.map((row) => row.name))
  const toInsert = targetNames.filter((name) => !existingNames.has(name))

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from('school_classes')
      .delete()
      .in(
        'id',
        toDelete.map((row) => row.id),
      )
    if (error) throw error
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('school_classes').insert(
      toInsert.map((name) => ({
        school_id: schoolId,
        name,
      })),
    )
    if (error) throw error
  }
}

export function getClassNamesForSchool(
  classesBySchool: Map<string, SchoolClass[]>,
  schoolId: string,
): string[] {
  return (classesBySchool.get(schoolId) || []).map((row) => row.name)
}
