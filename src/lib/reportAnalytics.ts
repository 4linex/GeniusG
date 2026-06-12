import type { FormResponse, NivelProficiencia } from '@/types/database'
import type { SkillBreakdownRow } from '@/lib/formAssessmentReport'
import { getPerformanceStatus } from '@/hooks/useScopedResponses'

export interface ReportFilters {
  formId?: string
  studentEmail?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

export type ResponseWithForm = FormResponse & {
  form?: { id?: string; title: string; turma?: string | null } | null
}

export interface RawAnswerRow {
  response_id: string
  is_correct: boolean
  habilidade: string
  bloom: string
}

const NIVEL_EMPTY: Record<NivelProficiencia, number> = {
  inicial: 0,
  intermediario: 0,
  avancado: 0,
}

export function applyReportFilters(
  responses: ResponseWithForm[],
  filters: ReportFilters,
): ResponseWithForm[] {
  const q = filters.search?.trim().toLowerCase()

  return responses.filter((r) => {
    if (filters.formId && r.form_id !== filters.formId) return false
    if (filters.studentEmail && r.student_email !== filters.studentEmail) return false

    if (filters.dateFrom && new Date(r.completed_at) < new Date(`${filters.dateFrom}T00:00:00`)) {
      return false
    }
    if (filters.dateTo && new Date(r.completed_at) > new Date(`${filters.dateTo}T23:59:59`)) {
      return false
    }

    if (q) {
      const haystack = `${r.student_name} ${r.student_email} ${r.form?.title ?? ''} ${r.form?.turma ?? ''}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }

    return true
  })
}

export function countByProficiency(responses: ResponseWithForm[]) {
  const byNivel = { ...NIVEL_EMPTY }
  for (const r of responses) {
    const n = r.nivel_proficiencia as NivelProficiencia | null | undefined
    if (n && n in byNivel) byNivel[n]++
  }
  return byNivel
}

export function countByPerformanceStatus(responses: ResponseWithForm[]) {
  const counts = { excelente: 0, bom: 0, regular: 0, atencao: 0 }
  for (const r of responses) {
    counts[getPerformanceStatus(r.percentual_acerto)]++
  }
  return counts
}

export function aggregateSkillsFromAnswers(
  answers: RawAnswerRow[],
  responseIds: Set<string>,
  mode: 'habilidade' | 'bloom',
): SkillBreakdownRow[] {
  const map = new Map<string, { total: number; correct: number }>()

  for (const a of answers) {
    if (!responseIds.has(a.response_id)) continue
    const key = mode === 'habilidade' ? a.habilidade : a.bloom
    const cur = map.get(key) || { total: 0, correct: 0 }
    cur.total++
    if (a.is_correct) cur.correct++
    map.set(key, cur)
  }

  return Array.from(map.entries())
    .map(([key, s]) => ({
      key,
      label: key,
      total: s.total,
      correct: s.correct,
      percentage: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    }))
    .sort((a, b) => a.percentage - b.percentage)
}

export function buildTctBuckets(responses: ResponseWithForm[]) {
  const buckets = [
    { label: '0–39%', min: 0, max: 39, count: 0 },
    { label: '40–59%', min: 40, max: 59, count: 0 },
    { label: '60–79%', min: 60, max: 79, count: 0 },
    { label: '80–100%', min: 80, max: 100, count: 0 },
  ]

  for (const r of responses) {
    const tct = r.percentual_acerto
    if (tct == null) continue
    const bucket = buckets.find((b) => tct >= b.min && tct <= b.max)
    if (bucket) bucket.count++
  }

  return buckets
}

export function uniqueForms(responses: ResponseWithForm[]) {
  const map = new Map<string, string>()
  for (const r of responses) {
    if (!map.has(r.form_id)) map.set(r.form_id, r.form?.title || 'Formulário')
  }
  return Array.from(map.entries())
    .map(([id, title]) => ({ id, title }))
    .sort((a, b) => a.title.localeCompare(b.title))
}

export function uniqueStudents(responses: ResponseWithForm[]) {
  const map = new Map<string, string>()
  for (const r of responses) {
    if (!map.has(r.student_email)) map.set(r.student_email, r.student_name)
  }
  return Array.from(map.entries())
    .map(([email, name]) => ({ email, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function avgTct(responses: ResponseWithForm[]) {
  const vals = responses.map((r) => r.percentual_acerto).filter((v): v is number => v != null)
  if (vals.length === 0) return null
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
}

export function hasActiveFilters(filters: ReportFilters) {
  return Boolean(
    filters.formId ||
      filters.studentEmail ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.search,
  )
}
