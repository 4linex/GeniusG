/**
 * Cria 5 formulários (3 padrão + 2 gamificados), 5 questões cada,
 * e registra respostas dos 50 alunos já existentes (ou aluno.seed.001–050).
 *
 * Uso: npm run seed:batch-forms
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const STUDENT_COUNT = 50

const FORMS = [
  {
    title: 'Avaliação LP — Compreensão Textual',
    form_mode: 'padrao',
    design_accent: '#14b8a6',
    questionCodes: ['LP5_D3_004', 'LP5_D3_005', 'LP5_D3_006', 'LP5_D4_007', 'LP5_D4_008'],
  },
  {
    title: 'Avaliação LP — Inferência e Análise',
    form_mode: 'padrao',
    design_accent: '#0ea5e9',
    questionCodes: ['LP5_D4_009', 'LP5_D6_010', 'LP5_D6_011', 'LP5_D6_012', 'LP5_D3_004'],
  },
  {
    title: 'Avaliação LP — Revisão Bimestral',
    form_mode: 'padrao',
    design_accent: '#6366f1',
    questionCodes: ['LP5_D3_005', 'LP5_D3_006', 'LP5_D4_007', 'LP5_D4_008', 'LP5_D4_009'],
  },
  {
    title: 'Missão LP — Trilha do Leitor',
    form_mode: 'gamificado',
    design_accent: '#a855f7',
    questionCodes: ['LP5_D6_010', 'LP5_D6_011', 'LP5_D6_012', 'LP5_D3_004', 'LP5_D3_005'],
  },
  {
    title: 'Missão LP — Desafio das Habilidades',
    form_mode: 'gamificado',
    design_accent: '#ec4899',
    questionCodes: ['LP5_D4_007', 'LP5_D4_008', 'LP5_D4_009', 'LP5_D6_010', 'LP5_D6_011'],
  },
]

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function generateSlug(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

async function getProfessorId() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'professor')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (data?.id) return data.id

  const { data: admin } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'root'])
    .limit(1)
    .maybeSingle()
  if (!admin?.id) throw new Error('Execute npm run seed:users primeiro.')
  return admin.id
}

async function loadQuestionIdsByCode(codes) {
  const { data, error } = await supabase
    .from('questions')
    .select('id, codigo_item')
    .in('codigo_item', codes)
  if (error) throw error

  const map = new Map((data || []).map((q) => [q.codigo_item, q.id]))
  const missing = codes.filter((c) => !map.has(c))
  if (missing.length > 0) {
    throw new Error(
      `Questões não encontradas: ${missing.join(', ')}. Execute npm run seed:gadelha-questions primeiro.`,
    )
  }
  return codes.map((c) => map.get(c))
}

async function loadFormQuestionsMeta(formId) {
  const { data: formQuestions, error } = await supabase
    .from('form_questions')
    .select('question_id, order_index')
    .eq('form_id', formId)
    .order('order_index')
  if (error) throw error

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

function buildAnswers(questions, studentIndex) {
  const targetRate = 0.25 + ((studentIndex * 13) % 65) / 100
  return questions.map((q, qi) => {
    const roll = (studentIndex * 31 + qi * 17) % 100
    const useCorrect = roll / 100 < targetRate
    let letter = q.correctLetter
    if (!useCorrect && q.wrongLetters.length > 0) {
      letter = q.wrongLetters[(studentIndex + qi) % q.wrongLetters.length]
    }
    return { question_id: q.id, letter }
  })
}

async function loadStudents() {
  const { data, error } = await supabase
    .from('form_responses')
    .select('student_name, student_email')
    .order('completed_at', { ascending: false })
  if (error) throw error

  const map = new Map()
  for (const r of data || []) {
    const email = r.student_email.toLowerCase()
    if (!map.has(email)) map.set(email, r.student_name)
  }

  const students = Array.from(map.entries()).map(([email, name]) => ({ email, name }))

  for (let i = 1; students.length < STUDENT_COUNT; i++) {
    const email = `aluno.seed.${String(i).padStart(3, '0')}@mvp-rda.test`
    if (!map.has(email)) {
      students.push({ email, name: `Aluno Seed ${i}` })
      map.set(email, `Aluno Seed ${i}`)
    }
  }

  return students.slice(0, STUDENT_COUNT)
}

async function createForm(definition, professorId, createdBy) {
  const { data: existing } = await supabase
    .from('forms')
    .select('id, title')
    .eq('title', definition.title)
    .maybeSingle()

  if (existing?.id) {
    console.log(`  ↻ Formulário já existe: ${definition.title}`)
    const { data: link } = await supabase
      .from('form_links')
      .select('slug')
      .eq('form_id', existing.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    return { formId: existing.id, slug: link?.slug, reused: true }
  }

  const questionIds = await loadQuestionIdsByCode(definition.questionCodes)

  const { data: form, error: formError } = await supabase
    .from('forms')
    .insert({
      title: definition.title,
      description: `Formulário seed — modo ${definition.form_mode}`,
      created_by: createdBy,
      is_active: true,
      form_mode: definition.form_mode,
      turma: '5º Ano',
      status: 'concluido',
      design_accent: definition.design_accent,
      final_screen_title: definition.form_mode === 'gamificado' ? 'Missão concluída!' : 'Obrigado!',
      final_screen_message:
        definition.form_mode === 'gamificado'
          ? 'Você avançou na trilha! Seu professor receberá seu desempenho.'
          : 'Suas respostas foram registradas com sucesso.',
    })
    .select('id')
    .single()
  if (formError) throw formError

  const formQuestionRows = questionIds.map((questionId, order_index) => ({
    form_id: form.id,
    question_id: questionId,
    order_index,
  }))
  const { error: fqError } = await supabase.from('form_questions').insert(formQuestionRows)
  if (fqError) throw fqError

  let slug = generateSlug()
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error: linkError } = await supabase.from('form_links').insert({
      form_id: form.id,
      slug,
      professor_id: professorId,
      is_active: true,
    })
    if (!linkError) break
    slug = generateSlug()
    if (attempt === 4) throw linkError
  }

  console.log(`  ✓ Criado: ${definition.title} (${definition.form_mode}) — /f/${slug}`)
  return { formId: form.id, slug, reused: false }
}

async function submitResponse(slug, student, studentIndex, questions) {
  const answers = buildAnswers(questions, studentIndex)
  const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-form-response`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      slug,
      student_name: student.name,
      student_email: student.email,
      answers,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 409) return { skipped: true }
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return { skipped: false }
}

async function seedResponsesForForm(slug, formId, students) {
  const questions = await loadFormQuestionsMeta(formId)
  let created = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < students.length; i++) {
    try {
      const result = await submitResponse(slug, students[i], i + 1, questions)
      if (result.skipped) skipped++
      else created++
    } catch (err) {
      failed++
      console.error(`    ✗ ${students[i].email}: ${err.message}`)
    }
  }

  return { created, skipped, failed }
}

async function main() {
  console.log('Criando 5 formulários e respostas para 50 alunos...\n')

  const professorId = await getProfessorId()
  const students = await loadStudents()
  console.log(`Alunos: ${students.length}`)
  console.log(`Professor: ${professorId}\n`)

  const results = []

  for (const def of FORMS) {
    console.log(`\n— ${def.title}`)
    const { formId, slug, reused } = await createForm(def, professorId, professorId)
    if (!slug) throw new Error('Slug não encontrado para o formulário')

    console.log(`  Preenchendo respostas (${students.length} alunos)...`)
    const stats = await seedResponsesForForm(slug, formId, students)
    console.log(
      `  Respostas: ${stats.created} novas, ${stats.skipped} já existiam, ${stats.failed} falhas`,
    )

    const { count } = await supabase
      .from('form_responses')
      .select('*', { count: 'exact', head: true })
      .eq('form_id', formId)

    results.push({
      title: def.title,
      mode: def.form_mode,
      slug,
      url: `http://localhost:5173/f/${slug}`,
      total: count ?? 0,
      reused,
    })
  }

  console.log('\n════════════════════════════════════════')
  console.log('Resumo dos formulários criados:\n')
  for (const r of results) {
    console.log(`  ${r.title}`)
    console.log(`    Modo: ${r.mode} | Respostas: ${r.total}`)
    console.log(`    Link: ${r.url}\n`)
  }
}

main().catch((err) => {
  console.error('Erro:', err.message || err)
  process.exit(1)
})
