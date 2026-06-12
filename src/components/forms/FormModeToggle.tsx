import { FORM_MODE_LABELS, type FormMode } from '@/types/database'
import { cn } from '@/lib/utils'
import { Gamepad2, LayoutList } from 'lucide-react'

interface FormModeToggleProps {
  value: FormMode
  onChange: (mode: FormMode) => void
  className?: string
}

export function FormModeToggle({ value, onChange, className }: FormModeToggleProps) {
  return (
    <div className={cn('flex rounded-xl border border-white/10 p-1 bg-white/[0.03]', className)}>
      <button
        type="button"
        onClick={() => onChange('padrao')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
          value === 'padrao'
            ? 'bg-white/10 text-white ring-1 ring-white/15'
            : 'text-slate-500 hover:text-slate-300',
        )}
      >
        <LayoutList size={14} />
        {FORM_MODE_LABELS.padrao}
      </button>
      <button
        type="button"
        onClick={() => onChange('gamificado')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
          value === 'gamificado'
            ? 'bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/40'
            : 'text-slate-500 hover:text-slate-300',
        )}
      >
        <Gamepad2 size={14} />
        {FORM_MODE_LABELS.gamificado}
      </button>
    </div>
  )
}
