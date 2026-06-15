import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StudentQuestionDisplay } from '@/components/questions/StudentQuestionDisplay'
import { cn } from '@/lib/utils'
import { fetchStudentForm, submitStudentForm } from '@/lib/studentForm'
import { GamifiedEmojiBackground } from '@/components/student/GamifiedEmojiBackground'
import { Sparkles } from 'lucide-react'
import type { StudentFormConfig } from '@/lib/studentForm'

function formatSubmitError(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'Erro ao enviar'
  if (raw.includes('numeric field overflow')) {
    return 'Não foi possível registrar a pontuação. Tente finalizar novamente; se o erro continuar, avise seu professor.'
  }
  return raw
}

const GAMIFIED_MESSAGES = [
  'Ótimo! Continue assim!',
  'Você está indo muito bem!',
  'Mais uma etapa concluída!',
  'Excelente progresso!',
]

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
  const [encouragement, setEncouragement] = useState('')

  const questions = config?.questions || []
  const isGamified = config?.form_mode === 'gamificado'
  const accent = config?.design_accent || '#14b8a6'

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
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0

  const selectAnswer = useCallback((questionId: string, letter: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: letter }))
    if (isGamified) {
      setEncouragement(GAMIFIED_MESSAGES[Math.floor(Math.random() * GAMIFIED_MESSAGES.length)])
    }
  }, [isGamified])

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setEncouragement('')
    }
  }

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setEncouragement('')
    }
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

      setFinished(true)
      sessionStorage.removeItem(`form_session_${slug}`)
    } catch (err) {
      setError(formatSubmitError(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080c14]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500/30 border-t-teal-500" />
      </div>
    )
  }

  if (error && questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#080c14]">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={() => navigate(`/f/${slug}`)}>Voltar</Button>
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
              'Suas respostas foram registradas com sucesso.'}
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
      <div className="min-h-screen flex items-center justify-center bg-[#080c14]">
        <p className="text-slate-400">Nenhuma questão encontrada neste formulário.</p>
      </div>
    )
  }

  const hasAnswer = Boolean(answers[currentQuestion.id])
  const isLast = currentIndex === questions.length - 1
  const allAnswered = questions.every((q) => answers[q.id])

  return (
    <div
      className={cn('min-h-screen p-4 md:p-8 relative overflow-hidden', isGamified && 'bg-[#080c14]')}
      style={isGamified ? { background: `linear-gradient(180deg, #080c14 0%, ${accent}08 100%)` } : undefined}
    >
      {isGamified && <GamifiedEmojiBackground />}
      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-400">
              Questão {currentIndex + 1} de {questions.length}
            </p>
            {isGamified && encouragement && (
              <p className="text-sm font-medium animate-pulse" style={{ color: accent }}>
                {encouragement}
              </p>
            )}
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
            subtitle={currentQuestion.subtitle}
            enunciado={currentQuestion.enunciado}
            imageUrl={currentQuestion.image_url}
            youtubeUrl={currentQuestion.youtube_url}
          />

          <div className="space-y-3">
            {currentQuestion.alternatives.map((alt) => {
              const selected = answers[currentQuestion.id] === alt.letter
              return (
                <button
                  key={`${currentQuestion.id}-${alt.order_index}`}
                  type="button"
                  onClick={() => selectAnswer(currentQuestion.id, alt.letter)}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-start gap-3',
                    selected
                      ? isGamified
                        ? 'border-white/30 bg-white/10 scale-[1.01]'
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
                    style={selected && isGamified ? { backgroundColor: accent } : selected ? undefined : undefined}
                  >
                    {alt.letter}
                  </span>
                  <span className="text-sm text-slate-200 pt-1">{alt.text}</span>
                </button>
              )
            })}
          </div>
        </div>

        {error && <p className="text-sm text-red-400 mt-4 text-center">{error}</p>}

        <div className="flex justify-between mt-6">
          <Button variant="secondary" onClick={goPrev} disabled={currentIndex === 0}>
            Anterior
          </Button>

          {isLast ? (
            <Button
              onClick={handleSubmit}
              loading={submitting}
              disabled={!allAnswered}
              style={isGamified ? { backgroundColor: accent } : undefined}
            >
              Finalizar
            </Button>
          ) : (
            <Button onClick={goNext} disabled={!hasAnswer}>
              Próxima
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
