import { useEffect, useState } from 'react'
import { Save, Trash2, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { AlternativeOptionsEditor } from '@/components/questions/AlternativeOptionsEditor'
import { QuestionTypeBadge } from '@/components/forms/QuestionTypePicker'
import { QuestionMetadataFields } from '@/components/forms/QuestionMetadataFields'
import type { BuilderQuestion } from '@/components/forms/builder/types'
import { needsAlternatives, QUESTION_TYPE_LABELS } from '@/types/questionTypes'
import { isRichTextEmpty } from '@/lib/richText'

interface QuestionInspectorProps {
  question: BuilderQuestion | null
  onChange: (updated: BuilderQuestion) => void
  onDelete: () => void
  onSaveQuestion: (question: BuilderQuestion) => Promise<void>
}

function stopBubble(e: React.SyntheticEvent) {
  e.stopPropagation()
}

export function QuestionInspector({
  question,
  onChange,
  onDelete,
  onSaveQuestion,
}: QuestionInspectorProps) {
  const { user, profile } = useAuth()
  const [draft, setDraft] = useState<BuilderQuestion | null>(question)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (question) setDraft(question)
    else setDraft(null)
    setSaveMessage(null)
    setSaveError(null)
  }, [question?.localId])

  if (!question || !draft) {
    return (
      <aside className="w-full xl:w-80 shrink-0 border-l border-white/10 border-t xl:border-t-0 bg-[#0d1220] flex flex-col min-h-0 max-h-80 xl:max-h-none">
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 scrollbar-app">
          <p className="text-sm text-slate-500">
            Selecione uma questão no painel central ou adicione um elemento à esquerda.
          </p>
        </div>
      </aside>
    )
  }

  const canSeeCreatorNotes =
    !draft.createdBy ||
    user?.id === draft.createdBy ||
    profile?.role === 'admin' ||
    profile?.role === 'root'

  const patch = (partial: Partial<BuilderQuestion>) => {
    const next = { ...draft, ...partial }
    setDraft(next)
    onChange(next)
    setSaveMessage(null)
    setSaveError(null)
  }

  const updateAlt = (index: number, text: string) => {
    const alternatives = draft.alternatives.map((a, i) =>
      i === index ? { ...a, text } : a,
    )
    patch({ alternatives })
  }

  const setCorrect = (index: number) => {
    const alternatives = draft.alternatives.map((a, i) => ({
      ...a,
      is_correct: i === index,
    }))
    patch({ alternatives })
  }

  const handleSaveQuestion = async () => {
    setSaveError(null)
    setSaveMessage(null)

    if (isRichTextEmpty(draft.enunciado)) {
      setSaveError('Preencha o enunciado antes de salvar')
      return
    }

    if (
      needsAlternatives(draft.questionType) &&
      !draft.alternatives.some((a) => a.is_correct)
    ) {
      setSaveError('Marque a alternativa correta')
      return
    }

    setSaving(true)
    try {
      await onSaveQuestion(draft)
      setSaveMessage('Questão salva')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar questão')
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside
      className="w-full xl:w-80 shrink-0 border-l border-white/10 border-t xl:border-t-0 bg-[#0d1220] flex flex-col min-h-0 max-h-80 xl:max-h-none"
      onMouseDown={stopBubble}
      onClick={stopBubble}
    >
      <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
        <div>
          <h3 className="font-semibold text-white">Editar Campo</h3>
          <div className="mt-1.5">
            <QuestionTypeBadge type={draft.questionType} />
          </div>
        </div>
        <button type="button" onClick={onDelete} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 scrollbar-app">
        {draft.source === 'bank' && (
          <p className="text-xs text-slate-500 bg-white/5 rounded-lg p-2">
            Questão do banco — alterações de conteúdo e metadados atualizam o item no banco. As
            alternativas compartilhadas não são alteradas aqui.
          </p>
        )}

        <Input
          label="Pergunta / Rótulo"
          value={draft.title}
          onChange={(e) => patch({ title: e.target.value })}
          onPaste={stopBubble}
          onCopy={stopBubble}
          onCut={stopBubble}
        />

        <Textarea
          label="Descrição (Subtítulo)"
          value={draft.description || ''}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="Texto de ajuda opcional"
          onPaste={stopBubble}
          onCopy={stopBubble}
          onCut={stopBubble}
        />

        <RichTextEditor
          label={draft.questionType === 'resultado' ? 'Conteúdo' : 'Enunciado'}
          value={draft.enunciado}
          onChange={(html) => patch({ enunciado: html })}
          minHeight="120px"
          enableImages
          onImageUploadError={setSaveError}
        />

        {needsAlternatives(draft.questionType) ? (
          <AlternativeOptionsEditor
            alternatives={draft.alternatives}
            onChangeText={updateAlt}
            onMarkCorrect={setCorrect}
            stopBubble={stopBubble}
          />
        ) : (
          <p className="text-xs text-slate-500 rounded-lg bg-white/5 p-3">
            Estilo{' '}
            <strong className="text-slate-300">{QUESTION_TYPE_LABELS[draft.questionType]}</strong>{' '}
            — o aluno verá um campo adequado a este tipo.
          </p>
        )}

        {canSeeCreatorNotes && (
          <div className="pt-2 border-t border-white/10 space-y-3">
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-slate-500" />
              <p className="text-sm font-medium text-slate-300">Anotações do criador (privado)</p>
            </div>
            <Textarea
              label="Gabarito, resolução e observações"
              value={draft.creatorNotes || ''}
              onChange={(e) => patch({ creatorNotes: e.target.value })}
              placeholder="Registre a resposta correta, resolução comentada e notas pedagógicas. Somente você e administradores podem ver."
              className="min-h-[100px]"
              onPaste={stopBubble}
              onCopy={stopBubble}
              onCut={stopBubble}
            />
          </div>
        )}

        <QuestionMetadataFields
          metadata={draft.metadata || {}}
          onChange={(metadata) => patch({ metadata })}
          questionType={draft.questionType}
          onPointValueChange={(value) => patch({ pointValue: value })}
        />
      </div>

      <div className="shrink-0 border-t border-white/10 p-4 space-y-2 bg-[#0d1220]">
        {saveError && <p className="text-xs text-red-400">{saveError}</p>}
        {saveMessage && <p className="text-xs text-emerald-400">{saveMessage}</p>}
        <Button
          type="button"
          className="w-full bg-teal-600 hover:bg-teal-500"
          loading={saving}
          onClick={handleSaveQuestion}
        >
          <Save size={16} />
          Salvar questão
        </Button>
      </div>
    </aside>
  )
}
