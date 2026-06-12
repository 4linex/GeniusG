import { readFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const DOCX_PATH =
  process.env.LOTE_DOCX ||
  process.env.LOTE2_DOCX ||
  join(process.env.USERPROFILE || '', 'Downloads', 'Lote 2 (2).docx')

const POINT_BY_DIFFICULTY = { Fácil: 1, Médio: 2, Difícil: 3 }

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildEnunciado(textoBase, comando) {
  const paragraphs = textoBase
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('')
  const command = `<p><strong>${escapeHtml(comando.trim())}</strong></p>`
  return paragraphs + command
}

function buildCreatorNotes({ gabarito, resolucao, leitura, trilha }) {
  const parts = [`Gabarito: ${gabarito}`, '', 'Resolução comentada', resolucao.trim()]
  if (leitura?.trim()) parts.push('', `Leitura diagnóstica: ${leitura.trim()}`)
  if (trilha?.trim()) parts.push('', `Trilha de recomposição sugerida: ${trilha.trim()}`)
  return parts.join('\n')
}

function normalizeBloom(value) {
  if (!value) return 'Compreender'
  const first = value.split('/')[0].trim()
  const map = {
    localizar: 'Lembrar',
    Lembrar: 'Lembrar',
    Compreender: 'Compreender',
    Analisar: 'Analisar',
    Aplicar: 'Aplicar',
    Avaliar: 'Avaliar',
    Criar: 'Criar',
  }
  return map[first] || first
}

function normalizeDifficulty(value) {
  const v = value.trim().toLowerCase()
  if (v.startsWith('f')) return 'Fácil'
  if (v.startsWith('m')) return 'Médio'
  if (v.startsWith('d')) return 'Difícil'
  return value
}

function stripAltPrefix(text) {
  return text.replace(/^[A-D]\)\s*/, '').trim()
}

function splitAlternativesLine(line) {
  const parts = line.split(/(?=[B-D]\))/).map((p) => p.trim()).filter(Boolean)
  const alts = []
  for (const part of parts) {
    const m = part.match(/^([A-D])\)\s*(.+)/s)
    if (m) alts.push({ letter: m[1], text: m[2].trim() })
  }
  return alts
}

function getParagraphs(xml) {
  return xml
    .split(/<w:p[\s>]/)
    .slice(1)
    .map((p) => {
      const texts = [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) =>
        m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
      )
      return texts.join('').trim()
    })
    .filter(Boolean)
}

function parseMetadataBlock(text) {
  const get = (re) => {
    const m = text.match(re)
    return m?.[1]?.trim().replace(/\s+/g, ' ') || ''
  }
  return {
    codigo_item: get(/Código do item:\s*(LP5_D\d+_\d+)/i),
    conteudo_programatico: get(
      /Conteúdo programático:\s*(.+?)(?=Ano\/Série|Descritor Saeb|Nível de Bloom|Nível de dificuldade|Texto-base|Fonte|$)/i,
    ),
    descritor_saeb: get(/Descritor Saeb:\s*(.+?)(?=Habilidade BNCC|Nível|Texto-base|Fonte|Tempo|$)/i),
    habilidade_bncc: get(/Habilidade BNCC:\s*(.+?)(?=Nível|Texto-base|Fonte|Tempo|$)/i),
    nivel_bloom: get(/Nível de Bloom:\s*(.+?)(?=Nível de dificuldade|Tempo|Texto-base|Fonte|$)/i),
    nivel_dificuldade: get(/Nível de dificuldade:\s*(.+?)(?=Tempo|Texto-base|Fonte|$)/i),
    tempo_medio_resolucao: (() => {
      const t = get(/Tempo médio de resolução:\s*(\d+)/i)
      return t ? parseInt(t, 10) * 60 : null
    })(),
    tipo_texto_base: get(/Texto-base:\s*(.+?)(?=Fonte|$)/i),
    fonte: get(/Fonte:\s*(.+?)(?=Texto-base|$)/i) || get(/Fonte:\s*(.+)$/i),
  }
}

function parseQuestions(paras) {
  const questions = []
  let i = 0
  let imageCounter = 0

  while (i < paras.length) {
    const header = paras[i]
    const itemMatch = header.match(/^Item\s+(\d+)\s*[—–-]\s*Nível\s+(\w+)/i)
    if (!itemMatch) {
      i++
      continue
    }

    const itemNum = itemMatch[1]
    const nivelFromHeader = itemMatch[2]
    i++

    const metaParts = []
    while (i < paras.length && !/^Texto-base$/i.test(paras[i]) && !/^Comando$/i.test(paras[i])) {
      metaParts.push(paras[i])
      i++
    }

    const meta = parseMetadataBlock(metaParts.join(''))

    let needsImage = false
    const textoBaseParts = []
    if (/^Texto-base$/i.test(paras[i])) i++
    while (i < paras.length && !/^Comando$/i.test(paras[i])) {
      const line = paras[i]
      if (/^\[Download\]|^Imagem gerada|^IA\/GEMINI$/i.test(line) || /\[Download\]/i.test(line)) {
        needsImage = true
      } else {
        textoBaseParts.push(line)
      }
      i++
    }

    i++
    const comando = paras[i] || ''
    i++

    const alternatives = []
    while (i < paras.length && /^[A-D]\)/.test(paras[i])) {
      const split = splitAlternativesLine(paras[i])
      if (split.length > 1) {
        alternatives.push(...split)
      } else {
        const m = paras[i].match(/^([A-D])\)\s*(.+)/)
        if (m) alternatives.push({ letter: m[1], text: m[2].trim() })
      }
      i++
    }

    let gabarito = ''
    const resolucaoLines = []
    let leitura = ''
    let trilha = ''
    let section = ''

    while (i < paras.length && !/^Item\s+\d+/i.test(paras[i])) {
      const line = paras[i]
      if (/^Gabarito:/i.test(line)) {
        gabarito = line.replace(/^Gabarito:\s*/i, '').trim()
        section = 'gabarito'
      } else if (/^Resolução comentada/i.test(line)) {
        section = 'resolucao'
      } else if (/^Leitura diagnóstica:/i.test(line)) {
        section = 'leitura'
        leitura = line.replace(/^Leitura diagnóstica:\s*/i, '')
      } else if (/^Trilha de recomposição sugerida:/i.test(line)) {
        section = 'trilha'
        trilha = line.replace(/^Trilha de recomposição sugerida:\s*/i, '')
      } else if (/^[A-D]\s*[-–—]/.test(line)) {
        resolucaoLines.push(line)
        section = 'resolucao'
      } else if (section === 'leitura') {
        leitura += (leitura ? ' ' : '') + line
      } else if (section === 'trilha') {
        trilha += (trilha ? ' ' : '') + line
      }
      i++
    }

    const nivel_dificuldade = normalizeDifficulty(
      meta.nivel_dificuldade || nivelFromHeader,
    )

    const titleSource = textoBaseParts[0] || comando
    const title =
      titleSource.length > 55 ? `${titleSource.slice(0, 52).trim()}…` : titleSource.trim()

    questions.push({
      codigo_item: meta.codigo_item || `LOTE2_${itemNum}`,
      title,
      texto_base: textoBaseParts.join('\n'),
      comando,
      alternatives: alternatives.map((a) => ({
        ...a,
        correct: a.letter === gabarito.toUpperCase(),
      })),
      conteudo_programatico: meta.conteudo_programatico || 'Interpretação de texto',
      descritor_saeb: meta.descritor_saeb,
      habilidade_bncc: meta.habilidade_bncc,
      nivel_bloom: normalizeBloom(meta.nivel_bloom),
      nivel_dificuldade,
      tempo_medio_resolucao: meta.tempo_medio_resolucao,
      tipo_texto_base: meta.tipo_texto_base || null,
      fonte: meta.fonte || 'Texto elaborado para fins pedagógicos.',
      creator_notes: buildCreatorNotes({
        gabarito,
        resolucao: resolucaoLines.join('\n'),
        leitura,
        trilha,
      }),
      image_index: needsImage ? imageCounter++ : null,
    })
  }

  return questions
}

function extractDocxAssets(docxPath) {
  const tempDir = mkdtempSync(join(tmpdir(), 'lote2-seed-'))
  try {
    execSync(`tar -xf "${docxPath}" -C "${tempDir}"`, { stdio: 'pipe' })
    const xml = readFileSync(join(tempDir, 'word/document.xml'), 'utf8')
    const paras = getParagraphs(xml)
    const questions = parseQuestions(paras)

    const mediaDir = join(tempDir, 'word/media')
    const images = existsSync(mediaDir)
      ? readdirSync(mediaDir)
          .filter((f) => /\.(png|jpe?g)$/i.test(f))
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
          .map((f) => readFileSync(join(mediaDir, f)))
      : []

    return { questions, images }
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

async function getAdminProfileId() {
  const preferred = await supabase
    .from('profiles')
    .select('id')
    .eq('email', 'admin@mvp-rda.local')
    .maybeSingle()
  if (preferred.data?.id) return preferred.data.id

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

async function uploadQuestionImage(buffer, codigoItem) {
  const path = `seed/lote/${codigoItem.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`
  const { error } = await supabase.storage
    .from('question-images')
    .upload(path, buffer, { contentType: 'image/png', upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('question-images').getPublicUrl(path)
  return data.publicUrl
}

async function upsertQuestion(item, createdBy, imageUrl) {
  if (item.alternatives.length !== 4) {
    throw new Error(`${item.codigo_item}: esperadas 4 alternativas, encontradas ${item.alternatives.length}`)
  }
  if (!item.alternatives.some((a) => a.correct)) {
    throw new Error(`${item.codigo_item}: nenhuma alternativa correta identificada`)
  }

  const { data: existing } = await supabase
    .from('questions')
    .select('id')
    .eq('codigo_item', item.codigo_item)
    .maybeSingle()

  const questionRow = {
    title: item.title,
    enunciado: buildEnunciado(item.texto_base, item.comando),
    codigo_item: item.codigo_item,
    componente_curricular: 'Língua Portuguesa',
    conteudo_programatico: item.conteudo_programatico,
    ano_serie: '5º Ano',
    descritor_saeb: item.descritor_saeb,
    habilidade_bncc: item.habilidade_bncc || null,
    nivel_bloom: item.nivel_bloom,
    nivel_dificuldade: item.nivel_dificuldade,
    tempo_medio_resolucao: item.tempo_medio_resolucao,
    tipo_texto_base: item.tipo_texto_base,
    fonte: item.fonte,
    question_type: 'multipla_escolha',
    point_value: POINT_BY_DIFFICULTY[item.nivel_dificuldade] ?? 1,
    creator_notes: item.creator_notes,
    is_form_exclusive: false,
    image_url: imageUrl ?? null,
    updated_at: new Date().toISOString(),
  }

  let questionId
  if (existing?.id) {
    const { error } = await supabase.from('questions').update(questionRow).eq('id', existing.id)
    if (error) throw error
    questionId = existing.id
    await supabase.from('question_alternatives').delete().eq('question_id', questionId)
    console.log(`↻ Atualizada: ${item.codigo_item}`)
  } else {
    const { data, error } = await supabase
      .from('questions')
      .insert({ ...questionRow, created_by: createdBy })
      .select('id')
      .single()
    if (error) throw error
    questionId = data.id
    console.log(`✓ Criada: ${item.codigo_item}`)
  }

  const altRows = item.alternatives.map((alt, index) => ({
    question_id: questionId,
    letter: alt.letter,
    text: stripAltPrefix(alt.text),
    is_correct: alt.correct,
    order_index: index,
  }))

  const { error: altError } = await supabase.from('question_alternatives').insert(altRows)
  if (altError) throw altError
}

async function main() {
  if (!existsSync(DOCX_PATH)) {
    throw new Error(`DOCX não encontrado: ${DOCX_PATH}`)
  }

  console.log(`Lendo: ${DOCX_PATH}\n`)
  const { questions, images } = extractDocxAssets(DOCX_PATH)
  console.log(`Encontradas ${questions.length} questões, ${images.length} imagens\n`)

  const createdBy = await getAdminProfileId()

  for (const item of questions) {
    let imageUrl = null
    if (item.image_index != null && images[item.image_index]) {
      imageUrl = await uploadQuestionImage(images[item.image_index], item.codigo_item)
    }
    await upsertQuestion(item, createdBy, imageUrl)
  }

  console.log(`\nConcluído: ${questions.length} questões cadastradas.`)
}

main().catch((err) => {
  console.error('Erro:', err.message || err)
  process.exit(1)
})
