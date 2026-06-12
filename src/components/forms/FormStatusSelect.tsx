import { cn } from '@/lib/utils'
import type { FormStatus } from '@/types/database'
import { FORM_STATUS_LABELS } from '@/types/database'
import { Select } from '@/components/ui/Select'

interface FormStatusSelectProps {
  value: FormStatus
  onChange: (status: FormStatus) => void
  disabled?: boolean
  className?: string
}

export function FormStatusSelect({ value, onChange, disabled, className }: FormStatusSelectProps) {
  return (
    <Select
      size="sm"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as FormStatus)}
      options={[
        { value: 'em_andamento', label: FORM_STATUS_LABELS.em_andamento },
        { value: 'concluido', label: FORM_STATUS_LABELS.concluido },
      ]}
      className={cn(
        value === 'concluido'
          ? '!bg-emerald-500/10 !border-emerald-500/30 !text-emerald-300'
          : '!bg-amber-500/10 !border-amber-500/30 !text-amber-300',
        className,
      )}
    />
  )
}

export function FormStatusBadge({ status }: { status: FormStatus }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
        status === 'concluido'
          ? 'bg-emerald-500/20 text-emerald-400'
          : 'bg-amber-500/20 text-amber-400',
      )}
    >
      {FORM_STATUS_LABELS[status]}
    </span>
  )
}
