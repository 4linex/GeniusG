import type { QuestionAlternative } from '@/types/database'
import { ANO_SERIE_MVP, COMPONENTE_MVP } from '@/types/database'
import { mergeLegacyQuestionImage } from '@/lib/richTextImages'
import { QUESTION_TYPE_LABELS, type QuestionType } from '@/types/questionTypes'

export type BuilderQuestionSource = 'bank' | 'inline'

export interface BuilderQuestionMeta {
  codigo_item?: string
  componente_curricular?: string
  ano_serie?: string
  conteudo_programatico?: string
  descritor_saeb?: string
  habilidade_bncc?: string
  nivel_bloom?: string
  nivel_dificuldade?: string
  tempo_medio_resolucao?: number
  tipo_texto_base?: string
  fonte?: string
}

export function metadataToDbFields(meta: BuilderQuestionMeta = {}) {
  return {
    codigo_item: meta.codigo_item || null,
    componente_curricular: meta.componente_curricular || COMPONENTE_MVP,
    ano_serie: meta.ano_serie || ANO_SERIE_MVP,
    conteudo_programatico: meta.conteudo_programatico || null,
    descritor_saeb: meta.descritor_saeb || null,
    habilidade_bncc: meta.habilidade_bncc || null,
    nivel_bloom: meta.nivel_bloom || null,
    nivel_dificuldade: meta.nivel_dificuldade || null,
    tempo_medio_resolucao: meta.tempo_medio_resolucao ?? null,
    tipo_texto_base: meta.tipo_texto_base || null,
    fonte: meta.fonte || null,
  }
}

export function questionRowToMetadata(q: {
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
}): BuilderQuestionMeta {
  return {
    codigo_item: q.codigo_item || undefined,
    componente_curricular: q.componente_curricular || undefined,
    ano_serie: q.ano_serie || undefined,
    conteudo_programatico: q.conteudo_programatico || undefined,
    descritor_saeb: q.descritor_saeb || undefined,
    habilidade_bncc: q.habilidade_bncc || undefined,
    nivel_bloom: q.nivel_bloom || undefined,
    nivel_dificuldade: q.nivel_dificuldade || undefined,
    tempo_medio_resolucao: q.tempo_medio_resolucao ?? undefined,
    tipo_texto_base: q.tipo_texto_base || undefined,
    fonte: q.fonte || undefined,
  }
}

export interface BuilderQuestion {
  localId: string
  questionId?: string
  source: BuilderQuestionSource
  questionType: QuestionType
  title: string
  enunciado: string
  description?: string
  imageUrl?: string | null
  youtubeUrl?: string | null
  creatorNotes?: string
  createdBy?: string | null
  pointValue?: number
  required: boolean
  alternatives: QuestionAlternative[]
  metadata?: BuilderQuestionMeta
}

export type BuilderTab = 'editor' | 'fluxo' | 'configuracao' | 'trilhas'

export function createLocalId() {
  return crypto.randomUUID()
}

export function createEmptyInlineQuestion(questionType: QuestionType = 'multipla_escolha'): BuilderQuestion {
  const label = QUESTION_TYPE_LABELS[questionType]
  return {
    localId: createLocalId(),
    source: 'inline',
    questionType,
    title: label === 'Múltipla Escolha' ? 'Nova Questão' : label,
    enunciado: '',
    description: '',
    creatorNotes: '',
    pointValue: 1,
    required: questionType !== 'resultado',
    alternatives:
      questionType === 'multipla_escolha'
        ? [
            { letter: 'A', text: 'Opção 1', is_correct: false, order_index: 0 },
            { letter: 'B', text: 'Opção 2', is_correct: false, order_index: 1 },
            { letter: 'C', text: 'Opção 3', is_correct: false, order_index: 2 },
            { letter: 'D', text: 'Opção 4', is_correct: false, order_index: 3 },
          ]
        : [],
    metadata: {
      componente_curricular: COMPONENTE_MVP,
      ano_serie: ANO_SERIE_MVP,
      nivel_dificuldade: 'Médio',
      nivel_bloom: 'Compreender',
    },
  }
}

export function questionToBuilder(q: {
  id: string
  title: string
  enunciado: string
  subtitle?: string | null
  image_url?: string | null
  youtube_url?: string | null
  question_type?: QuestionType | null
  codigo_item?: string | null
  componente_curricular?: string | null
  ano_serie?: string | null
  conteudo_programatico?: string | null
  habilidade_bncc?: string | null
  nivel_bloom?: string | null
  nivel_dificuldade?: string | null
  descritor_saeb?: string | null
  tempo_medio_resolucao?: number | null
  tipo_texto_base?: string | null
  fonte?: string | null
  creator_notes?: string | null
  created_by?: string | null
  point_value?: number | null
}, alternatives: QuestionAlternative[]): BuilderQuestion {
  return {
    localId: createLocalId(),
    questionId: q.id,
    source: 'bank',
    questionType: q.question_type || 'multipla_escolha',
    title: q.title,
    enunciado: mergeLegacyQuestionImage(q.enunciado, q.image_url),
    description: q.subtitle || undefined,
    imageUrl: null,
    youtubeUrl: q.youtube_url || null,
    createdBy: q.created_by || null,
    pointValue: Number(q.point_value ?? 1),
    required: true,
    alternatives,
    metadata: questionRowToMetadata(q),
  }
}
