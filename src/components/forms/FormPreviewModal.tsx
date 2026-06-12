import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StudentQuestionDisplay } from '@/components/questions/StudentQuestionDisplay'
import { cn } from '@/lib/utils'
import type { FormMode } from '@/types/database'
import type { BuilderQuestion } from '@/components/forms/builder/types'
import { needsAlternatives } from '@/types/questionTypes'
import { APP_BADGE } from '@/lib/branding'
import { GamifiedEmojiBackground } from '@/components/student/GamifiedEmojiBackground'
import { RocketTrailUnlock } from '@/components/student/RocketTrailUnlock'
import type { StudentAssignedTrail } from '@/lib/studentForm'

const PREVIEW_TRAIL: StudentAssignedTrail = {
  title: 'Trilha de recomposição (prévia)',
  description: 'Exemplo da trilha que o aluno receberá após decolar o foguete.',
  content: 'Revise os conceitos principais com o material indicado pelo professor.',
}

type PreviewStep = 'access' | 'questions' | 'final'

export interface FormPreviewConfig {
  title: string
  formMode: FormMode
  designAccent: string
  finalScreenTitle: string
  finalScreenMessage: string
  questions: BuilderQuestion[]
}

interface FormPreviewModalProps {
  open: boolean
  onClose: () => void
  config: FormPreviewConfig
}

const STEPS: { id: PreviewStep; label: string }[] = [
  { id: 'access', label: 'Entrada' },
  { id: 'questions', label: 'Questões' },
  { id: 'final', label: 'Conclusão' },
]

export function FormPreviewModal({ open, onClose, config }: FormPreviewModalProps) {
  const [step, setStep] = useState<PreviewStep>('questions')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})

  if (!open) return null

  const { title, formMode, designAccent, finalScreenTitle, finalScreenMessage, questions } = config
  const isGamified = formMode === 'gamificado'
  const accent = designAccent || '#14b8a6'
  const currentQuestion = questions[currentIndex]
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0

  const handleClose = () => {
    setStep('questions')
    setCurrentIndex(0)
    setSelectedAnswers({})
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#080c14]">
      <header className="shrink-0 h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[#0a0e1a]">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-sm font-semibold text-white truncate">Prévia do formulário</h2>
          <span className="text-slate-600 hidden sm:inline">·</span>
          <span className="text-sm text-slate-400 truncate hidden sm:inline">{title || 'Sem título'}</span>
        </div>

        <nav className="flex items-center gap-1">
          {STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                step === s.id
                  ? 'bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/30'
                  : 'text-slate-500 hover:text-slate-300',
              )}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          onClick={handleClose}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
          aria-label="Fechar prévia"
        >
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {step === 'access' && (
          <div
            className="min-h-full flex items-center justify-center p-4 relative overflow-hidden"
            style={isGamified ? { background: `linear-gradient(135deg, #080c14 0%, ${accent}15 100%)` } : undefined}
          >
            {isGamified && <GamifiedEmojiBackground />}
            {!isGamified && <div className="absolute inset-0 gradient-bg opacity-10" />}
            <div className="relative z-10 w-full max-w-md">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/20 text-primary-300 text-xs font-medium mb-4">
                  <Sparkles size={14} />
                  {APP_BADGE}
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">{title || 'Formulário'}</h1>
                <p className="text-slate-400">Informe seus dados para começar</p>
              </div>
              <div className="glass rounded-2xl p-8 space-y-5 pointer-events-none select-none">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Seu nome</label>
                  <div className="h-10 rounded-xl bg-white/5 border border-white/10 px-3 flex items-center text-slate-500 text-sm">
                    Nome do aluno
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Seu e-mail</label>
                  <div className="h-10 rounded-xl bg-white/5 border border-white/10 px-3 flex items-center text-slate-500 text-sm">
                    aluno@email.com
                  </div>
                </div>
                <div className="h-11 rounded-xl bg-teal-600 flex items-center justify-center text-white font-medium text-sm">
                  Começar
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'questions' && (
          <div
            className={cn('min-h-full p-4 md:p-8 relative overflow-hidden', isGamified && 'bg-[#080c14]')}
            style={isGamified ? { background: `linear-gradient(180deg, #080c14 0%, ${accent}08 100%)` } : undefined}
          >
            {isGamified && <GamifiedEmojiBackground />}
            {questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-3">
                <p className="text-slate-400">Nenhuma questão adicionada ainda.</p>
                <p className="text-sm text-slate-500">Adicione questões no editor para visualizar o formulário.</p>
              </div>
            ) : (
              <div className="relative z-10 max-w-2xl mx-auto">
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-slate-400">
                      Questão {currentIndex + 1} de {questions.length}
                    </p>
                    <p className="text-xs text-slate-500">Prévia — respostas não são salvas</p>
                  </div>
                  <ProgressBar value={progress} showLabel={false} />
                </div>

                <div
                  className={cn(
                    'rounded-2xl p-8 space-y-6',
                    isGamified ? 'glass border border-white/10' : 'glass',
                  )}
                  style={isGamified ? { boxShadow: `0 0 40px ${accent}15` } : undefined}
                >
                  <StudentQuestionDisplay
                    title={currentQuestion.title}
                    subtitle={currentQuestion.description}
                    enunciado={currentQuestion.enunciado}
                    imageUrl={currentQuestion.imageUrl}
                    youtubeUrl={currentQuestion.youtubeUrl}
                  />

                  {needsAlternatives(currentQuestion.questionType) ? (
                    <div className="space-y-3">
                      {currentQuestion.alternatives.map((alt) => {
                        const selected = selectedAnswers[currentQuestion.localId] === alt.letter
                        return (
                          <button
                            key={alt.letter}
                            type="button"
                            onClick={() =>
                              setSelectedAnswers((prev) => ({
                                ...prev,
                                [currentQuestion.localId]: alt.letter,
                              }))
                            }
                            className={cn(
                              'w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-start gap-3',
                              selected
                                ? isGamified
                                  ? 'border-white/30 bg-white/10'
                                  : 'border-primary-500 bg-primary-500/15'
                                : 'border-white/10 hover:border-white/20 hover:bg-white/5',
                            )}
                            style={
                              selected && isGamified
                                ? { borderColor: accent, backgroundColor: `${accent}20` }
                                : undefined
                            }
                          >
                            <span
                              className={cn(
                                'flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold shrink-0',
                                selected ? 'text-white' : 'bg-white/10 text-slate-400',
                              )}
                              style={selected && isGamified ? { backgroundColor: accent } : undefined}
                            >
                              {alt.letter}
                            </span>
                            <span className="text-sm text-slate-200 pt-1">{alt.text || '—'}</span>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      Campo de resposta aberta (não exibido na prévia)
                    </p>
                  )}
                </div>

                <div className="flex justify-between mt-6">
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft size={16} />
                    Anterior
                  </Button>
                  {currentIndex < questions.length - 1 ? (
                    <Button onClick={() => setCurrentIndex((i) => i + 1)}>
                      Próxima
                      <ChevronRight size={16} />
                    </Button>
                  ) : (
                    <Button variant="secondary" onClick={() => setStep('final')}>
                      Ver conclusão
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'final' && (
          <div
            className="min-h-full flex items-center justify-center p-4 relative overflow-hidden"
            style={{ background: isGamified ? `linear-gradient(135deg, #080c14 0%, ${accent}15 100%)` : '#080c14' }}
          >
            {isGamified && <GamifiedEmojiBackground />}
            <div className="relative z-10 w-full max-w-md glass rounded-2xl p-8 text-center">
              {isGamified && (
                <div className="flex justify-center mb-4">
                  <Sparkles size={32} style={{ color: accent }} />
                </div>
              )}
              <h1 className="text-2xl font-bold text-white mb-2">{finalScreenTitle || 'Obrigado!'}</h1>
              <p className="text-slate-400">
                {finalScreenMessage ||
                  'Suas respostas foram registradas com sucesso. Seu professor receberá o diagnóstico completo.'}
              </p>
              {isGamified ? (
                <RocketTrailUnlock trail={PREVIEW_TRAIL} accent={accent} />
              ) : (
                <p className="text-xs text-slate-500 mt-6">O aluno vê apenas esta mensagem — sem nota ou ranking.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
