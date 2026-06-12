import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Eye } from 'lucide-react'
import { loadFormForBuilder } from '@/lib/formBuilder'
import { formatPercentRange } from '@/lib/formTrails'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { FormPreviewModal, type FormPreviewConfig } from '@/components/forms/FormPreviewModal'
import { QuestionPreview } from '@/components/questions/QuestionPreview'
import { FORM_MODE_LABELS, type Form, type FormTrailConfig } from '@/types/database'
import { QUESTION_TYPE_LABELS } from '@/types/questionTypes'
import type { BuilderQuestion } from '@/components/forms/builder/types'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

type ViewTab = 'info' | 'questions'

export function FormViewPage() {
  const { id } = useParams()
  const { hasRole } = useAuth()
  const canEdit = hasRole('root', 'admin')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<ViewTab>('info')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [form, setForm] = useState<Form | null>(null)
  const [questions, setQuestions] = useState<BuilderQuestion[]>([])
  const [trails, setTrails] = useState<FormTrailConfig[]>([])
  const [previewConfig, setPreviewConfig] = useState<FormPreviewConfig | null>(null)

  useEffect(() => {
    if (!id) return
    loadFormForBuilder(id)
      .then((data) => {
        if (!data) {
          setError('Formulário não encontrado')
          return
        }
        setForm(data.form)
        setQuestions(data.questions)
        setTrails(data.trails)
        setPreviewConfig({
          title: data.form.title,
          formMode: data.form.form_mode || 'padrao',
          designAccent: data.form.design_accent || '#14b8a6',
          finalScreenTitle: data.form.final_screen_title || 'Obrigado!',
          finalScreenMessage:
            data.form.final_screen_message ||
            'Suas respostas foram registradas com sucesso.',
          questions: data.questions,
        })
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
      </div>
    )
  }

  if (error || !form) {
    return (
      <div>
        <Link to="/formularios" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6">
          <ArrowLeft size={16} />
          Voltar
        </Link>
        <Card>
          <p className="text-red-400 text-center py-8">{error || 'Formulário não encontrado'}</p>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <Link to="/formularios" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-3">
            <ArrowLeft size={16} />
            Formulários
          </Link>
          <h1 className="text-2xl font-bold text-white">{form.title}</h1>
          <p className="text-slate-400 mt-1">Visualização do formulário — somente leitura</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setPreviewOpen(true)}>
            <Eye size={16} />
            Ver como aluno
          </Button>
          {canEdit && (
            <Link to={`/formularios/${id}`}>
              <Button>Editar formulário</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {(['info', 'questions'] as ViewTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-primary-500/20 text-primary-300'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {t === 'info' ? 'Informações' : `Questões (${questions.length})`}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Dados do formulário</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Título</dt>
                <dd className="text-white">{form.title}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Série</dt>
                <dd className="text-white">{form.turma || '5º Ano'}</dd>
              </div>
              {form.school_name && (
                <div>
                  <dt className="text-slate-500">Escola</dt>
                  <dd className="text-white">{form.school_name}</dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500">Modo</dt>
                <dd className="text-white">{FORM_MODE_LABELS[form.form_mode || 'padrao']}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="text-white">{form.status === 'concluido' ? 'Concluído' : 'Em andamento'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Questões</dt>
                <dd className="text-white">{questions.length}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Criado em</dt>
                <dd className="text-white">{formatDate(form.created_at)}</dd>
              </div>
              {form.description && (
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">Descrição</dt>
                  <dd className="text-slate-300 whitespace-pre-wrap">{form.description}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-white mb-4">Trilhas de recomposição</h2>
            <p className="text-sm text-slate-400 mb-4">
              Trilhas selecionadas do banco — cada uma com a faixa de % de acerto definida neste formulário.
            </p>
            <div className="space-y-3">
              {trails.filter((t) => t.enabled && t.learningTrailId).map((trail) => (
                <div key={trail.localId} className="rounded-xl border border-white/10 p-4">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-medium text-white">{trail.title || 'Trilha'}</h3>
                    <Badge variant="warning">
                      {formatPercentRange(trail.minPercent, trail.maxPercent)}
                    </Badge>
                  </div>
                  {trail.description && (
                    <p className="text-sm text-slate-400">{trail.description}</p>
                  )}
                </div>
              ))}
              {trails.every((t) => !t.enabled || !t.learningTrailId) && (
                <p className="text-sm text-slate-500">Nenhuma trilha ativa neste formulário.</p>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-white mb-2">Tela final do aluno</h2>
            <p className="text-white font-medium">{form.final_screen_title || 'Obrigado!'}</p>
            <p className="text-sm text-slate-400 mt-2">
              {form.final_screen_message ||
                'Suas respostas foram registradas com sucesso.'}
            </p>
          </Card>
        </div>
      )}

      {tab === 'questions' && (
        <div className="space-y-4">
          {questions.length === 0 ? (
            <Card>
              <p className="text-slate-400 text-center py-8">Nenhuma questão neste formulário.</p>
            </Card>
          ) : (
            questions.map((q, index) => (
              <Card key={q.localId}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </span>
                  <Badge variant="default">{QUESTION_TYPE_LABELS[q.questionType]}</Badge>
                  {q.pointValue != null && q.pointValue > 0 && (
                    <Badge variant="info">{q.pointValue} pts</Badge>
                  )}
                </div>
                <QuestionPreview
                  data={{
                    title: q.title,
                    enunciado: q.enunciado,
                    subtitle: q.description,
                    questionType: q.questionType,
                    pointValue: q.pointValue,
                    imageUrl: q.imageUrl,
                    youtubeUrl: q.youtubeUrl,
                    alternatives: q.alternatives,
                    metadata: q.metadata,
                  }}
                />
              </Card>
            ))
          )}
        </div>
      )}

      {previewConfig && (
        <FormPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} config={previewConfig} />
      )}
    </div>
  )
}
