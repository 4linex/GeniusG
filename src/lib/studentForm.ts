import { supabase, SUPABASE_FUNCTIONS_URL } from '@/lib/supabase'
import { invokeEdgeFunction } from '@/lib/edgeFunctions'
import { findFormTrailByPercent } from '@/lib/formTrails'
import {
  defaultTriParams,
  processAssessment,
  hasCalibratedTriParams,
  type ScoredResponse,
} from '@/lib/scoring'
import type { FormMode } from '@/types/database'
import { clampScore, clampTheta, clampPointValue, sanitizeItemTriParams } from '@/lib/scoreBounds'
import { dedupeAlternativesByLetter } from '@/lib/questionAlternatives'
import { STUDENT_TRAIL_COLUMNS } from '@/lib/trailAreas'

export interface StudentAssignedTrail {
  title: string
  description?: string | null
  pdf_url?: string | null
  link_url?: string | null
  content?: string | null
}

export interface StudentSubmitResult {
  ok: true
}

export interface StudentAlternative {
  letter: string
  text: string
  image_url?: string | null
  order_index: number
}

export interface StudentQuestion {
  id: string
  title: string
  enunciado: string
  subtitle?: string | null
  image_url?: string | null
  youtube_url?: string | null
  order_index: number
  alternatives: StudentAlternative[]
}

export interface StudentFormConfig {
  form_title: string
  form_mode: FormMode
  design_accent: string
  final_screen_title: string
  final_screen_message: string
  questions: StudentQuestion[]
}

async function loadStudentFormFromDb(slug: string): Promise<StudentFormConfig> {
  const { data: link, error: linkError } = await supabase
    .from('form_links')
    .select(`
      id,
      form_id,
      form:forms(
        title,
        is_active,
        form_mode,
        design_accent,
        final_screen_title,
        final_screen_message
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (linkError || !link) {
    throw new Error('Link inválido ou inativo')
  }

  const rawForm = link.form
  const form = (Array.isArray(rawForm) ? rawForm[0] : rawForm) as {
    title: string
    is_active: boolean
    form_mode: FormMode
    design_accent: string
    final_screen_title: string
    final_screen_message: string
  } | null

  if (!form?.is_active) {
    throw new Error('Formulário inativo')
  }

  const defaults: Omit<StudentFormConfig, 'questions'> = {
    form_title: form.title,
    form_mode: form.form_mode || 'padrao',
    design_accent: form.design_accent || '#14b8a6',
    final_screen_title: form.final_screen_title || 'Obrigado!',
    final_screen_message:
      form.final_screen_message ||
      'Suas respostas foram registradas com sucesso. Seu professor receberá o diagnóstico completo.',
  }

  const { data: formQuestions } = await supabase
    .from('form_questions')
    .select('order_index, question_id')
    .eq('form_id', link.form_id)
    .order('order_index')

  if (!formQuestions?.length) {
    return { ...defaults, questions: [] }
  }

  const questionIds = formQuestions.map((fq) => fq.question_id)

  const { data: questions } = await supabase
    .from('questions')
    .select('id, title, enunciado, subtitle, image_url, youtube_url')
    .in('id', questionIds)

  const { data: alternatives } = await supabase
    .from('question_alternatives')
    .select('question_id, letter, text, image_url, order_index')
    .in('question_id', questionIds)
    .order('order_index')

  const questionMap = new Map((questions || []).map((q) => [q.id, q]))
  const altsByQuestion = new Map<string, typeof alternatives>()

  for (const alt of alternatives || []) {
    const list = altsByQuestion.get(alt.question_id) || []
    list.push(alt)
    altsByQuestion.set(alt.question_id, list)
  }

  const payload: StudentQuestion[] = formQuestions.map((fq) => {
    const q = questionMap.get(fq.question_id)
    return {
      id: fq.question_id,
      title: q?.title || '',
      enunciado: q?.enunciado || '',
      subtitle: q?.subtitle,
      image_url: q?.image_url,
      youtube_url: q?.youtube_url,
      order_index: fq.order_index,
      alternatives: dedupeAlternativesByLetter(altsByQuestion.get(fq.question_id) || []).map((a) => ({
        letter: a.letter,
        text: a.text,
        image_url: a.image_url,
        order_index: a.order_index,
      })),
    }
  })

  return { ...defaults, questions: payload }
}

export async function fetchStudentForm(slug: string): Promise<StudentFormConfig> {
  if (SUPABASE_FUNCTIONS_URL) {
    try {
      return await invokeEdgeFunction<StudentFormConfig>('get-student-form', { slug })
    } catch (err) {
      if (err instanceof Error && err.message.includes('Serviço indisponível')) {
        return loadStudentFormFromDb(slug)
      }
      throw err
    }
  }

  return loadStudentFormFromDb(slug)
}

async function submitStudentFormFromDb(
  slug: string,
  studentName: string,
  studentEmail: string,
  answers: { question_id: string; letter: string }[],
): Promise<StudentSubmitResult> {
  const email = studentEmail.toLowerCase().trim()

  const { data: link } = await supabase
    .from('form_links')
    .select('id, form_id, municipio, school_name, turma')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!link) {
    throw new Error('Link inválido')
  }

  const { data: existing } = await supabase
    .from('form_responses')
    .select('id')
    .eq('form_id', link.form_id)
    .eq('student_email', email)
    .maybeSingle()

  if (existing) {
    throw new Error('Aluno já respondeu este formulário')
  }

  const questionIds = answers.map((a) => a.question_id)

  const { data: questions } = await supabase
    .from('questions')
    .select('id, param_dificuldade, param_discriminacao, param_acerto_caso, tri_calibrated_at, point_value')
    .in('id', questionIds)

  const questionMap = new Map((questions || []).map((q) => [q.id, q]))

  const answerDetails = await Promise.all(
    answers.map(async (a) => {
      const { data: alt } = await supabase
        .from('question_alternatives')
        .select('id, is_correct')
        .eq('question_id', a.question_id)
        .eq('letter', a.letter)
        .order('order_index')
        .limit(1)
        .maybeSingle()

      if (!alt) {
        throw new Error(`Alternativa inválida para questão ${a.question_id}`)
      }

      return {
        question_id: a.question_id,
        selected_alternative_id: alt.id,
        is_correct: alt.is_correct || false,
      }
    }),
  )

  const numAlternatives = 4
  const scoredResponses: ScoredResponse[] = answerDetails.map((a) => {
    const q = questionMap.get(a.question_id)
    const raw = q
      ? {
          a: Number(q.param_discriminacao ?? 1),
          b: Number(q.param_dificuldade ?? 0),
          c: Number(q.param_acerto_caso ?? defaultTriParams(numAlternatives).c),
        }
      : defaultTriParams(numAlternatives)

    return {
      isCorrect: a.is_correct,
      params: sanitizeItemTriParams(raw),
      pointValue: clampPointValue(Number(q?.point_value ?? 1)),
    }
  })

  const usedTri = answerDetails.some((a) => {
    const q = questionMap.get(a.question_id)
    return (
      q?.tri_calibrated_at != null ||
      hasCalibratedTriParams(q?.param_dificuldade, q?.param_discriminacao)
    )
  })

  const assessment = processAssessment(scoredResponses, usedTri)
  const correctCount = assessment.correct

  const { data: response, error: responseError } = await supabase
    .from('form_responses')
    .insert({
      form_id: link.form_id,
      form_link_id: link.id,
      municipio: link.municipio,
      school_name: link.school_name,
      turma: link.turma,
      student_name: studentName.trim(),
      student_email: email,
      score: clampScore(assessment.proficienciaEscala),
      percentual_acerto: clampScore(assessment.percentualAcerto),
      theta: usedTri ? clampTheta(assessment.theta) : null,
      nivel_proficiencia: assessment.nivelProficiencia,
      total_questions: assessment.total,
      correct_answers: correctCount,
    })
    .select('id')
    .single()

  if (responseError) throw responseError

  const { error: answersError } = await supabase.from('response_answers').insert(
    answerDetails.map((a) => ({ ...a, response_id: response.id })),
  )

  if (answersError) throw answersError

  const { data: formTrails } = await supabase
    .from('form_trails')
    .select(`
      id, min_percent, max_percent, title, description, pdf_url, link_url, content, difficulty,
      learning_trail:learning_trails(${STUDENT_TRAIL_COLUMNS})
    `)
    .eq('form_id', link.form_id)
    .order('min_percent')

  const acertoPercent = clampScore(assessment.percentualAcerto)
  const matchedTrail = findFormTrailByPercent(
    (formTrails as {
      id: string
      min_percent: number
      max_percent: number
      title?: string | null
      description?: string | null
      pdf_url?: string | null
      link_url?: string | null
      content?: string | null
      learning_trail?: {
        title?: string
        description?: string | null
        pdf_url?: string | null
        link_url?: string | null
        content?: string | null
      } | null
    }[]) || [],
    acertoPercent,
  )

  if (matchedTrail) {
    await supabase.from('student_trail_assignments').insert({
      response_id: response.id,
      form_trail_id: matchedTrail.id,
    })
  }

  return { ok: true as const }
}

export async function submitStudentForm(
  slug: string,
  studentName: string,
  studentEmail: string,
  answers: { question_id: string; letter: string }[],
): Promise<StudentSubmitResult> {
  if (SUPABASE_FUNCTIONS_URL) {
    try {
      return await invokeEdgeFunction<StudentSubmitResult>('submit-form-response', {
        slug,
        student_name: studentName,
        student_email: studentEmail,
        answers,
      })
    } catch (err) {
      if (err instanceof Error && err.message.includes('Serviço indisponível')) {
        return submitStudentFormFromDb(slug, studentName, studentEmail, answers)
      }
      throw err
    }
  }

  return submitStudentFormFromDb(slug, studentName, studentEmail, answers)
}
