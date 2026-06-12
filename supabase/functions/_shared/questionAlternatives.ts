export interface AlternativeRow {
  letter: string
  text: string
  image_url?: string | null
  order_index: number
  question_id?: string
}

export function dedupeAlternativesByLetter<T extends AlternativeRow>(alternatives: T[]): T[] {
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
