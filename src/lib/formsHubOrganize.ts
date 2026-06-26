import type { Form, FormLink } from '@/types/database'
import type { FormsHubFiltersState } from '@/components/forms/FormsHubFilters'

export interface FormWithLinks extends Form {
  links: (FormLink & { professor_name?: string })[]
  question_count?: number
}

function linkMatchesFilters(
  link: FormLink,
  filters: Pick<FormsHubFiltersState, 'turma' | 'escola' | 'local'>,
) {
  if (filters.turma && link.turma !== filters.turma) return false
  if (filters.escola && link.school_name !== filters.escola) return false
  if (filters.local && link.municipio !== filters.local) return false
  return true
}

export function applyFormsHubFilters(
  forms: FormWithLinks[],
  filters: FormsHubFiltersState,
): FormWithLinks[] {
  const hasLinkFilters = Boolean(filters.turma || filters.escola || filters.local)

  return forms
    .filter((form) => !filters.area || form.componente_curricular === filters.area)
    .map((form) => {
      if (!hasLinkFilters) return form
      const links = form.links.filter((link) => linkMatchesFilters(link, filters))
      if (links.length === 0) return null
      return { ...form, links }
    })
    .filter((form): form is FormWithLinks => form !== null)
}

export function collectFormsHubFilterOptions(forms: FormWithLinks[]) {
  const areas = new Set<string>()
  const turmas = new Set<string>()
  const escolas = new Set<string>()
  const locais = new Set<string>()

  for (const form of forms) {
    if (form.componente_curricular) areas.add(form.componente_curricular)
    if (form.school_name) escolas.add(form.school_name)
    for (const link of form.links) {
      if (link.turma) turmas.add(link.turma)
      if (link.school_name) escolas.add(link.school_name)
      if (link.municipio) locais.add(link.municipio)
    }
  }

  const sort = (values: Set<string>) =>
    [...values].sort((a, b) => a.localeCompare(b, 'pt-BR'))

  return {
    areas: sort(areas),
    turmas: sort(turmas),
    escolas: sort(escolas),
    locais: sort(locais),
  }
}

export interface FormsHubSection {
  key: string
  area: string
  serie: string
  forms: FormWithLinks[]
}

export function groupFormsHubSections(forms: FormWithLinks[]): FormsHubSection[] {
  const sectionMap = new Map<string, FormsHubSection>()

  const sorted = [...forms].sort((a, b) => {
    const areaCmp = (a.componente_curricular || '').localeCompare(b.componente_curricular || '', 'pt-BR')
    if (areaCmp !== 0) return areaCmp
    const serieCmp = (a.turma || '').localeCompare(b.turma || '', 'pt-BR')
    if (serieCmp !== 0) return serieCmp
    return a.title.localeCompare(b.title, 'pt-BR')
  })

  for (const form of sorted) {
    const area = form.componente_curricular || 'Sem área'
    const serie = form.turma || 'Sem série'
    const key = `${area}|||${serie}`
    const existing = sectionMap.get(key)
    if (existing) {
      existing.forms.push(form)
    } else {
      sectionMap.set(key, { key, area, serie, forms: [form] })
    }
  }

  return [...sectionMap.values()]
}

export function paginateFormsHubSections(
  sections: FormsHubSection[],
  page: number,
  pageSize: number,
) {
  const flat = sections.flatMap((section) =>
    section.forms.map((form) => ({ sectionKey: section.key, form })),
  )
  const total = flat.length
  const start = (page - 1) * pageSize
  const slice = flat.slice(start, start + pageSize)

  const pageSections = new Map<string, FormsHubSection>()
  for (const { sectionKey, form } of slice) {
    const source = sections.find((s) => s.key === sectionKey)!
    const current = pageSections.get(sectionKey)
    if (current) {
      current.forms.push(form)
    } else {
      pageSections.set(sectionKey, {
        key: source.key,
        area: source.area,
        serie: source.serie,
        forms: [form],
      })
    }
  }

  return {
    sections: [...pageSections.values()],
    total,
  }
}
