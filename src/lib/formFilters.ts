import type { FormStatus } from '@/types/database'
import type { FormWithLinks } from '@/lib/formsHubOrganize'
import type { ComponentFormsFiltersState } from '@/components/forms/ComponentFormsFilters'

function norm(value: string | null | undefined): string {
  return value?.trim() || ''
}

/** Um link do formulário corresponde ao recorte de município/escola/turma selecionado. */
function linkMatchesLocation(
  link: { municipio?: string | null; school_name?: string | null; turma?: string | null },
  filters: Pick<ComponentFormsFiltersState, 'municipio' | 'escola' | 'classe'>,
): boolean {
  if (filters.municipio && norm(link.municipio) !== filters.municipio) return false
  if (filters.escola && norm(link.school_name) !== filters.escola) return false
  if (filters.classe && norm(link.turma) !== filters.classe) return false
  return true
}

export function applyComponentFormsFilters(
  forms: FormWithLinks[],
  filters: ComponentFormsFiltersState,
): FormWithLinks[] {
  const hasLocationFilters = Boolean(filters.municipio || filters.escola || filters.classe)

  return forms
    .filter((form) => {
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
    .map((form) => {
      if (!hasLocationFilters) return form
      const links = form.links.filter((link) => linkMatchesLocation(link, filters))
      if (links.length === 0) return null
      return { ...form, links }
    })
    .filter((form): form is FormWithLinks => form !== null)
}

export interface ComponentFormsLocationOptions {
  municipios: string[]
  escolas: string[]
  classes: string[]
}

/**
 * Opções de Município/Escola/Turma extraídas dos links dos formulários,
 * em cascata: escolas filtram pelo município selecionado e turmas pela escola.
 */
export function collectComponentFormsOptions(
  forms: FormWithLinks[],
  filters: Pick<ComponentFormsFiltersState, 'municipio' | 'escola'>,
): ComponentFormsLocationOptions {
  const municipios = new Set<string>()
  const escolas = new Set<string>()
  const classes = new Set<string>()

  for (const form of forms) {
    for (const link of form.links) {
      const m = norm(link.municipio)
      const s = norm(link.school_name)
      const t = norm(link.turma)
      if (m) municipios.add(m)
      if (s && (!filters.municipio || m === filters.municipio)) escolas.add(s)
      if (
        t &&
        (!filters.municipio || m === filters.municipio) &&
        (!filters.escola || s === filters.escola)
      ) {
        classes.add(t)
      }
    }
  }

  const sort = (values: Set<string>) => [...values].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  return { municipios: sort(municipios), escolas: sort(escolas), classes: sort(classes) }
}

export type { FormStatus }
