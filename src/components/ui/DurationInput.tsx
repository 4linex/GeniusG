import { useEffect, useState } from 'react'
import { durationToSeconds, secondsToDuration } from '@/lib/duration'
import { cn } from '@/lib/utils'

interface DurationInputProps {
  label?: string
  value: number | null | undefined
  onChange: (seconds: number | null) => void
  className?: string
}

export function DurationInput({ label, value, onChange, className }: DurationInputProps) {
  const [text, setText] = useState(() => (value != null ? secondsToDuration(value) : ''))

  useEffect(() => {
    setText(value != null ? secondsToDuration(value) : '')
  }, [value])

  const commit = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) {
      onChange(null)
      setText('')
      return
    }

    const seconds = durationToSeconds(trimmed)
    if (seconds == null) return

    onChange(seconds)
    setText(secondsToDuration(seconds))
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      )}
      <input
        type="text"
        inputMode="numeric"
        placeholder="00:00:00"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => commit(text)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit(text)
          }
        }}
        className={cn(
          'w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-2.5',
          'text-white placeholder:text-slate-500 font-mono text-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50',
        )}
      />
      <p className="text-xs text-slate-500 mt-1">Formato: horas:minutos:segundos</p>
    </div>
  )
}
