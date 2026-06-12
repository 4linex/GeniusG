import { supabase } from '@/lib/supabase'
import { dedupeAlternativesByLetter, type QuestionAlternativeRow } from '@/lib/questionAlternatives'

/** Sincroniza alternativas sem apagar registros referenciados por respostas (evita erro FK). */
export async function syncQuestionAlternatives(
  questionId: string,
  alternatives: QuestionAlternativeRow[],
): Promise<void> {
  const unique = dedupeAlternativesByLetter(alternatives)

  const { data: existing, error: fetchError } = await supabase
    .from('question_alternatives')
    .select('id, letter, order_index')
    .eq('question_id', questionId)
    .order('order_index')

  if (fetchError) throw fetchError

  const existingByLetter = new Map<string, string>()
  for (const row of existing || []) {
    const key = row.letter.trim().toUpperCase()
    if (!existingByLetter.has(key)) {
      existingByLetter.set(key, row.id)
    }
  }

  const keepIds = new Set<string>()

  for (let i = 0; i < unique.length; i++) {
    const alt = unique[i]
    const letter = alt.letter.trim().toUpperCase()
    const payload = {
      letter,
      text: alt.text,
      is_correct: alt.is_correct ?? false,
      image_url: alt.image_url || null,
      order_index: i,
    }

    const existingId = existingByLetter.get(letter)
    if (existingId) {
      const { error } = await supabase
        .from('question_alternatives')
        .update(payload)
        .eq('id', existingId)
      if (error) throw error
      keepIds.add(existingId)
    } else {
      const { data, error } = await supabase
        .from('question_alternatives')
        .insert({ ...payload, question_id: questionId })
        .select('id')
        .single()
      if (error) throw error
      keepIds.add(data.id)
    }
  }

  for (const row of existing || []) {
    if (keepIds.has(row.id)) continue
    const { error } = await supabase.from('question_alternatives').delete().eq('id', row.id)
    if (error?.code === '23503') continue
    if (error) throw error
  }
}

export function getErrorMessage(err: unknown, fallback = 'Erro desconhecido'): string {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}
