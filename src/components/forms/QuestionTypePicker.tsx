import { cn } from '@/lib/utils'
import {
  QUESTION_TYPE_OPTIONS,
  type QuestionType,
  getQuestionTypeOption,
} from '@/types/questionTypes'

interface QuestionTypePickerProps {
  value?: QuestionType
  onChange: (type: QuestionType) => void
  compact?: boolean
  className?: string
  /** No builder: clique adiciona direto ao formulário (sem estado selecionado) */
  addOnClick?: boolean
}

export function QuestionTypePicker({
  value,
  onChange,
  compact = false,
  className,
  addOnClick = false,
}: QuestionTypePickerProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {!compact && (
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Estilo da questão
        </p>
      )}
      {QUESTION_TYPE_OPTIONS.map((option) => {
        const Icon = option.icon
        const selected = !addOnClick && value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            title={option.description}
            className={cn(
              'w-full flex items-center gap-3 rounded-xl border text-left transition-colors',
              compact ? 'p-2.5' : 'p-3',
              selected
                ? 'border-primary-500/50 bg-primary-500/10 text-white'
                : 'border-white/10 text-slate-300 hover:border-primary-500/40 hover:bg-white/5',
            )}
          >
            <span
              className={cn(
                'flex items-center justify-center rounded-lg shrink-0',
                compact ? 'w-8 h-8' : 'w-9 h-9',
                selected ? 'bg-primary-500/20 text-primary-300' : 'bg-white/5 text-slate-400',
              )}
            >
              <Icon size={compact ? 16 : 18} />
            </span>
            <span className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function QuestionTypeBadge({ type }: { type: QuestionType }) {
  const option = getQuestionTypeOption(type)
  const Icon = option.icon
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
      <Icon size={12} />
      {option.label}
    </span>
  )
}
