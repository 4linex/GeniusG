/**
 * Anexa PDFs da área do professor às trilhas já cadastradas.
 * Uso: npm run seed:professor-trails
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const DOWNLOADS = process.env.TRAIL_PDF_DIR || join(process.env.USERPROFILE || '', 'Downloads')

const TRAILS = [
  {
    slug: 'trilha-1-base',
    filePattern: /02\.\s*Professor.*Trilha\s*1/i,
    title: 'Trilha 1 — Recomposição de Base',
    pedagogical_objectives:
      'Orientar a mediação pedagógica para recomposição de habilidades iniciais em leitura e interpretação de textos.',
    pedagogical_content:
      '<p>Trilha completa para o professor — <strong>Recomposição de Base</strong> em Língua Portuguesa (5º Ano).</p><p>Inclui orientações de condução, sequência didática e estratégias de intervenção para alunos no nível inicial de proficiência.</p>',
    teacher_notes:
      'Utilize este material para planejar aulas de recomposição após a aplicação do diagnóstico. Consulte também a trilha do aluno correspondente.',
  },
  {
    slug: 'trilha-2-desenvolvimento',
    filePattern: /04\.\s*Professor.*Trilha\s*2/i,
    title: 'Trilha 2 — Recomposição de Desenvolvimento',
    pedagogical_objectives:
      'Orientar a mediação pedagógica para alunos em desenvolvimento de habilidades de compreensão e inferência textual.',
    pedagogical_content:
      '<p>Trilha completa para o professor — <strong>Recomposição de Desenvolvimento</strong> em Língua Portuguesa (5º Ano).</p><p>Inclui orientações de condução, sequência didática e estratégias de intervenção para alunos no nível intermediário de proficiência.</p>',
    teacher_notes:
      'Utilize este material para planejar aulas de recomposição após a aplicação do diagnóstico. Consulte também a trilha do aluno correspondente.',
  },
  {
    slug: 'trilha-3-ampliacao',
    filePattern: /06\.\s*Professor.*Trilha\s*3/i,
    title: 'Trilha 3 — Ampliação e Aprofundamento',
    pedagogical_objectives:
      'Orientar a mediação pedagógica para ampliar e aprofundar habilidades consolidadas de leitura e análise textual.',
    pedagogical_content:
      '<p>Trilha completa para o professor — <strong>Ampliação e Aprofundamento</strong> em Língua Portuguesa (5º Ano).</p><p>Inclui orientações de condução, sequência didática e estratégias de intervenção para alunos no nível avançado de proficiência.</p>',
    teacher_notes:
      'Utilize este material para planejar aulas de recomposição após a aplicação do diagnóstico. Consulte também a trilha do aluno correspondente.',
  },
]

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function findPdfFile(pattern) {
  const files = readdirSync(DOWNLOADS).filter((f) => f.toLowerCase().endsWith('.pdf'))
  const match = files.find((f) => pattern.test(f))
  if (!match) return null
  return join(DOWNLOADS, match)
}

async function uploadProfessorPdf(buffer, slug) {
  const path = `professor/${slug}.pdf`
  const { error } = await supabase.storage
    .from('trail-pdfs')
    .upload(path, buffer, { contentType: 'application/pdf', upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('trail-pdfs').getPublicUrl(path)
  return data.publicUrl
}

async function updateProfessorTrail(trail, pedagogicalPdfUrl) {
  const { data: existing, error: findError } = await supabase
    .from('learning_trails')
    .select('id, title')
    .eq('title', trail.title)
    .maybeSingle()

  if (findError) throw findError
  if (!existing?.id) {
    throw new Error(`Trilha "${trail.title}" não encontrada. Execute npm run seed:student-trails primeiro.`)
  }

  const { error } = await supabase
    .from('learning_trails')
    .update({
      pedagogical_pdf_url: pedagogicalPdfUrl,
      pedagogical_objectives: trail.pedagogical_objectives,
      pedagogical_content: trail.pedagogical_content,
      teacher_notes: trail.teacher_notes,
    })
    .eq('id', existing.id)

  if (error) throw error
  console.log(`✓ Área do professor atualizada: ${trail.title}`)
}

async function main() {
  console.log('Cadastrando trilhas do professor...\n')
  console.log(`Pasta: ${DOWNLOADS}\n`)

  for (const trail of TRAILS) {
    const filePath = findPdfFile(trail.filePattern)
    if (!filePath || !existsSync(filePath)) {
      throw new Error(`PDF não encontrado para ${trail.title}`)
    }

    console.log(`→ ${filePath}`)
    const buffer = readFileSync(filePath)
    const pdfUrl = await uploadProfessorPdf(buffer, trail.slug)
    await updateProfessorTrail(trail, pdfUrl)
  }

  console.log(`\nConcluído: ${TRAILS.length} trilhas do professor vinculadas.`)
}

main().catch((err) => {
  console.error('Erro:', err.message || err)
  process.exit(1)
})
