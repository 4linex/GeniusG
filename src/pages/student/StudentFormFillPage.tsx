import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Maximize2, Sparkles } from 'lucide-react'
import { StudentQuestionDisplay } from '@/components/questions/StudentQuestionDisplay'
import { StudentExamSidebar } from '@/components/student/StudentExamSidebar'
import { GamifiedEmojiBackground } from '@/components/student/GamifiedEmojiBackground'
import { cn } from '@/lib/utils'
import { fetchStudentForm, submitStudentForm } from '@/lib/studentForm'
import { useExamLockdown } from '@/hooks/useExamLockdown'
import type { StudentFormConfig } from '@/lib/studentForm'

function formatSubmitError(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'Erro ao enviar'
  if (raw.includes('numeric field overflow')) {
    return 'Não foi possível registrar a pontuação. Tente finalizar novamente; se o erro continuar, avise seu professor.'
  }
  return raw
}

export function StudentFormFillPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [config, setConfig] = useState<StudentFormConfig | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [finished, setFinished] = useState(false)
  const [session, setSession] = useState<{ name: string; email: string } | null>(null)
  const [error, setError] = useState('')

  const questions = config?.questions || []
  const isGamified = config?.form_mode === 'gamificado'
  const accent = config?.design_accent || '#14b8a6'
  const examActive = !loading && !finished && questions.length > 0
  const { obscured, needsFullscreen, enterFullscreen } = useExamLockdown(examActive)

  useEffect(() => {
    const sessionData = sessionStorage.getItem(`form_session_${slug}`)
    if (!sessionData) {
      navigate(`/f/${slug}`)
      return
    }
    setSession(JSON.parse(sessionData))

    const load = async () => {
      try {
        const data = await fetchStudentForm(slug!)
        setConfig(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar formulário')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug, navigate])

  const currentQuestion = questions[currentIndex]
  const answeredCount = questions.filter((q) => answers[q.id]).length

  const selectAnswer = useCallback((questionId: string, letter: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: letter }))
  }, [])

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const handleNavigate = (index: number) => {
    setCurrentIndex(index)
  }

  const handleSubmit = async () => {
    if (!session) return
    setSubmitting(true)
    setError('')

    try {
      const answerPayload = questions.map((q) => ({
        question_id: q.id,
        letter: answers[q.id],
      }))

      await submitStudentForm(slug!, session.name, session.email, answerPayload)

      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {})
      }

      setFinished(true)
      sessionStorage.removeItem(`form_session_${slug}`)
    } catch (err) {
      setError(formatSubmitError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const blockClipboard = (e: React.ClipboardEvent) => e.preventDefault()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-600" />
      </div>
    )
  }

  if (error && questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center max-w-md shadow-sm">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => navigate(`/f/${slug}`)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            Voltar
          </button>
        </div>
      </div>
    )
  }

  if (finished) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
        style={{ background: isGamified ? `linear-gradient(135deg, #080c14 0%, ${accent}15 100%)` : '#080c14' }}
      >
        {!isGamified && (
          <>
            <div className="absolute inset-0 gradient-bg opacity-10" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-3xl" />
          </>
        )}
        {isGamified && <GamifiedEmojiBackground />}
        <div className="relative z-10 w-full max-w-md glass rounded-2xl p-8 text-center">
          {isGamified && (
            <div className="flex justify-center mb-4">
              <Sparkles size={32} style={{ color: accent }} />
            </div>
          )}
          <h1 className="text-2xl font-bold text-white mb-2">
            {config?.final_screen_title || 'Obrigado'}, {session?.name}!
          </h1>
          <p className="text-slate-400">
            {config?.final_screen_message ||
              'Suas respostas foram registradas com sucesso. Seu professor receberá o diagnóstico completo.'}
          </p>
          <p className="text-sm text-slate-500 mt-4">
            Seu professor receberá o diagnóstico completo e poderá orientar seus próximos passos.
          </p>
        </div>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Nenhuma questão encontrada neste formulário.</p>
      </div>
    )
  }

  const hasAnswer = Boolean(answers[currentQuestion.id])
  const isLast = currentIndex === questions.length - 1
  const allAnswered = questions.every((q) => answers[q.id])

  return (
    <div className="min-h-screen bg-gray-100 relative">
      {obscured && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 text-center">
          {needsFullscreen ? (
            <>
              <Maximize2 size={40} className="text-gray-300 mb-4" />
              <p className="text-gray-900 font-semibold text-lg mb-2">Prova em tela cheia</p>
              <p className="text-gray-500 text-sm mb-6 max-w-sm">
                Para continuar, volte a esta aba e mantenha a prova em tela cheia.
              </p>
              <button
                type="button"
                onClick={() => void enterFullscreen()}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                <Maximize2 size={18} />
                Voltar à prova
              </button>
            </>
          ) : (
            <p className="text-gray-400 text-sm">Carregando...</p>
          )}
        </div>
      )}

      <div
        className={cn(
          'min-h-screen p-4 md:p-6 lg:p-8',
          obscured && 'invisible',
        )}
        onCopy={blockClipboard}
        onCut={blockClipboard}
        onPaste={blockClipboard}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">
          <StudentExamSidebar
            formTitle={config?.form_title || 'Prova Online'}
            totalQuestions={questions.length}
            currentIndex={currentIndex}
            answeredCount={answeredCount}
            answers={answers}
            questionIds={questions.map((q) => q.id)}
            onNavigate={handleNavigate}
          />

          <main className="flex-1 min-w-0">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col min-h-[calc(100vh-4rem)]">
              <div className="flex-1 p-6 md:p-8">
                <p className="text-sm text-blue-600 font-medium mb-4">
                  Questão {currentIndex + 1} de {questions.length}
                </p>

                <StudentQuestionDisplay
                  variant="exam"
                  title={currentQuestion.title}
                  subtitle={currentQuestion.subtitle}
                  enunciado={currentQuestion.enunciado}
                  imageUrl={currentQuestion.image_url}
                  youtubeUrl={currentQuestion.youtube_url}
                />

                <p className="text-gray-800 font-medium mt-8 mb-4">
                  Selecione a alternativa correta:
                </p>

                <div className="space-y-3">
                  {currentQuestion.alternatives.map((alt) => {
                    const selected = answers[currentQuestion.id] === alt.letter
                    return (
                      <button
                        key={`${currentQuestion.id}-${alt.order_index}`}
                        type="button"
                        onClick={() => selectAnswer(currentQuestion.id, alt.letter)}
                        className={cn(
                          'w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-4 select-none',
                          selected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                        )}
                      >
                        <span
                          className={cn(
                            'flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 mt-0.5',
                            selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300',
                          )}
                        >
                          {selected && <span className="w-2 h-2 rounded-full bg-white" />}
                        </span>
                        <span className="flex items-start gap-3 min-w-0">
                          <span
                            className={cn(
                              'font-bold text-sm shrink-0',
                              selected ? 'text-blue-700' : 'text-blue-600',
                            )}
                          >
                            {alt.letter}
                          </span>
                          <span className={cn('text-sm pt-px', selected ? 'text-gray-900' : 'text-gray-700')}>
                            {alt.text}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>

                {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
              </div>

              <div className="border-t border-gray-100 px-6 md:px-8 py-4 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className={cn(
                    'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium transition-colors',
                    currentIndex === 0
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-blue-600 hover:bg-blue-50',
                  )}
                >
                  <ChevronLeft size={18} />
                  Anterior
                </button>

                {isLast ? (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!allAnswered || submitting}
                    className={cn(
                      'inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-colors',
                      allAnswered && !submitting
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-300 cursor-not-allowed',
                    )}
                  >
                    {submitting ? 'Enviando...' : 'Finalizar'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!hasAnswer}
                    className={cn(
                      'inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-colors',
                      hasAnswer ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed',
                    )}
                  >
                    Próxima
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
