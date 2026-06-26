export type UserRole = 'root' | 'admin' | 'professor' | 'aluno'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  municipio?: string | null
  school_name?: string | null
  school_id?: string | null
  municipios?: string[] | null
  school_names?: string[] | null
  school_ids?: string[] | null
  turmas?: string[] | null
  created_at: string
}

export interface School {
  id: string
  name: string
  municipio: string
  state_uf: string
  created_at: string
  updated_at: string
}

export interface SchoolClass {
  id: string
  school_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface QuestionAlternative {
  id?: string
  question_id?: string
  letter: string
  text: string
  is_correct: boolean
  image_url?: string | null
  order_index: number
}

export interface Question {
  id: string
  title: string
  enunciado: string
  comando?: string | null
  codigo_item?: string | null
  componente_curricular: string
  conteudo_programatico?: string | null
  ano_serie: string
  descritor_saeb?: string | null
  habilidade_bncc?: string | null
  nivel_bloom?: string | null
  nivel_dificuldade?: string | null
  tempo_medio_resolucao?: number | null
  tipo_texto_base?: string | null
  fonte?: string | null
  image_url?: string | null
  youtube_url?: string | null
  subtitle?: string | null
  question_type?: import('@/types/questionTypes').QuestionType
  param_dificuldade?: number | null
  param_discriminacao?: number | null
  param_acerto_caso?: number | null
  is_form_exclusive?: boolean
  creator_notes?: string | null
  tri_calibrated_at?: string | null
  tri_response_count?: number | null
  point_value?: number
  created_by?: string | null
  created_at: string
  updated_at: string
  alternatives?: QuestionAlternative[]
}

export type FormStatus = 'em_andamento' | 'concluido'
export type FormMode = 'padrao' | 'gamificado'
export type TrailDifficulty = 'facil' | 'medio' | 'dificil'

export interface DifficultyLevel {
  id: string
  name: string
  point_value: number
  order_index: number
  created_at: string
  updated_at: string
}

export interface FormTrailConfig {
  localId: string
  learningTrailId: string
  minPercent: number
  maxPercent: number
  enabled: boolean
  /** Preenchido a partir do banco — somente leitura na UI do formulário */
  title?: string
  description?: string
  pdfUrl?: string
  linkUrl?: string
}

export interface FormTrail {
  id: string
  form_id: string
  learning_trail_id?: string | null
  difficulty?: TrailDifficulty | null
  title?: string | null
  description?: string | null
  min_percent: number
  max_percent: number
  order_index?: number
  pdf_url?: string | null
  link_url?: string | null
  content?: string | null
  created_at: string
  updated_at: string
  learning_trail?: LearningTrail | null
}

export interface Form {
  id: string
  title: string
  description?: string | null
  school_name?: string | null
  componente_curricular?: string
  created_by?: string | null
  is_active: boolean
  status: FormStatus
  expected_students?: number | null
  form_mode: FormMode
  turma: string
  final_screen_title?: string | null
  final_screen_message?: string | null
  design_accent?: string | null
  created_at: string
  questions?: Question[]
  links?: FormLink[]
}

export interface FormLink {
  id: string
  form_id: string
  slug: string
  professor_id: string
  is_active: boolean
  municipio?: string | null
  school_name?: string | null
  turma?: string | null
  available_from?: string | null
  available_until?: string | null
  created_at: string
  form?: Form
}

export type NivelProficiencia = 'inicial' | 'intermediario' | 'avancado'

export interface FormResponse {
  id: string
  form_id: string
  form_link_id?: string | null
  municipio?: string | null
  school_name?: string | null
  turma?: string | null
  student_name: string
  student_email: string
  score?: number | null
  percentual_acerto?: number | null
  theta?: number | null
  nivel_proficiencia?: NivelProficiencia | null
  total_questions?: number | null
  correct_answers?: number | null
  completed_at: string
  answers?: ResponseAnswer[]
}

export interface ResponseAnswer {
  id: string
  response_id: string
  question_id: string
  selected_alternative_id?: string | null
  is_correct?: boolean | null
  question?: Question
  selected_alternative?: QuestionAlternative
}

export interface LearningTrail {
  id: string
  title: string
  description?: string | null
  min_score: number
  max_score: number
  nivel_proficiencia?: NivelProficiencia | null
  pdf_url?: string | null
  link_url?: string | null
  content?: string | null
  pedagogical_content?: string | null
  pedagogical_pdf_url?: string | null
  pedagogical_link_url?: string | null
  pedagogical_objectives?: string | null
  teacher_notes?: string | null
  created_by?: string | null
  created_at: string
}

export interface StudentTrailAssignment {
  id: string
  response_id: string
  trail_id?: string | null
  form_trail_id?: string | null
  assigned_at: string
  trail?: LearningTrail
  form_trail?: FormTrail
}

export interface RegisterUserPayload {
  email: string
  password: string
  full_name: string
  role: UserRole
  municipio?: string
  school_name?: string
  school_id?: string
  municipios?: string[]
  school_names?: string[]
  school_ids?: string[]
  turmas?: string[]
}

export interface UpdateUserPayload {
  user_id: string
  email?: string
  password?: string
  full_name: string
  role: UserRole
  municipio?: string
  school_name?: string
  school_id?: string
  municipios?: string[]
  school_names?: string[]
  school_ids?: string[]
  turmas?: string[]
}

export type SkillBankType = 'bncc' | 'bloom' | 'saeb'

export interface SkillBankItem {
  id: string
  type: SkillBankType
  code: string | null
  label: string
  description: string | null
  topic?: string | null
  bloom_hint?: string | null
  ano_serie?: string | null
  order_index: number
  created_at: string
  updated_at: string
}

export interface SkillBankRelation {
  id: string
  saeb_item_id: string
  bncc_item_id: string
  is_essential: boolean
  created_at: string
  saeb?: SkillBankItem
  bncc?: SkillBankItem
}

export const SKILL_BANK_TYPE_LABELS: Record<SkillBankType, string> = {
  saeb: 'Descritores SAEB',
  bncc: 'Habilidades BNCC',
  bloom: 'Níveis de Bloom',
}

export const ANO_SERIE_MVP = '5º Ano'
export const COMPONENTE_MVP = 'Língua Portuguesa'

export const ROLE_LABELS: Record<UserRole, string> = {
  root: 'Root',
  admin: 'Administrador',
  professor: 'Professor',
  aluno: 'Aluno',
}

export const BLOOM_LEVELS = [
  'Lembrar',
  'Compreender',
  'Aplicar',
  'Analisar',
  'Avaliar',
  'Criar',
]

export const DIFICULDADE_LEVELS = ['Fácil', 'Médio', 'Difícil']

export const TEXTO_BASE_TIPOS = [
  'Narrativo',
  'Descritivo',
  'Dissertativo',
  'Informativo',
  'Poético',
  'Publicitário',
]

export const NIVEL_PROFICIENCIA_OPTIONS: { value: NivelProficiencia; label: string }[] = [
  { value: 'inicial', label: 'Inicial / Emergente' },
  { value: 'intermediario', label: 'Intermediário / Em Desenvolvimento' },
  { value: 'avancado', label: 'Avançado / Consolidado' },
]

export const FORM_STATUS_LABELS: Record<FormStatus, string> = {
  em_andamento: 'Em Andamento',
  concluido: 'Concluída',
}

export const FORM_MODE_LABELS: Record<FormMode, string> = {
  padrao: 'Padrão',
  gamificado: 'Gamificado',
}

export const TURMA_OPTIONS = [
  { value: '5º Ano', label: '5º Ano' },
  { value: '6º Ano', label: '6º Ano' },
  { value: '7º Ano', label: '7º Ano' },
  { value: '8º Ano', label: '8º Ano' },
  { value: '9º Ano', label: '9º Ano' },
]

export const ANO_SERIE_OPTIONS = TURMA_OPTIONS

/** Séries usadas na matriz SAEB de Língua Portuguesa. */
export const SAEB_SERIE_OPTIONS = [
  { value: '5º Ano', label: '5º Ano — Ensino Fundamental' },
  { value: '9º Ano', label: '9º Ano — Ensino Fundamental' },
  { value: '3ª série EM', label: '3ª série — Ensino Médio' },
] as const

export const AREA_OPTIONS = [
  { value: 'Língua Portuguesa', label: 'Língua Portuguesa' },
  { value: 'Matemática', label: 'Matemática' },
  { value: 'Ciências', label: 'Ciências' },
  { value: 'História', label: 'História' },
  { value: 'Geografia', label: 'Geografia' },
  { value: 'Arte', label: 'Arte' },
]

export const COMPONENTE_OPTIONS = AREA_OPTIONS
