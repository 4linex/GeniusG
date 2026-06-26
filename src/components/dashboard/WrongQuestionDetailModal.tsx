import { X } from 'lucide-react'
import { StudentQuestionDisplay } from '@/components/questions/StudentQuestionDisplay'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { WrongAnswerRow } from '@/lib/formAssessmentReport'

interface WrongQuestionDetailModalProps {
  open: boolean
  question: WrongAnswerRow | null
  onClose: () => void
}

export function WrongQuestionDetailModal({ open, question, onClose }: WrongQuestionDetailModalProps) {
  if (!open || !question) return null

  const sortedAlternatives = [...question.alternatives].sort((a, b) => {
    const aSelected = question.selectedLetter === a.letter
    const bSelected = question.selectedLetter === b.letter
    if (aSelected && !bSelected) return -1
    if (!aSelected && bSelected) return 1
    return a.order_index - b.order_index
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Fechar"
      />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass rounded-2xl p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wrong-question-modal-title"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 id="wrong-question-modal-title" className="text-lg font-semibold text-white">
              Questão errada
            </h2>
            <div className="flex flex-wrap gap-2 mt-2">
              {question.habilidade_bncc && (
                <Badge variant="default" className="text-xs">
                  {question.habilidade_bncc}
                </Badge>
              )}
              {question.nivel_bloom && (
                <Badge variant="info" className="text-xs">
                  {question.nivel_bloom}
                </Badge>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 shrink-0"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {question.selectedLetter && (
          <div className="mb-4 rounded-xl border-2 border-primary-500/50 bg-primary-500/15 p-4 ring-2 ring-primary-500/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-300">
              Resposta marcada pelo aluno
            </p>
            <p className="mt-1.5 text-sm font-medium text-white">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500 text-xs font-bold text-white mr-2">
                {question.selectedLetter}
              </span>
              {question.selectedText || 'Sem texto'}
            </p>
          </div>
        )}

        <StudentQuestionDisplay
          title={question.title}
          subtitle={question.subtitle}
          enunciado={question.enunciado}
          imageUrl={question.image_url}
        >
          <div className="space-y-2 pt-2">
            {sortedAlternatives.map((alt) => {
              const isSelected = question.selectedLetter === alt.letter
              const isCorrect = alt.is_correct

              return (
                <div
                  key={alt.letter}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-3 text-sm transition-colors',
                    isSelected &&
                      'border-2 border-primary-500/60 bg-primary-500/20 ring-2 ring-primary-500/40 shadow-lg shadow-primary-500/10',
                    !isSelected &&
                      isCorrect &&
                      'border border-dashed border-emerald-500/25 bg-emerald-500/5 text-slate-400',
                    !isSelected && !isCorrect && 'border-white/5 text-slate-500 opacity-60',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                      isSelected && 'bg-primary-500 text-white',
                      !isSelected && isCorrect && 'bg-emerald-500/20 text-emerald-400',
                      !isSelected && !isCorrect && 'bg-white/10 text-slate-500',
                    )}
                  >
                    {alt.letter}
                  </span>
                  <div className="min-w-0 pt-1">
                    <span
                      className={cn(
                        isSelected && 'font-medium text-white',
                        !isSelected && isCorrect && 'text-slate-400',
                        !isSelected && !isCorrect && 'text-slate-500',
                      )}
                    >
                      {alt.text || '—'}
                    </span>
                    {isSelected && (
                      <p className="mt-1 text-xs font-semibold text-primary-300">
                        Resposta marcada pelo aluno
                      </p>
                    )}
                    {isCorrect && !isSelected && (
                      <p className="mt-1 text-xs text-emerald-500/80">Gabarito</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </StudentQuestionDisplay>
      </div>
    </div>
  )
}
