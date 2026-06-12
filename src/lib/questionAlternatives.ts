export interface QuestionAlternativeRow {
  letter: string
  text: string
  image_url?: string | null
  order_index: number
  question_id?: string
  id?: string
  is_correct?: boolean
}

/** Mantém uma alternativa por letra (menor order_index). Corrige dados duplicados no banco. */
export function dedupeAlternativesByLetter<T extends QuestionAlternativeRow>(alternatives: T[]): T[] {
  const byLetter = new Map<string, T>()

  for (const alt of alternatives) {
    const letter = alt.letter.trim().toUpperCase()
    const existing = byLetter.get(letter)
    if (!existing || alt.order_index < existing.order_index) {
      byLetter.set(letter, { ...alt, letter: alt.letter.trim().toUpperCase() })
    }
  }

  return Array.from(byLetter.values()).sort((a, b) => a.order_index - b.order_index)
}
