import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  defaultTriParams,
  processAssessment,
  hasCalibratedTriParams,
  type ScoredResponse,
} from '../_shared/scoring.ts'
import { estimateItemParamsFromResponses } from '../_shared/itemCalibration.ts'
import { clampScore, clampTheta, clampPointValue, sanitizeItemTriParams } from '../_shared/scoreBounds.ts'
import { findFormTrailByPercent } from '../_shared/formTrails.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { slug, student_name, student_email, answers } = await req.json()

    if (!slug || !student_name || !student_email || !answers?.length) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: slug, student_name, student_email, answers' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const email = student_email.toLowerCase().trim()

    const { data: link } = await supabase
      .from('form_links')
      .select('id, form_id')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (!link) {
      return new Response(
        JSON.stringify({ error: 'Link inválido' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: existing } = await supabase
      .from('form_responses')
      .select('id')
      .eq('form_id', link.form_id)
      .eq('student_email', email)
      .maybeSingle()

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Aluno já respondeu este formulário' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const questionIds = answers.map((a: { question_id: string }) => a.question_id)

    const { data: questions } = await supabase
      .from('questions')
      .select('id, param_dificuldade, param_discriminacao, param_acerto_caso, tri_calibrated_at, point_value')
      .in('id', questionIds)

    const questionMap = new Map(
      (questions || []).map((q) => [q.id, q]),
    )

    const answerDetails = await Promise.all(
      answers.map(async (a: {
        question_id: string
        selected_alternative_id?: string
        letter?: string
      }) => {
        let alt: { id: string; is_correct: boolean } | null = null

        if (a.selected_alternative_id) {
          const { data } = await supabase
            .from('question_alternatives')
            .select('id, is_correct')
            .eq('id', a.selected_alternative_id)
            .single()
          alt = data
        } else if (a.letter) {
          const { data } = await supabase
            .from('question_alternatives')
            .select('id, is_correct')
            .eq('question_id', a.question_id)
            .eq('letter', a.letter)
            .order('order_index')
            .limit(1)
            .maybeSingle()
          alt = data
        }

        if (!alt) throw new Error(`Alternativa inválida para questão ${a.question_id}`)

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
      const q = questionMap.get(a.question_id) as {
        param_dificuldade?: number | null
        param_discriminacao?: number | null
        tri_calibrated_at?: string | null
      } | undefined
      return (
        q?.tri_calibrated_at != null ||
        hasCalibratedTriParams(q?.param_dificuldade, q?.param_discriminacao)
      )
    })
    const assessment = processAssessment(scoredResponses, usedTri)
    const correctCount = assessment.correct
    const totalCount = assessment.total

    const { data: response, error: responseError } = await supabase
      .from('form_responses')
      .insert({
        form_id: link.form_id,
        form_link_id: link.id,
        student_name: student_name.trim(),
        student_email: email,
        score: clampScore(assessment.proficienciaEscala),
        percentual_acerto: clampScore(assessment.percentualAcerto),
        theta: usedTri ? clampTheta(assessment.theta) : null,
        nivel_proficiencia: assessment.nivelProficiencia,
        total_questions: totalCount,
        correct_answers: correctCount,
      })
      .select('id')
      .single()

    if (responseError) throw responseError

    await supabase.from('response_answers').insert(
      answerDetails.map((a) => ({ ...a, response_id: response.id })),
    )

    for (const questionId of [...new Set(questionIds)]) {
      await recalibrateQuestion(supabase, questionId)
    }

    const { data: formTrails } = await supabase
      .from('form_trails')
      .select('id, min_percent, max_percent')
      .eq('form_id', link.form_id)
      .order('min_percent')

    const acertoPercent = clampScore(assessment.percentualAcerto)
    const matchedTrail = findFormTrailByPercent(formTrails || [], acertoPercent)

    // Trilha registrada para o professor — não exposta ao aluno na resposta
    if (matchedTrail) {
      await supabase.from('student_trail_assignments').insert({
        response_id: response.id,
        form_trail_id: matchedTrail.id,
      })
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

async function recalibrateQuestion(
  supabase: ReturnType<typeof createClient>,
  questionId: string,
) {
  const { data: alts } = await supabase
    .from('question_alternatives')
    .select('id')
    .eq('question_id', questionId)

  const numAlternatives = Math.max(2, alts?.length || 4)

  const { data: answers } = await supabase
    .from('response_answers')
    .select(`
      is_correct,
      response:form_responses(correct_answers, total_questions)
    `)
    .eq('question_id', questionId)

  if (!answers?.length) return

  const correctCount = answers.filter((a) => a.is_correct).length
  const itemScores: number[] = []
  const testScores: number[] = []

  for (const a of answers) {
    const resp = a.response as { correct_answers: number; total_questions: number } | null
    if (!resp?.total_questions) continue
    itemScores.push(a.is_correct ? 1 : 0)
    testScores.push(resp.correct_answers / resp.total_questions)
  }

  const params = estimateItemParamsFromResponses(
    correctCount,
    answers.length,
    numAlternatives,
    itemScores.length >= 3 ? itemScores : undefined,
    testScores.length >= 3 ? testScores : undefined,
  )

  const safeParams = sanitizeItemTriParams(params)

  await supabase
    .from('questions')
    .update({
      param_dificuldade: safeParams.b,
      param_discriminacao: safeParams.a,
      param_acerto_caso: safeParams.c,
      tri_calibrated_at: new Date().toISOString(),
      tri_response_count: answers.length,
    })
    .eq('id', questionId)
}
