import type { LucideIcon } from 'lucide-react'
import {
  AlignLeft,
  BarChart3,
  Calendar,
  CheckSquare,
  FileUp,
  GripVertical,
  ListOrdered,
  Mail,
  Phone,
  SlidersHorizontal,
  Sparkles,
  Star,
  Type,
} from 'lucide-react'

export type QuestionType =
  | 'texto_curto'
  | 'texto_longo'
  | 'multipla_escolha'
  | 'avaliacao'
  | 'escala_likert'
  | 'nps'
  | 'ranking'
  | 'slider'
  | 'email'
  | 'telefone'
  | 'data'
  | 'upload_arquivo'
  | 'resultado'

export interface QuestionTypeOption {
  value: QuestionType
  label: string
  icon: LucideIcon
  description?: string
}

export const QUESTION_TYPE_OPTIONS: QuestionTypeOption[] = [
  { value: 'texto_curto', label: 'Texto Curto', icon: Type, description: 'Resposta em uma linha' },
  { value: 'texto_longo', label: 'Texto Longo', icon: AlignLeft, description: 'Resposta dissertativa' },
  { value: 'multipla_escolha', label: 'Múltipla Escolha', icon: CheckSquare, description: 'Alternativas A, B, C, D' },
  { value: 'avaliacao', label: 'Avaliação', icon: Star, description: 'Escala com estrelas' },
  { value: 'escala_likert', label: 'Escala Likert', icon: ListOrdered, description: 'Concordo / discordo' },
  { value: 'nps', label: 'NPS', icon: BarChart3, description: 'Nota de 0 a 10' },
  { value: 'ranking', label: 'Ranking', icon: GripVertical, description: 'Ordenar opções' },
  { value: 'slider', label: 'Slider', icon: SlidersHorizontal, description: 'Valor em faixa' },
  { value: 'email', label: 'E-mail', icon: Mail, description: 'Campo de e-mail' },
  { value: 'telefone', label: 'Telefone', icon: Phone, description: 'Campo de telefone' },
  { value: 'data', label: 'Data', icon: Calendar, description: 'Seletor de data' },
  { value: 'upload_arquivo', label: 'Upload de Arquivo', icon: FileUp, description: 'Envio de arquivo' },
  { value: 'resultado', label: 'Resultado', icon: Sparkles, description: 'Tela ou bloco informativo' },
]

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = Object.fromEntries(
  QUESTION_TYPE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<QuestionType, string>

export function needsAlternatives(type: QuestionType): boolean {
  return type === 'multipla_escolha'
}

export function supportsTriScoring(type: QuestionType): boolean {
  return type === 'multipla_escolha'
}

export function getQuestionTypeOption(type: QuestionType): QuestionTypeOption {
  return QUESTION_TYPE_OPTIONS.find((o) => o.value === type) ?? QUESTION_TYPE_OPTIONS[2]
}
