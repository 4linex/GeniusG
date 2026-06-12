import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { QuestionPreviewModal } from '@/components/questions/QuestionPreview'
import { formatDate } from '@/lib/utils'
import { stripHtml } from '@/lib/richText'
import {
  ANO_SERIE_OPTIONS,
  COMPONENTE_OPTIONS,
  type Question,
  type QuestionAlternative,
} from '@/types/database'
import type { QuestionType } from '@/types/questionTypes'
import { needsAlternatives, supportsTriScoring } from '@/types/questionTypes'
import { QuestionTypeBadge } from '@/components/forms/QuestionTypePicker'
import { Plus, Pencil, Trash2, Eye, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const QUESTIONS_PAGE_SIZE = 5

export function QuestionsPage() {
  const { user, profile } = useAuth()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [filterAno, setFilterAno] = useState('')
  const [filterComponente, setFilterComponente] = useState('')
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null)
  const [previewAlternatives, setPreviewAlternatives] = useState<QuestionAlternative[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set())
  const [visibleByGroup, setVisibleByGroup] = useState<Record<string, number>>({})

  const loadQuestions = async () => {
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('questions')
      .select(
        'id, title, enunciado, codigo_item, ano_serie, componente_curricular, nivel_dificuldade, question_type, image_url, point_value, created_at, is_form_exclusive',
      )
      .order('ano_serie')
      .order('componente_curricular')
      .order('created_at', { ascending: false })

    if (!loadError && data) setQuestions(data as Question[])
    setLoading(false)
  }

  useEffect(() => {
    loadQuestions()
  }, [])

  useEffect(() => {
    setExpandedGroups(new Set())
    setVisibleByGroup({})
  }, [filterAno, filterComponente])

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (filterAno && q.ano_serie !== filterAno) return false
      if (filterComponente && q.componente_curricular !== filterComponente) return false
      return true
    })
  }, [questions, filterAno, filterComponente])

  const grouped = useMemo(() => {
    const map = new Map<string, Question[]>()
    for (const q of filtered) {
      const key = `${q.ano_serie}|||${q.componente_curricular}`
      const list = map.get(key) || []
      list.push(q)
      map.set(key, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
  }, [filtered])

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
        setVisibleByGroup((counts) => ({
          ...counts,
          [key]: counts[key] ?? QUESTIONS_PAGE_SIZE,
        }))
      }
      return next
    })
  }

  const loadMoreInGroup = (key: string, total: number) => {
    setVisibleByGroup((prev) => ({
      ...prev,
      [key]: Math.min((prev[key] ?? QUESTIONS_PAGE_SIZE) + QUESTIONS_PAGE_SIZE, total),
    }))
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError('')
    const { error: deleteError } = await supabase.from('questions').delete().eq('id', deleteTarget.id)
    if (deleteError) {
      setError(deleteError.message)
      setDeleting(false)
      return
    }
    setDeleteTarget(null)
    setDeleting(false)
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
      <CardHeader
        title="Questões"
        description="Banco de questões — a pontuação é definida pelo nível de dificuldade em Configurações Gerais"
        action={
          <Link to="/admin/questoes/nova">
            <Button>
              <Plus size={16} />
              Nova Questão
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Select
          label="Ano/Série"
          value={filterAno}
          onChange={(e) => setFilterAno(e.target.value)}
          options={[{ value: '', label: 'Todos os anos' }, ...ANO_SERIE_OPTIONS]}
        />
        <Select
          label="Componente curricular"
          value={filterComponente}
          onChange={(e) => setFilterComponente(e.target.value)}
          options={[{ value: '', label: 'Todos os componentes' }, ...COMPONENTE_OPTIONS]}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-slate-400 text-center py-8">
            Nenhuma questão encontrada. Clique em &quot;Nova Questão&quot; para começar.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([key, items]) => {
            const [ano, componente] = key.split('|||')
            const isExpanded = expandedGroups.has(key)
            const visibleCount = visibleByGroup[key] ?? QUESTIONS_PAGE_SIZE
            const visibleItems = items.slice(0, visibleCount)
            const hasMore = visibleCount < items.length
            return (
              <section key={key} className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleGroup(key)}
                  aria-expanded={isExpanded}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
                >
                  <ChevronDown
                    size={18}
                    className={cn(
                      'shrink-0 text-slate-500 transition-transform duration-200',
                      !isExpanded && '-rotate-90',
                    )}
                  />
                  <h2 className="text-sm font-semibold text-slate-300">{ano}</h2>
                  <span className="text-slate-600">·</span>
                  <h2 className="text-sm font-semibold text-primary-300">{componente}</h2>
                  <Badge variant="default">{items.length}</Badge>
                </button>
                {isExpanded && (
                  <div className="space-y-3 px-4 pb-4">
                    {visibleItems.map((q) => (
                    <Card key={q.id} hover>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-medium text-white truncate">{q.title}</h3>
                            <QuestionTypeBadge type={(q.question_type || 'multipla_escolha') as QuestionType} />
                            {q.nivel_dificuldade && (
                              <Badge variant="info">{q.nivel_dificuldade}</Badge>
                            )}
                            {q.is_form_exclusive && (
                              <Badge variant="default">Formulário</Badge>
                            )}
                            {supportsTriScoring((q.question_type || 'multipla_escolha') as QuestionType) &&
                              q.point_value != null &&
                              q.point_value > 0 && (
                                <Badge variant="warning">
                                  {q.point_value} {q.point_value === 1 ? 'pt' : 'pts'}
                                </Badge>
                              )}
                          </div>
                          <p className="text-sm text-slate-400 line-clamp-2">{stripHtml(q.enunciado)}</p>
                          <div className="flex gap-3 mt-2 text-xs text-slate-500">
                            {q.codigo_item && <span>Cód: {q.codigo_item}</span>}
                            <span>{formatDate(q.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => openPreview(q)} title="Visualizar">
                            <Eye size={16} />
                          </Button>
                          <Link to={`/admin/questoes/${q.id}`}>
                            <Button variant="ghost" size="sm">
                              <Pencil size={16} />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(q)}>
                            <Trash2 size={16} className="text-red-400" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                    {hasMore && (
                      <div className="flex justify-center pt-1">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => loadMoreInGroup(key, items.length)}
                        >
                          Ver mais ({items.length - visibleCount} restantes)
                        </Button>
                      </div>
                    )}
                    {!hasMore && items.length > QUESTIONS_PAGE_SIZE && (
                      <p className="text-center text-xs text-slate-500 pt-1">
                        Todas as {items.length} questões exibidas
                      </p>
                    )}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

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
        description="Esta ação remove permanentemente a questão do sistema."
        itemName={deleteTarget?.title}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
