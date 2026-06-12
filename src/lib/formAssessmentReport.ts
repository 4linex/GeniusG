import { supabase } from '@/lib/supabase'
import type { NivelProficiencia } from '@/types/database'

export interface FormAssessmentSummary {
  formId: string
  title: string
  turma: string | null
  totalResponses: number
  averageTct: number
  averageTheta: number | null
  byNivel: Record<NivelProficiencia, number>
}

export interface FormStudentRow {
  id: string
  student_name: string
  student_email: string
  percentual_acerto: number | null
  theta: number | null
  nivel_proficiencia: NivelProficiencia | null
  correct_answers: number | null
  total_questions: number | null
  completed_at: string
}

export interface SkillBreakdownRow {
  key: string
  label: string
  total: number
  correct: number
  percentage: number
}

export interface TriFormChartRow {
  formId: string
  title: string
  averageTheta: number | null
  averageTct: number
  totalResponses: number
}

export interface WrongAnswerAlternative {
  letter: string
  text: string
  is_correct: boolean
  order_index: number
}

export interface WrongAnswerRow {
  questionId: string
  title: string
  enunciado: string
  subtitle?: string | null
  image_url?: string | null
  selectedLetter: string | null
  selectedText: string | null
  correctLetter: string | null
  correctText: string | null
  habilidade_bncc: string | null
  nivel_bloom: string | null
  alternatives: WrongAnswerAlternative[]
}

const NIVEL_EMPTY: Record<NivelProficiencia, number> = {
  inicial: 0,
  intermediario: 0,
  avancado: 0,
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

function avgTheta(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null)
  if (nums.length === 0) return null
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100
}

export async function loadFormAssessmentDetail(formId: string) {
  const { data: form, error: formError } = await supabase
    .from('forms')
    .select('id, title, turma, created_at')
    .eq('id', formId)
    .single()

  if (formError || !form) return null

  const { data: responses, error: respError } = await supabase
    .from('form_responses')
    .select(
      'id, student_name, student_email, percentual_acerto, theta, nivel_proficiencia, correct_answers, total_questions, completed_at',
    )
    .eq('form_id', formId)
    .order('completed_at', { ascending: false })

  if (respError) throw respError

  const list = responses || []
  const tctScores = list.map((r) => r.percentual_acerto).filter((s): s is number => s != null)

  const byNivel = { ...NIVEL_EMPTY }
  for (const r of list) {
    const n = r.nivel_proficiencia as NivelProficiencia | null
    if (n && n in byNivel) byNivel[n]++
  }

  const summary: FormAssessmentSummary = {
    formId: form.id,
    title: form.title,
    turma: form.turma,
    totalResponses: list.length,
    averageTct: avg(tctScores),
    averageTheta: avgTheta(list.map((r) => r.theta)),
    byNivel,
  }

  const students: FormStudentRow[] = list.map((r) => ({
    id: r.id,
    student_name: r.student_name,
    student_email: r.student_email,
    percentual_acerto: r.percentual_acerto,
    theta: r.theta,
    nivel_proficiencia: r.nivel_proficiencia as NivelProficiencia | null,
    correct_answers: r.correct_answers,
    total_questions: r.total_questions,
    completed_at: r.completed_at,
  }))

  let bnccSkills: SkillBreakdownRow[] = []
  let bloomSkills: SkillBreakdownRow[] = []

  if (list.length > 0) {
    const { data: answers } = await supabase
      .from('response_answers')
      .select('is_correct, question:questions(habilidade_bncc, descritor_saeb, nivel_bloom)')
      .in(
        'response_id',
        list.map((r) => r.id),
      )

    const byHabilidade = new Map<string, { total: number; correct: number }>()
    const byBloom = new Map<string, { total: number; correct: number }>()

    for (const a of answers || []) {
      const q = a.question as unknown as {
        habilidade_bncc: string | null
        descritor_saeb: string | null
        nivel_bloom: string | null
      } | null

      const habKey = q?.habilidade_bncc || q?.descritor_saeb || 'Sem habilidade'
      const hab = byHabilidade.get(habKey) || { total: 0, correct: 0 }
      hab.total++
      if (a.is_correct) hab.correct++
      byHabilidade.set(habKey, hab)

      const bloomKey = q?.nivel_bloom || 'Sem nível Bloom'
      const bloom = byBloom.get(bloomKey) || { total: 0, correct: 0 }
      bloom.total++
      if (a.is_correct) bloom.correct++
      byBloom.set(bloomKey, bloom)
    }

    const toRows = (map: Map<string, { total: number; correct: number }>) =>
      Array.from(map.entries())
        .map(([key, s]) => ({
          key,
          label: key,
          total: s.total,
          correct: s.correct,
          percentage: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
        }))
        .sort((a, b) => a.percentage - b.percentage)

    bnccSkills = toRows(byHabilidade)
    bloomSkills = toRows(byBloom)
  }

  return { form, summary, students, bnccSkills, bloomSkills }
}

export async function loadStudentResponseDetail(formId: string, responseId: string) {
  const { data: response, error } = await supabase
    .from('form_responses')
    .select(
      `
      id, form_id, student_name, student_email, percentual_acerto, theta, nivel_proficiencia,
      correct_answers, total_questions, completed_at,
      form:forms(title)
    `,
    )
    .eq('id', responseId)
    .eq('form_id', formId)
    .single()

  if (error || !response) return null

  const { data: answers } = await supabase
    .from('response_answers')
    .select(
      `
      is_correct,
      selected_alternative:question_alternatives(letter, text),
      question:questions(
        id, title, enunciado, subtitle, image_url, habilidade_bncc, nivel_bloom,
        alternatives:question_alternatives(letter, text, is_correct, order_index)
      )
    `,
    )
    .eq('response_id', responseId)

  const wrongAnswers: WrongAnswerRow[] = []
  let correctCount = 0

  for (const a of answers || []) {
    if (a.is_correct) {
      correctCount++
      continue
    }

    const q = a.question as unknown as {
      id: string
      title: string
      enunciado: string
      subtitle?: string | null
      image_url?: string | null
      habilidade_bncc: string | null
      nivel_bloom: string | null
      alternatives: WrongAnswerAlternative[]
    } | null

    const selected = a.selected_alternative as unknown as { letter: string; text: string } | null
    const alternatives = [...(q?.alternatives || [])].sort((x, y) => x.order_index - y.order_index)
    const correctAlt = alternatives.find((alt) => alt.is_correct)

    wrongAnswers.push({
      questionId: q?.id || '',
      title: q?.title || 'Questão',
      enunciado: q?.enunciado || '',
      subtitle: q?.subtitle ?? null,
      image_url: q?.image_url ?? null,
      selectedLetter: selected?.letter ?? null,
      selectedText: selected?.text ?? null,
      correctLetter: correctAlt?.letter ?? null,
      correctText: correctAlt?.text ?? null,
      habilidade_bncc: q?.habilidade_bncc ?? null,
      nivel_bloom: q?.nivel_bloom ?? null,
      alternatives,
    })
  }

  return {
    response,
    formTitle: (response.form as unknown as { title: string } | null)?.title || 'Formulário',
    wrongAnswers,
    correctCount,
    totalAnswered: (answers || []).length,
  }
}

export async function loadTriByFormChart(scopedFormIds: string[] | null): Promise<TriFormChartRow[]> {
  let formsQuery = supabase.from('forms').select('id, title').order('title')

  if (scopedFormIds) {
    if (scopedFormIds.length === 0) return []
    formsQuery = formsQuery.in('id', scopedFormIds)
  }

  const { data: forms } = await formsQuery
  if (!forms?.length) return []

  let responsesQuery = supabase
    .from('form_responses')
    .select('form_id, percentual_acerto, theta')

  const formIds = forms.map((f) => f.id)
  responsesQuery = responsesQuery.in('form_id', formIds)

  const { data: responses } = await responsesQuery
  if (!responses?.length) return []

  const byForm = new Map<string, { tct: number[]; theta: (number | null)[] }>()
  for (const r of responses) {
    const cur = byForm.get(r.form_id) || { tct: [], theta: [] }
    if (r.percentual_acerto != null) cur.tct.push(r.percentual_acerto)
    cur.theta.push(r.theta)
    byForm.set(r.form_id, cur)
  }

  return forms
    .map((f) => {
      const stats = byForm.get(f.id)
      if (!stats) return null
      return {
        formId: f.id,
        title: f.title,
        averageTct: avg(stats.tct),
        averageTheta: avgTheta(stats.theta),
        totalResponses: stats.tct.length,
      }
    })
    .filter((row): row is TriFormChartRow => row != null && row.totalResponses > 0)
    .sort((a, b) => (b.averageTheta ?? -999) - (a.averageTheta ?? -999))
}
