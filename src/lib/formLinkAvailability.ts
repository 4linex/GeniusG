import { formatDate } from '@/lib/utils'

export type FormLinkAvailability = 'available' | 'not_yet' | 'expired'

export interface FormLinkSchedule {
  available_from?: string | null
  available_until?: string | null
}

export function getFormLinkAvailability(
  schedule: FormLinkSchedule,
  now: Date = new Date(),
): FormLinkAvailability {
  const t = now.getTime()
  if (schedule.available_from) {
    const from = new Date(schedule.available_from).getTime()
    if (!Number.isNaN(from) && t < from) return 'not_yet'
  }
  if (schedule.available_until) {
    const until = new Date(schedule.available_until).getTime()
    if (!Number.isNaN(until) && t > until) return 'expired'
  }
  return 'available'
}

export function getFormLinkAvailabilityMessage(
  schedule: FormLinkSchedule,
  status?: FormLinkAvailability,
): string | null {
  const resolved = status ?? getFormLinkAvailability(schedule)
  if (resolved === 'not_yet' && schedule.available_from) {
    return `Este formulário estará disponível a partir de ${formatDate(schedule.available_from)}.`
  }
  if (resolved === 'expired' && schedule.available_until) {
    return `O prazo para responder encerrou em ${formatDate(schedule.available_until)}.`
  }
  return null
}

export function localDatetimeToIso(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function formatFormLinkSchedule(schedule: FormLinkSchedule): string | null {
  const { available_from, available_until } = schedule
  if (!available_from && !available_until) return null
  if (available_from && available_until) {
    return `${formatDate(available_from)} — ${formatDate(available_until)}`
  }
  if (available_from) return `A partir de ${formatDate(available_from)}`
  return `Até ${formatDate(available_until!)}`
}
