import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { QuestionPreviewModal } from '@/components/questions/QuestionPreview'
import { QuestionsTableSection } from '@/components/questions/QuestionsTableSection'
import {
  ComponentQuestionsFilters,
  EMPTY_COMPONENT_QUESTIONS_FILTERS,
} from '@/components/questions/ComponentQuestionsFilters'
import {
  componentToSlug,
  getComponentTheme,
  isKnownComponent,
  slugToComponent,
} from '@/lib/questionComponents'
import { deleteOrArchiveQuestion, questionDeleteSuccessMessage } from '@/lib/questionDelete'
import { applyComponentQuestionsFilters } from '@/lib/questionFilters'
import { type Question, type QuestionAlternative } from '@/types/database'
import type { QuestionType } from '@/types/questionTypes'
import { needsAlternatives } from '@/types/questionTypes'
import { cn } from '@/lib/utils'
import { ArrowLeft, Plus } from 'lucide-react'

export function ComponentQuestionsPage() {
  const { componentSlug = '' } = useParams()
  const { user, profile } = useAuth()
  const componentLabel = slugToComponent(componentSlug)
  const theme = getComponentTheme(componentLabel)
  const Icon = theme.icon

  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(EMPTY_COMPONENT_QUESTIONS_FILTERS)
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null)
  const [previewAlternatives, setPreviewAlternatives] = useState<QuestionAlternative[]>([])

  const componentPath = `/admin/questoes/componente/${componentToSlug(componentLabel)}`

  const loadQuestions = useCallback(async () => {
    if (!isKnownComponent(componentLabel)) return
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('questions')
      .select(
        'id, title, enunciado, codigo_item, ano_serie, componente_curricular, nivel_dificuldade, question_type, image_url, point_value, created_at, is_form_exclusive, created_by, subtitle, youtube_url, conteudo_programatico, descritor_saeb, habilidade_bncc, nivel_bloom, tempo_medio_resolucao, tipo_texto_base, fonte, creator_notes',
      )
      .eq('componente_curricular', componentLabel)
      .is('archived_at', null)
      .order('created_at', { ascending: false })

    if (!loadError && data) setQuestions(data as Question[])
    setLoading(false)
  }, [componentLabel])

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  useEffect(() => {
    setPage(1)
  }, [filters])

  const filtered = useMemo(
    () => applyComponentQuestionsFilters(questions, filters),
    [questions, filters],
  )

  if (!isKnownComponent(componentLabel)) {
    return <Navigate to="/admin/questoes" replace />
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError('')
    setSuccess('')
    const result = await deleteOrArchiveQuestion(deleteTarget.id)
    if (!result.ok) {
      setError(result.message)
      setDeleting(false)
      return
    }
    setDeleteTarget(null)
    setDeleting(false)
    setSuccess(questionDeleteSuccessMessage(result))
    loadQuestions()
  }

  const openPreview = async (q: Question) => {
    const { data: full } = await supabase.from('questions').select('*').eq('id', q.id).single()
    if (!full) return

    setPreviewQuestion(full as Question)

    if (needsAlternatives((full.question_type || 'multipla_escolha') as QuestionType)) {
      const { data: alts } = await supabase
        .from('question_alternatives')
        .select('*')
        .eq('question_id', q.id)
        .order('order_index')
      setPreviewAlternatives((alts as QuestionAlternative[]) || [])
    } else {
      setPreviewAlternatives([])
    }
  }

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div className="flex items-start gap-4 min-w-0">
          <Link
            to="/admin/questoes"
            className="mt-1 inline-flex items-center justify-center w-9 h-9 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
            title="Voltar aos componentes"
          >
            <ArrowLeft size={18} />
          </Link>
          <div
            className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0',
              theme.bg,
            )}
          >
            <Icon size={28} className={theme.color} />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white">{componentLabel}</h1>
            <p className="text-slate-400 mt-1">{theme.description}</p>
            <p className="text-sm text-slate-500 mt-1">
              {questions.length} {questions.length === 1 ? 'questão' : 'questões'} neste componente
            </p>
          </div>
        </div>

        <Link
          to="/admin/questoes/nova"
          state={{ fixedComponente: componentLabel, returnPath: componentPath }}
        >
          <Button>
            <Plus size={16} />
            Nova questão
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm text-emerald-300">
          {success}
        </div>
      )}

      <ComponentQuestionsFilters
        filters={filters}
        resultCount={filtered.length}
        totalCount={questions.length}
        onChange={setFilters}
        onClear={() => setFilters(EMPTY_COMPONENT_QUESTIONS_FILTERS)}
      />

      <QuestionsTableSection
        questions={filtered}
        loading={loading}
        activeComponent={componentLabel}
        page={page}
        onPageChange={setPage}
        onPreview={openPreview}
        onDelete={setDeleteTarget}
        returnPathForEdit={componentPath}
      />

      <QuestionPreviewModal
        open={Boolean(previewQuestion)}
        onClose={() => {
          setPreviewQuestion(null)
          setPreviewAlternatives([])
        }}
        data={
          previewQuestion
            ? {
                title: previewQuestion.title,
                enunciado: previewQuestion.enunciado,
                subtitle: previewQuestion.subtitle,
                questionType: (previewQuestion.question_type || 'multipla_escolha') as QuestionType,
                pointValue: previewQuestion.point_value ?? 1,
                imageUrl: previewQuestion.image_url,
                youtubeUrl: previewQuestion.youtube_url,
                alternatives: previewAlternatives,
                metadata: {
                  codigo_item: previewQuestion.codigo_item,
                  componente_curricular: previewQuestion.componente_curricular,
                  ano_serie: previewQuestion.ano_serie,
                  conteudo_programatico: previewQuestion.conteudo_programatico,
                  descritor_saeb: previewQuestion.descritor_saeb,
                  habilidade_bncc: previewQuestion.habilidade_bncc,
                  nivel_bloom: previewQuestion.nivel_bloom,
                  nivel_dificuldade: previewQuestion.nivel_dificuldade,
                  tempo_medio_resolucao: previewQuestion.tempo_medio_resolucao,
                  tipo_texto_base: previewQuestion.tipo_texto_base,
                  fonte: previewQuestion.fonte,
                },
                creatorNotes:
                  !previewQuestion.created_by ||
                  user?.id === previewQuestion.created_by ||
                  profile?.role === 'admin' ||
                  profile?.role === 'root'
                    ? previewQuestion.creator_notes
                    : undefined,
              }
            : null
        }
      />

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Excluir questão"
        description="Se a questão nunca foi respondida, ela será removida permanentemente. Se já houver respostas de alunos, ela será arquivada (some do banco, mas o histórico das avaliações é preservado)."
        itemName={deleteTarget?.title}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
