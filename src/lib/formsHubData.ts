import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'
import type { Form, FormLink } from '@/types/database'
import type { FormWithLinks } from '@/lib/formsHubOrganize'

export async function loadFormsHubData(
  userId: string,
  profile: Profile,
  canManageForms: boolean,
): Promise<FormWithLinks[]> {
  let formsQuery = supabase.from('forms').select('*').order('created_at', { ascending: false })
  if (!canManageForms) {
    formsQuery = formsQuery.eq('is_active', true)
  }

  let linksQuery = supabase
    .from('form_links')
    .select('*, professor:profiles(full_name)')
    .order('created_at', { ascending: false })

  if (profile.role === 'professor') {
    linksQuery = linksQuery.eq('professor_id', userId)
  }

  const [{ data: formsData, error: formsError }, { data: linksData }] = await Promise.all([
    formsQuery,
    linksQuery,
  ])

  if (formsError) throw formsError

  const formIds = (formsData || []).map((f) => f.id)
  let fqData: { form_id: string }[] = []
  if (formIds.length > 0) {
    const { data: fq } = await supabase.from('form_questions').select('form_id').in('form_id', formIds)
    fqData = fq || []
  }

  const countByForm = new Map<string, number>()
  for (const row of fqData) {
    countByForm.set(row.form_id, (countByForm.get(row.form_id) || 0) + 1)
  }

  const linksByForm = new Map<string, (FormLink & { professor_name?: string })[]>()
  for (const link of linksData || []) {
    const prof = link.professor as { full_name: string } | null
    const list = linksByForm.get(link.form_id) || []
    list.push({ ...link, professor_name: prof?.full_name })
    linksByForm.set(link.form_id, list)
  }

  return (formsData || []).map((f) => ({
    ...(f as Form),
    links: linksByForm.get(f.id) || [],
    question_count: countByForm.get(f.id) || 0,
  }))
}
