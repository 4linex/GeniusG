import { X, Lock } from 'lucide-react'
import { StudentQuestionDisplay } from '@/components/questions/StudentQuestionDisplay'
import { cn } from '@/lib/utils'
import { formatDurationLabel } from '@/lib/duration'
import { needsAlternatives, QUESTION_TYPE_LABELS, supportsTriScoring, type QuestionType } from '@/types/questionTypes'
import type { QuestionAlternative } from '@/types/database'

export interface QuestionPreviewMetadata {
  codigo_item?: string | null
  componente_curricular?: string | null
  ano_serie?: string | null
  conteudo_programatico?: string | null
  descritor_saeb?: string | null
  habilidade_bncc?: string | null
  nivel_bloom?: string | null
  nivel_dificuldade?: string | null
  tempo_medio_resolucao?: number | null
  tipo_texto_base?: string | null
  fonte?: string | null
}

export interface QuestionPreviewData {
  title: string
  enunciado: string
  subtitle?: string | null
  questionType: QuestionType
  pointValue?: number | null
  imageUrl?: string | null
  youtubeUrl?: string | null
  alternatives?: QuestionAlternative[]
  metadata?: QuestionPreviewMetadata
  creatorNotes?: string | null
}

const METADATA_LABELS: { key: keyof QuestionPreviewMetadata; label: string }[] = [
  { key: 'codigo_item', label: 'Código do item' },
  { key: 'componente_curricular', label: 'Componente curricular' },
  { key: 'ano_serie', label: 'Ano/Série' },
  { key: 'conteudo_programatico', label: 'Conteúdo programático' },
  { key: 'descritor_saeb', label: 'Descritor SAEB' },
  { key: 'habilidade_bncc', label: 'Habilidade BNCC' },
  { key: 'nivel_bloom', label: 'Nível de Bloom' },
  { key: 'nivel_dificuldade', label: 'Nível de dificuldade' },
  { key: 'tempo_medio_resolucao', label: 'Tempo médio' },
  { key: 'tipo_texto_base', label: 'Tipo de texto-base' },
  { key: 'fonte', label: 'Fonte' },
]

function MetadataSection({ metadata }: { metadata: QuestionPreviewMetadata }) {
  const entries = METADATA_LABELS.filter(({ key }) => {
    const value = metadata[key]
    return value != null && value !== ''
  })

  if (entries.length === 0) return null

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Metadados pedagógicos (somente admin)
      </p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        {entries.map(({ key, label }) => (
          <div key={key}>
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="text-sm text-slate-200">
              {key === 'tempo_medio_resolucao'
                ? formatDurationLabel(metadata.tempo_medio_resolucao)
                : String(metadata[key])}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function CreatorNotesSection({ notes }: { notes: string }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
      <div className="flex items-center gap-2 text-amber-300">
        <Lock size={14} />
        <p className="text-xs font-semibold uppercase tracking-wider">
          Anotações do criador (privado)
        </p>
      </div>
      <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{notes}</p>
    </div>
  )
}

function AdminOnlyDetails({ data }: { data: QuestionPreviewData }) {
  const showPoints =
    supportsTriScoring(data.questionType) && data.pointValue != null

  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-slate-500 space-y-1">
      <p className="font-semibold uppercase tracking-wider text-slate-400">
        Informações internas (não visíveis ao aluno)
      </p>
      <p>Tipo: {QUESTION_TYPE_LABELS[data.questionType]}</p>
      {showPoints && (
        <p>
          Pontuação: {data.pointValue} {data.pointValue === 1 ? 'ponto' : 'pontos'}
        </p>
      )}
      {!needsAlternatives(data.questionType) && (
        <p>Campo de resposta: {QUESTION_TYPE_LABELS[data.questionType]}</p>
      )}
    </div>
  )
}

interface QuestionPreviewProps {
  data: QuestionPreviewData
  className?: string
  /** Exibe bloco de metadados e informações internas (padrão: true para admins) */
  showAdminSections?: boolean
}

export function QuestionPreview({
  data,
  className,
  showAdminSections = true,
}: QuestionPreviewProps) {
  const showAlts = needsAlternatives(data.questionType)

  return (
    <div className={cn('space-y-4', className)}>
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider">
          Como o aluno vê
        </p>

        <StudentQuestionDisplay
          title={data.title}
          subtitle={data.subtitle}
          enunciado={data.enunciado}
          imageUrl={data.imageUrl}
          youtubeUrl={data.youtubeUrl}
        >
          {showAlts && data.alternatives && data.alternatives.length > 0 ? (
            <div className="space-y-2 pt-2">
              {data.alternatives.map((alt) => (
                <div
                  key={alt.letter}
                  className="flex items-start gap-3 p-3 rounded-xl border border-white/10 text-sm text-slate-300"
                >
                  <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">
                    {alt.letter}
                  </span>
                  <span className="pt-1">{alt.text || '—'}</span>
                </div>
              ))}
            </div>
          ) : null}
        </StudentQuestionDisplay>
      </div>

      {showAdminSections && (
        <>
          <AdminOnlyDetails data={data} />
          {data.metadata && <MetadataSection metadata={data.metadata} />}
          {data.creatorNotes?.trim() && (
            <CreatorNotesSection notes={data.creatorNotes.trim()} />
          )}
        </>
      )}
    </div>
  )
}

interface QuestionPreviewModalProps {
  open: boolean
  onClose: () => void
  data: QuestionPreviewData | null
}

export function QuestionPreviewModal({ open, onClose, data }: QuestionPreviewModalProps) {
  if (!open || !data) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-label="Fechar"
      />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Visualizar questão</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>
        <QuestionPreview data={data} />
      </div>
    </div>
  )
}
