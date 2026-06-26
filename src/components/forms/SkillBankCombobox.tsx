import { useId } from 'react'
import { cn } from '@/lib/utils'
import { formatSkillBankValue } from '@/lib/skillBank'
import type { SkillBankItem } from '@/types/database'

interface SkillBankComboboxProps {
  label: string
  value: string
  onChange: (value: string) => void
  items: SkillBankItem[]
  placeholder?: string
  required?: boolean
  hint?: string
  className?: string
}

export function SkillBankCombobox({
  label,
  value,
  onChange,
  items,
  placeholder,
  required,
  hint,
  className,
}: SkillBankComboboxProps) {
  const autoId = useId()
  const inputId = `skill-bank-${autoId}`
  const listId = `skill-bank-list-${autoId}`

  const suggestions = [...new Set(items.map((item) => formatSkillBankValue(item)))]

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-300">
        {label}
      </label>
      <input
        id={inputId}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={cn(
          'w-full rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-500',
          'px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors',
        )}
      />
      <datalist id={listId}>
        {suggestions.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
