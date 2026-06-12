/**
 * Cadastra trilhas do aluno (PDFs) no banco de trilhas.
 * Uso: npm run seed:student-trails
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
    filePattern: /01\.\s*Estudante.*Trilha\s*1/i,
    title: 'Trilha 1 — Recomposição de Base',
    description:
      'Material de recomposição em Língua Portuguesa para consolidar habilidades iniciais de leitura e interpretação.',
    nivel_proficiencia: 'inicial',
  },
  {
    slug: 'trilha-2-desenvolvimento',
    filePattern: /03\.\s*Estudante.*Trilha\s*2/i,
    title: 'Trilha 2 — Recomposição de Desenvolvimento',
    description:
      'Material de recomposição em Língua Portuguesa para aprofundar habilidades em desenvolvimento.',
    nivel_proficiencia: 'intermediario',
  },
  {
    slug: 'trilha-3-ampliacao',
    filePattern: /05\.\s*Estudante.*Trilha\s*3/i,
    title: 'Trilha 3 — Ampliação e Aprofundamento',
    description:
      'Material de recomposição em Língua Portuguesa para ampliar e aprofundar habilidades consolidadas.',
    nivel_proficiencia: 'avancado',
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

async function getCreatorId() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['root', 'admin'])
    .order('created_at')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

async function uploadTrailPdf(buffer, slug) {
  const path = `student/${slug}.pdf`
  const { error } = await supabase.storage
    .from('trail-pdfs')
    .upload(path, buffer, { contentType: 'application/pdf', upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('trail-pdfs').getPublicUrl(path)
  return data.publicUrl
}

async function upsertTrail(trail, pdfUrl, createdBy) {
  const { data: existing } = await supabase
    .from('learning_trails')
    .select('id')
    .eq('title', trail.title)
    .maybeSingle()

  const row = {
    title: trail.title,
    description: trail.description,
    pdf_url: pdfUrl,
    link_url: null,
    content: null,
    nivel_proficiencia: trail.nivel_proficiencia,
  }

  if (existing?.id) {
    const { error } = await supabase.from('learning_trails').update(row).eq('id', existing.id)
    if (error) throw error
    console.log(`↻ Atualizada: ${trail.title}`)
    return
  }

  const { error } = await supabase.from('learning_trails').insert({
    ...row,
    created_by: createdBy,
  })
  if (error) throw error
  console.log(`✓ Criada: ${trail.title}`)
}

async function main() {
  console.log('Cadastrando trilhas do aluno...\n')
  console.log(`Pasta: ${DOWNLOADS}\n`)

  const createdBy = await getCreatorId()

  for (const trail of TRAILS) {
    const filePath = findPdfFile(trail.filePattern)
    if (!filePath || !existsSync(filePath)) {
      throw new Error(`PDF não encontrado para ${trail.title}`)
    }

    console.log(`→ ${filePath}`)
    const buffer = readFileSync(filePath)
    const pdfUrl = await uploadTrailPdf(buffer, trail.slug)
    await upsertTrail(trail, pdfUrl, createdBy)
  }

  console.log(`\nConcluído: ${TRAILS.length} trilhas cadastradas.`)
}

main().catch((err) => {
  console.error('Erro:', err.message || err)
  process.exit(1)
})
