import { AREA_OPTIONS, FORM_STATUS_LABELS, type FormStatus } from '@/types/database'
import type { FormWithLinks } from '@/lib/formsHubOrganize'

export interface FormComponentAggregate {
  key: string
  label: string
  count: number
  avgQuestions: number
  activeCount: number
  dominantStatus: string | null
  lastUpdated: string | null
}

function dominantStatus(values: FormStatus[]): string | null {
  if (values.length === 0) return null
  const counts = new Map<string, number>()
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] as FormStatus | undefined
  return top ? FORM_STATUS_LABELS[top] : null
}

export function aggregateFormsByComponent(forms: FormWithLinks[]): FormComponentAggregate[] {
  const labels = AREA_OPTIONS.map((o) => o.value)
  const known = new Set(labels)

  for (const form of forms) {
    if (form.componente_curricular && !known.has(form.componente_curricular)) {
      labels.push(form.componente_curricular)
      known.add(form.componente_curricular)
    }
  }

  return labels.map((label) => {
    const items = forms.filter((f) => f.componente_curricular === label)
    const questionCounts = items.map((f) => f.question_count ?? 0)
    const statuses = items.map((f) => f.status || 'em_andamento')

    const lastUpdated =
      items.length > 0
        ? items.reduce(
            (latest, f) => (!latest || f.created_at > latest ? f.created_at : latest),
            items[0].created_at,
          )
        : null

    return {
      key: label,
      label,
      count: items.length,
      avgQuestions:
        questionCounts.length > 0
          ? Math.round(
              (questionCounts.reduce((s, n) => s + n, 0) / questionCounts.length) * 10,
            ) / 10
          : 0,
      activeCount: items.filter((f) => f.is_active).length,
      dominantStatus: dominantStatus(statuses),
      lastUpdated,
    }
  })
}

export function computeFormBankStats(forms: FormWithLinks[]) {
  const components = aggregateFormsByComponent(forms)
  const withForms = components.filter((c) => c.count > 0)
  const questionCounts = forms.map((f) => f.question_count ?? 0)

  return {
    totalForms: forms.length,
    componentCount: withForms.length,
    avgQuestions:
      questionCounts.length > 0
        ? Math.round(
            (questionCounts.reduce((s, n) => s + n, 0) / questionCounts.length) * 10,
          ) / 10
        : 0,
    activeForms: forms.filter((f) => f.is_active).length,
    components,
  }
}

export function formatAvgQuestionsLabel(value: number): string {
  if (value <= 0) return '—'
  return `${value.toString().replace('.', ',')} ${value === 1 ? 'questão' : 'questões'}`
}
