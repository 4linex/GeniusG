import type { QuestionAlternative } from '@/types/database'
import { cn } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface AlternativeOptionsEditorProps {
  alternatives: QuestionAlternative[]
  onChangeText: (index: number, text: string) => void
  onMarkCorrect: (index: number) => void
  onRemove?: (index: number) => void
  onAdd?: () => void
  minCount?: number
  title?: string
  className?: string
  stopBubble?: (e: React.SyntheticEvent) => void
}

export function AlternativeOptionsEditor({
  alternatives,
  onChangeText,
  onMarkCorrect,
  onRemove,
  onAdd,
  minCount = 2,
  title = 'Alternativas',
  className,
  stopBubble,
}: AlternativeOptionsEditorProps) {
  const bubble = stopBubble ?? (() => {})

  return (
    <div className={className}>
      <p className="text-sm font-medium text-slate-300 mb-3">{title}</p>
      <div className="space-y-2.5">
        {alternatives.map((alt, index) => (
          <div key={`${alt.letter}-${index}`} className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => onMarkCorrect(index)}
              className={cn(
                'h-10 w-10 shrink-0 rounded-lg border text-sm font-bold transition-colors',
                alt.is_correct
                  ? 'bg-teal-500 border-teal-500 text-white'
                  : 'bg-slate-900/50 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300',
              )}
              title="Marcar como correta"
            >
              {alt.letter}
            </button>
            <input
              value={alt.text}
              onChange={(e) => onChangeText(index, e.target.value)}
              onPaste={bubble}
              onCopy={bubble}
              onCut={bubble}
              placeholder={`Opção ${alt.letter}`}
              className={cn(
                'flex-1 min-w-0 h-10 rounded-lg border border-white/10 bg-slate-900/50',
                'px-3 text-sm text-white placeholder:text-slate-500',
                'outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30',
              )}
            />
            {onRemove && alternatives.length > minCount && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="h-10 w-10 shrink-0 flex items-center justify-center text-red-400 hover:bg-red-500/10 rounded-lg"
                title="Remover alternativa"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      {onAdd && (
        <div className="flex justify-end mt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onAdd}>
            <Plus size={14} />
            Adicionar alternativa
          </Button>
        </div>
      )}
    </div>
  )
}
