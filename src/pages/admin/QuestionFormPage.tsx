import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { DurationInput } from '@/components/ui/DurationInput'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { Card, CardHeader } from '@/components/ui/Card'
import {
  ANO_SERIE_MVP,
  ANO_SERIE_OPTIONS,
  COMPONENTE_MVP,
  COMPONENTE_OPTIONS,
  type QuestionAlternative,
} from '@/types/database'
import { ensureSkillBankFromQuestionFields } from '@/lib/skillBank'
import { PedagogicalSkillFields } from '@/components/forms/PedagogicalSkillFields'
import { stripHtml } from '@/lib/richText'
import { needsAlternatives, type QuestionType } from '@/types/questionTypes'
import { QuestionTypePicker } from '@/components/forms/QuestionTypePicker'
import { QuestionPreviewModal } from '@/components/questions/QuestionPreview'
import { AlternativeOptionsEditor } from '@/components/questions/AlternativeOptionsEditor'
import { createEmptyInlineQuestion } from '@/components/forms/builder/types'
import { formatDate } from '@/lib/utils'
import { Upload, Eye, Lock } from 'lucide-react'
import { dedupeAlternativesByLetter } from '@/lib/questionAlternatives'
import { getErrorMessage, syncQuestionAlternatives } from '@/lib/syncQuestionAlternatives'
import { difficultyLevelSelectOptions, resolveQuestionPointValue } from '@/lib/difficultyLevels'
import { useDifficultyLevels } from '@/hooks/useDifficultyLevels'

const DEFAULT_ALTERNATIVES: QuestionAlternative[] = [
  { letter: 'A', text: '', is_correct: false, order_index: 0 },
  { letter: 'B', text: '', is_correct: false, order_index: 1 },
  { letter: 'C', text: '', is_correct: false, order_index: 2 },
  { letter: 'D', text: '', is_correct: false, order_index: 3 },
]

export interface QuestionFormPageProps {
  embedded?: boolean
  fixedComponente?: string
  returnPath?: string
  onSaved?: () => void
  onCancel?: () => void
}

export function QuestionFormPage({
  embedded = false,
  fixedComponente,
  returnPath,
  onSaved,
  onCancel,
}: QuestionFormPageProps = {}) {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const isEditing = Boolean(id)
  const resolvedReturnPath =
    returnPath ||
    (location.state as { returnPath?: string } | null)?.returnPath
  const presetComponente =
    fixedComponente ||
    (location.state as { fixedComponente?: string } | null)?.fixedComponente
  const { user, profile } = useAuth()

  const [questionType, setQuestionType] = useState<QuestionType>('multipla_escolha')
  const [title, setTitle] = useState('')
  const [enunciado, setEnunciado] = useState('')
  const [codigoItem, setCodigoItem] = useState('')
  const [componenteCurricular, setComponenteCurricular] = useState(COMPONENTE_MVP)
  const [anoSerie, setAnoSerie] = useState(ANO_SERIE_MVP)
  const [conteudoProgramatico, setConteudoProgramatico] = useState('')
  const [descritorSaeb, setDescritorSaeb] = useState('')
  const [habilidadeBncc, setHabilidadeBncc] = useState('')
  const [nivelBloom, setNivelBloom] = useState('')
  const [nivelDificuldade, setNivelDificuldade] = useState('')
  const [tempoMedio, setTempoMedio] = useState<number | null>(null)
  const [tipoTextoBase, setTipoTextoBase] = useState('')
  const [fonte, setFonte] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [creatorNotes, setCreatorNotes] = useState('')
  const [createdBy, setCreatedBy] = useState<string | null>(null)
  const [triCalibratedAt, setTriCalibratedAt] = useState<string | null>(null)
  const [triResponseCount, setTriResponseCount] = useState(0)
  const [paramDificuldade, setParamDificuldade] = useState<number | null>(null)
  const [paramDiscriminacao, setParamDiscriminacao] = useState<number | null>(null)
  const [paramAcertoCaso, setParamAcertoCaso] = useState<number | null>(null)
  const [alternatives, setAlternatives] = useState<QuestionAlternative[]>(DEFAULT_ALTERNATIVES)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)

  const canSeeCreatorNotes =
    !isEditing ||
    !createdBy ||
    user?.id === createdBy ||
    profile?.role === 'admin' ||
    profile?.role === 'root'

  const { levels: difficultyLevels } = useDifficultyLevels()
  const handleNivelDificuldadeChange = (value: string) => {
    setNivelDificuldade(value)
  }

  useEffect(() => {
    if (presetComponente) {
      setComponenteCurricular(presetComponente)
    }
  }, [presetComponente])

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const { data: question } = await supabase
        .from('questions')
        .select('*')
        .eq('id', id)
        .single()

      if (question) {
        setQuestionType(question.question_type || 'multipla_escolha')
        setTitle(question.title)
        setEnunciado(question.enunciado)
        setCodigoItem(question.codigo_item || '')
        setComponenteCurricular(question.componente_curricular || COMPONENTE_MVP)
        setAnoSerie(question.ano_serie || ANO_SERIE_MVP)
        setConteudoProgramatico(question.conteudo_programatico || '')
        setDescritorSaeb(question.descritor_saeb || '')
        setHabilidadeBncc(question.habilidade_bncc || '')
        setNivelBloom(question.nivel_bloom || '')
        setNivelDificuldade(question.nivel_dificuldade || '')
        setTempoMedio(question.tempo_medio_resolucao ?? null)
        setTipoTextoBase(question.tipo_texto_base || '')
        setFonte(question.fonte || '')
        setImageUrl(question.image_url || '')
        setCreatedBy(question.created_by || null)
        setTriCalibratedAt(question.tri_calibrated_at || null)
        setTriResponseCount(question.tri_response_count ?? 0)
        setParamDificuldade(question.param_dificuldade ?? null)
        setParamDiscriminacao(question.param_discriminacao ?? null)
        setParamAcertoCaso(question.param_acerto_caso ?? null)

        const isOwner =
          user?.id === question.created_by ||
          profile?.role === 'admin' ||
          profile?.role === 'root'
        if (isOwner) {
          setCreatorNotes(question.creator_notes || '')
        }
      }

      const { data: alts } = await supabase
        .from('question_alternatives')
        .select('*')
        .eq('question_id', id)
        .order('order_index')

      if (alts && alts.length > 0) {
        setAlternatives(dedupeAlternativesByLetter(alts as QuestionAlternative[]))
      }
    }
    load()
  }, [id, user, profile])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `questions/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('question-images')
      .upload(path, file)

    if (uploadError) {
      setError('Erro ao fazer upload da imagem')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('question-images')
      .getPublicUrl(path)

    setImageUrl(publicUrl)
    setUploading(false)
  }

  const addAlternative = () => {
    const nextLetter = String.fromCharCode(65 + alternatives.length)
    setAlternatives([
      ...alternatives,
      { letter: nextLetter, text: '', is_correct: false, order_index: alternatives.length },
    ])
  }

  const removeAlternative = (index: number) => {
    if (alternatives.length <= 2) return
    setAlternatives(alternatives.filter((_, i) => i !== index))
  }

  const setCorrectAlternative = (index: number) => {
    setAlternatives(
      alternatives.map((alt, i) => ({ ...alt, is_correct: i === index })),
    )
  }

  const handleTypeChange = (type: QuestionType) => {
    setQuestionType(type)
    if (!needsAlternatives(type)) {
      setAlternatives([])
    } else if (alternatives.length === 0) {
      setAlternatives(createEmptyInlineQuestion('multipla_escolha').alternatives)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!stripHtml(enunciado).trim()) {
      setError('Enunciado é obrigatório')
      return
    }

    if (!habilidadeBncc.trim()) {
      setError('Habilidade BNCC é obrigatória')
      return
    }

    if (!nivelBloom) {
      setError('Nível cognitivo (Bloom) é obrigatório')
      return
    }

    if (needsAlternatives(questionType)) {
      if (!alternatives.some((a) => a.is_correct)) {
        setError('Selecione a alternativa correta')
        return
      }

      if (alternatives.some((a) => !a.text.trim())) {
        setError('Preencha todas as alternativas')
        return
      }
    }

    setLoading(true)

    try {
      await ensureSkillBankFromQuestionFields({
        descritor_saeb: descritorSaeb,
        habilidade_bncc: habilidadeBncc,
        nivel_bloom: nivelBloom,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar banco de habilidades')
      setLoading(false)
      return
    }

    const questionData: Record<string, unknown> = {
      title,
      enunciado,
      question_type: questionType,
      point_value: resolveQuestionPointValue(questionType, nivelDificuldade, difficultyLevels),
      codigo_item: codigoItem || null,
      componente_curricular: componenteCurricular,
      conteudo_programatico: conteudoProgramatico || null,
      ano_serie: anoSerie,
      descritor_saeb: descritorSaeb || null,
      habilidade_bncc: habilidadeBncc || null,
      nivel_bloom: nivelBloom || null,
      nivel_dificuldade: nivelDificuldade || null,
      tempo_medio_resolucao: tempoMedio,
      tipo_texto_base: tipoTextoBase || null,
      fonte: fonte || null,
      image_url: imageUrl || null,
      updated_at: new Date().toISOString(),
    }

    if (canSeeCreatorNotes) {
      questionData.creator_notes = creatorNotes || null
    }

    if (!isEditing) {
      questionData.created_by = user?.id
    }

    try {
      let questionId = id

      if (isEditing && id) {
        const { error: updateError } = await supabase.from('questions').update(questionData).eq('id', id)
        if (updateError) throw updateError
        questionId = id
      } else {
        const { data, error: insertError } = await supabase
          .from('questions')
          .insert(questionData)
          .select('id')
          .single()

        if (insertError) throw insertError
        questionId = data.id
      }

      if (needsAlternatives(questionType) && alternatives.length > 0) {
        await syncQuestionAlternatives(questionId!, alternatives)
      }

      if (embedded && onSaved) {
        onSaved()
      } else if (resolvedReturnPath) {
        navigate(resolvedReturnPath)
      } else {
        navigate('/admin/questoes')
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao salvar questão'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {!embedded && (
        <CardHeader
          title={isEditing ? 'Editar Questão' : 'Nova Questão'}
          description="Cadastro modular — metadados completos para administração"
          action={
            <Button type="button" variant="secondary" size="sm" onClick={() => setPreviewOpen(true)}>
              <Eye size={16} />
              Visualizar
            </Button>
          }
        />
      )}

      {embedded && (
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Escrever nova questão</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Componente: <span className="text-slate-300">{presetComponente}</span>
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => setPreviewOpen(true)}>
            <Eye size={16} />
            Visualizar
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6 items-start">
          <Card className="xl:sticky xl:top-8">
            <QuestionTypePicker value={questionType} onChange={handleTypeChange} />
          </Card>

          <div className="space-y-6">
            <Card>
              <h3 className="text-sm font-semibold text-primary-300 mb-4">Conteúdo da Questão</h3>
              <div className="space-y-4">
                <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
                <RichTextEditor
                  label="Enunciado"
                  value={enunciado}
                  onChange={setEnunciado}
                  minHeight="140px"
                />

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Imagem (opcional)
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors">
                        <Upload size={16} />
                        {uploading ? 'Enviando...' : 'Upload de imagem'}
                      </span>
                    </label>
                    {imageUrl && (
                      <img src={imageUrl} alt="Preview" className="h-16 rounded-lg object-cover" />
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {needsAlternatives(questionType) && (
              <Card>
                <AlternativeOptionsEditor
                  alternatives={alternatives}
                  onChangeText={(index, text) => {
                    const updated = [...alternatives]
                    updated[index] = { ...updated[index], text }
                    setAlternatives(updated)
                  }}
                  onMarkCorrect={setCorrectAlternative}
                  onRemove={removeAlternative}
                  onAdd={addAlternative}
                />
              </Card>
            )}

            {canSeeCreatorNotes && (
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Lock size={16} className="text-slate-500" />
                  <h3 className="text-sm font-semibold text-primary-300">
                    Anotações do criador (privado)
                  </h3>
                </div>
                <Textarea
                  label="Gabarito, resolução e observações"
                  value={creatorNotes}
                  onChange={(e) => setCreatorNotes(e.target.value)}
                  placeholder="Registre a resposta correta, resolução comentada e notas pedagógicas. Somente você e administradores podem ver este campo."
                  className="min-h-[120px]"
                />
              </Card>
            )}

            <Card>
              <h3 className="text-sm font-semibold text-primary-300 mb-4">Metadados Pedagógicos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Código do item" value={codigoItem} onChange={(e) => setCodigoItem(e.target.value)} />
                <Select
                  label="Componente curricular"
                  value={componenteCurricular}
                  onChange={(e) => setComponenteCurricular(e.target.value)}
                  options={COMPONENTE_OPTIONS}
                  disabled={Boolean(presetComponente)}
                />
                <Textarea
                  label="Conteúdo programático"
                  value={conteudoProgramatico}
                  onChange={(e) => setConteudoProgramatico(e.target.value)}
                  className="min-h-[56px] max-h-[80px]"
                  rows={2}
                />
                <Select
                  label="Ano/Série"
                  value={anoSerie}
                  onChange={(e) => setAnoSerie(e.target.value)}
                  options={ANO_SERIE_OPTIONS}
                />
                <PedagogicalSkillFields
                  descritorSaeb={descritorSaeb}
                  habilidadeBncc={habilidadeBncc}
                  nivelBloom={nivelBloom}
                  onDescritorSaebChange={setDescritorSaeb}
                  onHabilidadeBnccChange={setHabilidadeBncc}
                  onNivelBloomChange={setNivelBloom}
                  bnccRequired
                  bloomRequired
                />
                <Select
                  label="Nível de dificuldade"
                  value={nivelDificuldade}
                  onChange={(e) => handleNivelDificuldadeChange(e.target.value)}
                  options={difficultyLevelSelectOptions(difficultyLevels)}
                />
                <DurationInput
                  label="Tempo médio de resolução"
                  value={tempoMedio}
                  onChange={setTempoMedio}
                />
                <Input
                  label="Tipo de texto-base"
                  value={tipoTextoBase}
                  onChange={(e) => setTipoTextoBase(e.target.value)}
                  placeholder="Ex: Narrativo, Informativo, Poema..."
                />
                <Input label="Fonte" value={fonte} onChange={(e) => setFonte(e.target.value)} />
              </div>
            </Card>

            {triCalibratedAt && (
              <Card>
                <h3 className="text-sm font-semibold text-primary-300 mb-3">
                  Parâmetros TRI (calculados automaticamente)
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Calibrado em {formatDate(triCalibratedAt)} com base em {triResponseCount} resposta(s)
                  coletada(s) após aplicação do formulário.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-slate-500 text-xs mb-1">Dificuldade (b)</p>
                    <p className="text-white font-mono">{paramDificuldade?.toFixed(2) ?? '—'}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-slate-500 text-xs mb-1">Discriminação (a)</p>
                    <p className="text-white font-mono">{paramDiscriminacao?.toFixed(2) ?? '—'}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-slate-500 text-xs mb-1">Acerto ao acaso (c)</p>
                    <p className="text-white font-mono">{paramAcertoCaso?.toFixed(2) ?? '—'}</p>
                  </div>
                </div>
              </Card>
            )}

            {!triCalibratedAt && needsAlternatives(questionType) && (
              <p className="text-xs text-slate-500 px-1">
                Os parâmetros TRI serão calculados automaticamente após os alunos responderem os formulários que
                contêm esta questão.
              </p>
            )}

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button type="submit" loading={loading}>
                {isEditing ? 'Salvar Alterações' : 'Cadastrar Questão'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setPreviewOpen(true)}>
                <Eye size={16} />
                Visualizar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (embedded && onCancel) onCancel()
                  else if (resolvedReturnPath) navigate(resolvedReturnPath)
                  else navigate('/admin/questoes')
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </form>

      <QuestionPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        data={{
          title,
          enunciado,
          questionType,
          imageUrl,
          alternatives: needsAlternatives(questionType) ? alternatives : [],
          metadata: {
            codigo_item: codigoItem,
            componente_curricular: componenteCurricular,
            ano_serie: anoSerie,
            conteudo_programatico: conteudoProgramatico,
            descritor_saeb: descritorSaeb,
            habilidade_bncc: habilidadeBncc,
            nivel_bloom: nivelBloom,
            nivel_dificuldade: nivelDificuldade,
            tempo_medio_resolucao: tempoMedio ?? undefined,
            tipo_texto_base: tipoTextoBase,
            fonte,
          },
          pointValue: resolveQuestionPointValue(questionType, nivelDificuldade, difficultyLevels),
          creatorNotes: canSeeCreatorNotes ? creatorNotes : undefined,
        }}
      />
    </div>
  )
}
