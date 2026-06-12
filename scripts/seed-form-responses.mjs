/**
 * Registra respostas fictícias em um formulário (via edge function submit-form-response).
 * Uso: npm run seed:form-responses -- k6so46o9bx
 *      npm run seed:form-responses -- k6so46o9bx 55
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const slug = process.argv[2] || 'k6so46o9bx'
const targetTotal = parseInt(process.argv[3] || '55', 10)

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const LETTERS = ['A', 'B', 'C', 'D']

async function loadFormQuestions(formId) {
  const { data: formQuestions, error } = await supabase
    .from('form_questions')
    .select('question_id, order_index')
    .eq('form_id', formId)
    .order('order_index')

  if (error) throw error
  if (!formQuestions?.length) throw new Error('Formulário sem questões')

  const questionIds = formQuestions.map((fq) => fq.question_id)

  const { data: alternatives, error: altError } = await supabase
    .from('question_alternatives')
    .select('question_id, letter, is_correct, order_index')
    .in('question_id', questionIds)
    .order('order_index')

  if (altError) throw altError

  const byQuestion = new Map()
  for (const alt of alternatives || []) {
    const list = byQuestion.get(alt.question_id) || []
    list.push(alt)
    byQuestion.set(alt.question_id, list)
  }

  return formQuestions.map((fq) => {
    const alts = byQuestion.get(fq.question_id) || []
    const correct = alts.find((a) => a.is_correct)
    const wrong = alts.filter((a) => !a.is_correct)
    if (!correct) throw new Error(`Questão ${fq.question_id} sem gabarito`)
    return {
      id: fq.question_id,
      correctLetter: correct.letter,
      wrongLetters: wrong.map((a) => a.letter),
    }
  })
}

/** Gera respostas com desempenho variado (20% a 95% de acerto aproximado). */
function buildAnswers(questions, studentIndex) {
  const targetRate = 0.2 + ((studentIndex * 17) % 76) / 100
  return questions.map((q, qi) => {
    const roll = (studentIndex * 31 + qi * 13) % 100
    const useCorrect = roll / 100 < targetRate
    let letter = q.correctLetter
    if (!useCorrect && q.wrongLetters.length > 0) {
      letter = q.wrongLetters[(studentIndex + qi) % q.wrongLetters.length]
    }
    return { question_id: q.id, letter }
  })
}

async function submitResponse(studentIndex, questions) {
  const email = `aluno.seed.${String(studentIndex).padStart(3, '0')}@mvp-rda.test`
  const name = `Aluno Seed ${studentIndex}`
  const answers = buildAnswers(questions, studentIndex)

  const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-form-response`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      slug,
      student_name: name,
      student_email: email,
      answers,
    }),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return { email, name }
}

async function main() {
  console.log(`Formulário: /f/${slug}\n`)

  const { data: link, error: linkError } = await supabase
    .from('form_links')
    .select('id, form_id, form:forms(title)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (linkError || !link) {
    throw new Error(`Link não encontrado ou inativo: ${slug}`)
  }

  const formTitle = link.form?.title || link.form?.[0]?.title || 'Formulário'
  console.log(`Título: ${formTitle}`)

  const { count: existingCount } = await supabase
    .from('form_responses')
    .select('*', { count: 'exact', head: true })
    .eq('form_id', link.form_id)

  const current = existingCount ?? 0
  const needed = Math.max(0, targetTotal - current)

  if (needed === 0) {
    console.log(`Já existem ${current} respostas (meta: ${targetTotal}). Nada a fazer.`)
    return
  }

  console.log(`Respostas atuais: ${current}`)
  console.log(`Cadastrando ${needed} novas respostas...\n`)

  const questions = await loadFormQuestions(link.form_id)
  console.log(`Questões no formulário: ${questions.length}\n`)

  let created = 0
  let failed = 0
  const startIndex = Date.now() % 100000

  for (let i = 0; i < needed; i++) {
    const idx = startIndex + i
    try {
      const { email } = await submitResponse(idx, questions)
      created++
      if (created % 10 === 0 || created === needed) {
        console.log(`  ✓ ${created}/${needed} — último: ${email}`)
      }
    } catch (err) {
      failed++
      console.error(`  ✗ Aluno ${idx}: ${err.message}`)
    }
  }

  const { count: finalCount } = await supabase
    .from('form_responses')
    .select('*', { count: 'exact', head: true })
    .eq('form_id', link.form_id)

  console.log(`\nConcluído: ${created} criadas, ${failed} falhas.`)
  console.log(`Total no formulário: ${finalCount ?? '?'} respostas`)
  console.log(`\nAcesse: http://localhost:5173/f/${slug}`)
}

main().catch((err) => {
  console.error('Erro:', err.message || err)
  process.exit(1)
})
