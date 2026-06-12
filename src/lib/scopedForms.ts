import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

/** null = todos os formulários (root/admin); array vazio = nenhum acesso */
export async function resolveScopedFormIds(
  userId: string,
  role: Profile['role'],
): Promise<string[] | null> {
  if (role === 'root' || role === 'admin') return null

  const { data: links } = await supabase
    .from('form_links')
    .select('form_id')
    .eq('professor_id', userId)

  return [...new Set((links || []).map((l) => l.form_id))]
}

export function canAccessForm(formId: string, scopedFormIds: string[] | null): boolean {
  if (scopedFormIds === null) return true
  return scopedFormIds.includes(formId)
}
