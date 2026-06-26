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

export function getFormLinkAvailabilityError(
  schedule: FormLinkSchedule,
  status?: FormLinkAvailability,
): string | null {
  const resolved = status ?? getFormLinkAvailability(schedule)
  if (resolved === 'not_yet') {
    return 'Este formulário ainda não está disponível.'
  }
  if (resolved === 'expired') {
    return 'O prazo para responder este formulário encerrou.'
  }
  return null
}
