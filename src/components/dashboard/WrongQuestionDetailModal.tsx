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

  const sortedAlternatives = [...question.alternatives].sort(
    (a, b) => a.order_index - b.order_index,
  )

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
                    'flex items-start gap-3 p-3 rounded-xl border text-sm transition-colors',
                    isCorrect && 'border-emerald-500/40 bg-emerald-500/10',
                    isSelected && !isCorrect && 'border-red-500/40 bg-red-500/10',
                    !isSelected && !isCorrect && 'border-white/10 text-slate-300',
                  )}
                >
                  <span
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                      isCorrect && 'bg-emerald-500/30 text-emerald-200',
                      isSelected && !isCorrect && 'bg-red-500/30 text-red-200',
                      !isSelected && !isCorrect && 'bg-white/10 text-slate-400',
                    )}
                  >
                    {alt.letter}
                  </span>
                  <div className="pt-1 min-w-0">
                    <span className={cn(isCorrect ? 'text-emerald-100' : isSelected ? 'text-red-100' : 'text-slate-300')}>
                      {alt.text || '—'}
                    </span>
                    {isSelected && !isCorrect && (
                      <p className="text-xs text-red-400 mt-1">Resposta do aluno</p>
                    )}
                    {isCorrect && (
                      <p className="text-xs text-emerald-400 mt-1">Gabarito</p>
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
