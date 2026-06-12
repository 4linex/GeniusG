/** Converte segundos totais para HH:MM:SS */
export function secondsToDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Converte HH:MM:SS (ou MM:SS) para segundos */
export function durationToSeconds(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const parts = trimmed.split(':').map((p) => parseInt(p, 10))
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return null

  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 1) return parts[0]

  return null
}

export function formatDurationLabel(seconds: number | null | undefined): string {
  if (seconds == null) return '—'
  return secondsToDuration(seconds)
}
