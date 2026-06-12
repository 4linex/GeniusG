import { GripVertical, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StudentQuestionDisplay } from '@/components/questions/StudentQuestionDisplay'
import { needsAlternatives } from '@/types/questionTypes'
import { QuestionTypeBadge } from '@/components/forms/QuestionTypePicker'
import type { BuilderQuestion } from '@/components/forms/builder/types'

interface FormCanvasProps {
  questions: BuilderQuestion[]
  selectedId: string | null
  onSelect: (localId: string) => void
  onRemove: (localId: string) => void
  onMove: (localId: string, direction: -1 | 1) => void
}

export function FormCanvas({
  questions,
  selectedId,
  onSelect,
  onRemove,
  onMove,
}: FormCanvasProps) {
  if (questions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <p className="text-slate-400 mb-2">Nenhuma questão no formulário</p>
          <p className="text-sm text-slate-500">
            Adicione questões do banco (Turma → Área → Assunto → Questão) ou crie manualmente pelo painel à esquerda.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {questions.map((q, index) => {
        const selected = selectedId === q.localId
        return (
          <div
            key={q.localId}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(q.localId)}
            onKeyDown={(e) => e.key === 'Enter' && onSelect(q.localId)}
            className={cn(
              'rounded-2xl border p-5 transition-all cursor-pointer',
              selected
                ? 'border-teal-500/60 bg-teal-500/5 shadow-lg shadow-teal-500/10'
                : 'border-white/10 bg-white/[0.02] hover:border-white/20',
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1 pt-1">
                <button
                  type="button"
                  className="text-slate-600 hover:text-slate-400 disabled:opacity-30"
                  disabled={index === 0}
                  onClick={(e) => { e.stopPropagation(); onMove(q.localId, -1) }}
                >
                  <GripVertical size={16} />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs text-slate-500">Questão {index + 1}</span>
                  <QuestionTypeBadge type={q.questionType} />
                  {q.source === 'inline' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">Manual</span>
                  )}
                </div>
                <StudentQuestionDisplay
                  title={q.title || 'Sem título'}
                  subtitle={q.description}
                  enunciado={q.enunciado}
                  imageUrl={q.imageUrl}
                  youtubeUrl={q.youtubeUrl}
                >
                  {needsAlternatives(q.questionType) ? (
                    <div className="space-y-2">
                      {q.alternatives.map((alt) => (
                        <div
                          key={alt.letter}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-sm text-slate-300"
                        >
                          <span className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">
                            {alt.letter}
                          </span>
                          <span>{alt.text || 'Opção vazia'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      Campo de resposta: {q.questionType.replace(/_/g, ' ')}
                    </p>
                  )}
                </StudentQuestionDisplay>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(q.localId) }}
                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
