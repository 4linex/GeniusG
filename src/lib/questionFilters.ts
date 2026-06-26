import type { Question } from '@/types/database'
import type { QuestionsFiltersState } from '@/components/questions/QuestionsFiltersBar'
import type { ComponentQuestionsFiltersState } from '@/components/questions/ComponentQuestionsFilters'

export function applyQuestionsFilters(
  questions: Question[],
  filters: QuestionsFiltersState,
): Question[] {
  return questions.filter((q) => {
    if (filters.ano && q.ano_serie !== filters.ano) return false
    if (filters.componente && q.componente_curricular !== filters.componente) return false
    if (filters.dificuldade && q.nivel_dificuldade !== filters.dificuldade) return false
    if (filters.search.trim()) {
      const term = filters.search.trim().toLowerCase()
      const haystack = [q.title, q.codigo_item, q.enunciado]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(term)) return false
    }
    return true
  })
}

export function applyComponentQuestionsFilters(
  questions: Question[],
  filters: ComponentQuestionsFiltersState,
): Question[] {
  return questions.filter((q) => {
    if (filters.ano && q.ano_serie !== filters.ano) return false
    if (filters.dificuldade && q.nivel_dificuldade !== filters.dificuldade) return false
    if (filters.search.trim()) {
      const term = filters.search.trim().toLowerCase()
      const haystack = [q.title, q.codigo_item, q.enunciado]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(term)) return false
    }
    return true
  })
}
