/**
 * Preenche respostas nos 5 formulários seed.
 * Um formulário recebe 60 alunos (30 de cada escola); os demais, 30 alunos.
 *
 * Uso: npm run seed:batch-form-responses
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const TWO_SCHOOL_FORM_TITLE = 'Diagnóstico LP — Material Gráfico'
const DEFAULT_STUDENT_COUNT = 30

const SCHOOLS = [
  {
    slug: 'em-maria-aparecida',
    name: 'EM Profª Maria Aparecida',
    /** Índice base para variar desempenho (escola A tende a ir melhor). */
    performanceOffset: 18,
  },
  {
    slug: 'em-dom-pedro',
    name: 'EM Dom Pedro II',
    performanceOffset: 0,
  },
]

const FIRST_NAMES = [
  'Ana', 'Beatriz', 'Carlos', 'Daniel', 'Eduarda', 'Felipe', 'Gabriela', 'Henrique',
  'Isabela', 'João', 'Larissa', 'Miguel', 'Natália', 'Otávio', 'Paula', 'Rafael',
  'Sofia', 'Thiago', 'Valentina', 'William', 'Yasmin', 'Lucas', 'Mariana', 'Pedro',
  'Julia', 'Bruno', 'Camila', 'Diego', 'Fernanda', 'Gustavo',
]

const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Costa', 'Ferreira', 'Rodrigues',
  'Almeida', 'Nascimento', 'Pereira', 'Carvalho', 'Ribeiro', 'Martins', 'Araújo',
  'Barbosa', 'Rocha', 'Dias', 'Castro', 'Gomes', 'Teixeira', 'Moura', 'Correia',
  'Cavalcanti', 'Monteiro', 'Cardoso', 'Vieira', 'Freitas', 'Melo', 'Pinto',
]

const FORM_TITLES = [
  'Diagnóstico LP — Material Gráfico',
  'Diagnóstico LP — Finalidade de Textos',
  'Diagnóstico LP — Estrutura Narrativa',
  'Missão LP — Interpretação Multissemiótica',
  'Missão LP — Revisão Integrada',
]

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function buildStudent(school, index) {
  const first = FIRST_NAMES[(index - 1) % FIRST_NAMES.length]
  const last = LAST_NAMES[(index + school.slug.length) % LAST_NAMES.length]
  const num = String(index).padStart(2, '0')
  return {
    name: `${first} ${last}`,
    email: `aluno.${num}@${school.slug}.mvp-rda.test`,
    school: school.name,
    performanceOffset: school.performanceOffset,
    globalIndex: school.slug === SCHOOLS[0].slug ? index : index + 100,
  }
}

function buildTwoSchoolStudents() {
  const students = []
  for (const school of SCHOOLS) {
    for (let i = 1; i <= 30; i++) {
      students.push(buildStudent(school, i))
    }
  }
  return students
}

function buildDefaultStudents(count) {
  const students = []
  for (let i = 1; i <= count; i++) {
    students.push({
      name: `Aluno Seed ${i}`,
      email: `aluno.seed.${String(i).padStart(3, '0')}@mvp-rda.test`,
      school: null,
      performanceOffset: 10,
      globalIndex: i,
    })
  }
  return students
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

function buildAnswers(questions, student) {
  const baseRate = 0.25 + ((student.globalIndex * 13) % 55) / 100
  const targetRate = Math.min(0.95, baseRate + student.performanceOffset / 100)
  return questions.map((q, qi) => {
    const roll = (student.globalIndex * 31 + qi * 17) % 100
    const useCorrect = roll / 100 < targetRate
    let letter = q.correctLetter
    if (!useCorrect && q.wrongLetters.length > 0) {
      letter = q.wrongLetters[(student.globalIndex + qi) % q.wrongLetters.length]
    }
    return { question_id: q.id, letter }
  })
}

async function submitResponse(slug, student, questions) {
  const answers = buildAnswers(questions, student)
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

  for (const student of students) {
    try {
      const result = await submitResponse(slug, student, questions)
      if (result.skipped) skipped++
      else created++
    } catch (err) {
      failed++
      console.error(`    ✗ ${student.email}: ${err.message}`)
    }
  }

  return { created, skipped, failed }
}

async function loadFormByTitle(title) {
  const { data: form, error } = await supabase
    .from('forms')
    .select('id, title, school_name')
    .eq('title', title)
    .maybeSingle()
  if (error) throw error
  if (!form?.id) throw new Error(`Formulário não encontrado: ${title}`)

  const { data: link, error: linkError } = await supabase
    .from('form_links')
    .select('slug')
    .eq('form_id', form.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  if (linkError) throw linkError
  if (!link?.slug) throw new Error(`Link ativo não encontrado: ${title}`)

  return { formId: form.id, slug: link.slug, title: form.title }
}

async function main() {
  console.log('Preenchendo respostas nos formulários seed...\n')

  const results = []

  for (const title of FORM_TITLES) {
    console.log(`\n— ${title}`)
    const { formId, slug } = await loadFormByTitle(title)

    const isTwoSchool = title === TWO_SCHOOL_FORM_TITLE
    const students = isTwoSchool ? buildTwoSchoolStudents() : buildDefaultStudents(DEFAULT_STUDENT_COUNT)

    if (isTwoSchool) {
      await supabase
        .from('forms')
        .update({ school_name: 'Rede Municipal — Comparativo (2 escolas)' })
        .eq('id', formId)
      console.log(`  Escolas: ${SCHOOLS.map((s) => s.name).join(' + ')} (30 alunos cada)`)
    }

    console.log(`  Slug: /f/${slug}`)
    console.log(`  Cadastrando ${students.length} respostas...`)

    const stats = await seedResponsesForForm(slug, formId, students)
    console.log(
      `  ✓ ${stats.created} novas, ${stats.skipped} já existiam, ${stats.failed} falhas`,
    )

    const { count } = await supabase
      .from('form_responses')
      .select('*', { count: 'exact', head: true })
      .eq('form_id', formId)

    results.push({
      title,
      slug,
      total: count ?? 0,
      schools: isTwoSchool ? SCHOOLS.map((s) => `${s.name} (30)`) : null,
    })
  }

  console.log('\n════════════════════════════════════════')
  console.log('Resumo:\n')
  for (const r of results) {
    console.log(`  ${r.title}`)
    console.log(`    Total: ${r.total} respostas | /f/${r.slug}`)
    if (r.schools) {
      console.log(`    Escolas: ${r.schools.join(' · ')}`)
    }
    console.log('')
  }
}

main().catch((err) => {
  console.error('Erro:', err.message || err)
  process.exit(1)
})
