import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, XCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { WrongQuestionDetailModal } from '@/components/dashboard/WrongQuestionDetailModal'
import { RecommendedTrailSection } from '@/components/trails/RecommendedTrailSection'
import { loadStudentResponseDetail, type WrongAnswerRow, type ResponseRecommendedTrail } from '@/lib/formAssessmentReport'
import { resolveScopedFormIds, canAccessForm } from '@/lib/scopedForms'
import { formatDate, formatScore } from '@/lib/utils'
import { stripHtml } from '@/lib/richText'
import { NIVEL_PROFICIENCIA_LABELS } from '@/lib/scoring'
import type { NivelProficiencia } from '@/types/database'
import { cn } from '@/lib/utils'

export function FormStudentResponsePage() {
  const { formId, responseId } = useParams()
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [completedAt, setCompletedAt] = useState('')
  const [percentual, setPercentual] = useState<number | null>(null)
  const [nivel, setNivel] = useState<NivelProficiencia | null>(null)
  const [correctAnswers, setCorrectAnswers] = useState<number | null>(null)
  const [totalQuestions, setTotalQuestions] = useState<number | null>(null)
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswerRow[]>([])
  const [recommendedTrail, setRecommendedTrail] = useState<ResponseRecommendedTrail | null>(null)
  const [selectedQuestion, setSelectedQuestion] = useState<WrongAnswerRow | null>(null)

  useEffect(() => {
    if (!formId || !responseId || !user?.id || !profile?.role) return

    const load = async () => {
      setLoading(true)
      setDenied(false)

      try {
        const scoped = await resolveScopedFormIds(user.id, profile.role)
        if (!canAccessForm(formId, scoped)) {
          setDenied(true)
          return
        }

        const data = await loadStudentResponseDetail(formId, responseId)
        if (!data) {
          setDenied(true)
          return
        }

        const r = data.response
        setStudentName(r.student_name)
        setStudentEmail(r.student_email)
        setFormTitle(data.formTitle)
        setCompletedAt(r.completed_at)
        setPercentual(r.percentual_acerto)
        setNivel(r.nivel_proficiencia as NivelProficiencia | null)
        setCorrectAnswers(r.correct_answers)
        setTotalQuestions(r.total_questions)
        setWrongAnswers(data.wrongAnswers)
        setRecommendedTrail(data.recommendedTrail)
      } catch (err) {
        console.error(err)
        setDenied(true)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [formId, responseId, user?.id, profile?.role])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
      </div>
    )
  }

  if (denied) {
    return (
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6"
        >
          <ArrowLeft size={16} />
          Voltar ao dashboard
        </Link>
        <Card>
          <p className="text-slate-400 text-center py-8">Resposta não encontrada.</p>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <Link
        to={`/dashboard/avaliacoes/${formId}`}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft size={16} />
        Voltar para {formTitle}
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{studentName}</h1>
        <p className="text-slate-400 mt-1">{studentEmail}</p>
        <p className="text-xs text-slate-500 mt-1">{formatDate(completedAt)}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {correctAnswers != null && totalQuestions != null && (
            <Badge variant="default">
              {correctAnswers}/{totalQuestions} acertos
            </Badge>
          )}
          {percentual != null && (
            <Badge variant="info">TCT: {formatScore(percentual)}</Badge>
          )}
          {nivel && (
            <Badge variant={nivel === 'avancado' ? 'success' : 'warning'}>
              {NIVEL_PROFICIENCIA_LABELS[nivel]}
            </Badge>
          )}
        </div>
      </div>

      {recommendedTrail ? (
        <RecommendedTrailSection
          title={recommendedTrail.title}
          percentRange={recommendedTrail.percentRange}
          trail={recommendedTrail.learningTrail}
          studentPercent={percentual}
        />
      ) : (
        <Card className="mb-8">
          <p className="text-sm text-slate-500 text-center py-4">
            Nenhuma trilha de recomposição foi atribuída para esta faixa de desempenho.
          </p>
        </Card>
      )}

      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <XCircle size={20} className="text-red-400" />
        Questões erradas ({wrongAnswers.length})
      </h2>

      {wrongAnswers.length === 0 ? (
        <Card>
          <p className="text-emerald-400 text-center py-8">
            Nenhum erro — o aluno acertou todas as questões respondidas.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {wrongAnswers.map((w, i) => (
            <div
              key={`${w.questionId}-${i}`}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedQuestion(w)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelectedQuestion(w)
                }
              }}
              className="cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50"
            >
              <Card hover className="group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white group-hover:text-primary-300 transition-colors">
                    {w.title}
                  </h3>
                  {w.enunciado && (
                    <p className="text-sm text-slate-400 mt-2 line-clamp-2">
                      {stripHtml(w.enunciado)}
                    </p>
                  )}
                  <div className="mt-3 space-y-1 text-sm">
                    <p className="text-red-400">
                      Marcada: {w.selectedLetter ? `${w.selectedLetter}) ` : ''}
                      {w.selectedText || 'Sem resposta'}
                    </p>
                    {w.correctLetter && (
                      <p className="text-emerald-400">
                        Correta: {w.correctLetter}
                        {w.correctText ? `) ${w.correctText}` : ''}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-3">Clique para ver a questão completa</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex flex-col gap-1 text-right">
                    {w.habilidade_bncc && (
                      <Badge variant="default" className="text-xs">
                        {w.habilidade_bncc}
                      </Badge>
                    )}
                    {w.nivel_bloom && (
                      <Badge variant="info" className="text-xs">
                        {w.nivel_bloom}
                      </Badge>
                    )}
                  </div>
                  <ChevronRight
                    size={18}
                    className={cn('text-slate-600 group-hover:text-primary-400 transition-colors')}
                  />
                </div>
              </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      <WrongQuestionDetailModal
        open={Boolean(selectedQuestion)}
        question={selectedQuestion}
        onClose={() => setSelectedQuestion(null)}
      />
    </div>
  )
}
