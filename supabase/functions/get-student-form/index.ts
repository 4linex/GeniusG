import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { dedupeAlternativesByLetter } from '../_shared/questionAlternatives.ts'
import {
  getFormLinkAvailability,
  getFormLinkAvailabilityError,
} from '../_shared/formLinkAvailability.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { slug } = await req.json()

    if (!slug) {
      return new Response(JSON.stringify({ error: 'Slug obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: link } = await supabase
      .from('form_links')
      .select(`
        id,
        form_id,
        available_from,
        available_until,
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

    if (!link) {
      return new Response(JSON.stringify({ error: 'Link inválido ou inativo' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const availability = getFormLinkAvailability(link)
    if (availability !== 'available') {
      return new Response(
        JSON.stringify({
          error: getFormLinkAvailabilityError(link) || 'Formulário indisponível',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const form = link.form as {
      title: string
      is_active: boolean
      form_mode: string
      design_accent: string
      final_screen_title: string
      final_screen_message: string
    } | null
    if (!form?.is_active) {
      return new Response(JSON.stringify({ error: 'Formulário inativo' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: formQuestions } = await supabase
      .from('form_questions')
      .select('order_index, question_id')
      .eq('form_id', link.form_id)
      .order('order_index')

    if (!formQuestions?.length) {
      return new Response(
        JSON.stringify({
          form_title: form.title,
          form_mode: form.form_mode || 'padrao',
          design_accent: form.design_accent || '#14b8a6',
          final_screen_title: form.final_screen_title || 'Obrigado!',
          final_screen_message: form.final_screen_message || 'Suas respostas foram registradas com sucesso.',
          questions: [],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
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

    const payload = formQuestions.map((fq) => {
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

    return new Response(
      JSON.stringify({
        form_title: form.title,
        form_mode: form.form_mode || 'padrao',
        design_accent: form.design_accent || '#14b8a6',
        final_screen_title: form.final_screen_title || 'Obrigado!',
        final_screen_message:
          form.final_screen_message ||
          'Suas respostas foram registradas com sucesso. Seu professor receberá o diagnóstico completo.',
        questions: payload,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
