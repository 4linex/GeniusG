import type { FormStatus } from '@/types/database'
import type { FormWithLinks } from '@/lib/formsHubOrganize'
import type { ComponentFormsFiltersState } from '@/components/forms/ComponentFormsFilters'

export function applyComponentFormsFilters(
  forms: FormWithLinks[],
  filters: ComponentFormsFiltersState,
): FormWithLinks[] {
  return forms.filter((form) => {
    if (filters.turma && form.turma !== filters.turma) return false
    if (filters.status && (form.status || 'em_andamento') !== filters.status) return false
    if (filters.search.trim()) {
      const term = filters.search.trim().toLowerCase()
      const haystack = [form.title, form.description, form.school_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(term)) return false
    }
    return true
  })
}

export type { FormStatus }
