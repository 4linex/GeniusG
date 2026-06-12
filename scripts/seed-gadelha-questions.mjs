/**
 * Cadastra as questões do documento "Timbrado Gadelha Group 2026" no banco local.
 * Uso: npm run seed:gadelha-questions
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const DOCX_PATH =
  process.env.GADELHA_DOCX ||
  join(process.env.USERPROFILE || '', 'Downloads', 'Timbrado Gadelha Group 2026 (1).docx')

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
  if (leitura?.trim()) parts.push('', `Leitura diagnóstica:${leitura.trim()}`)
  if (trilha?.trim()) parts.push('', `Trilha de recomposição sugerida:${trilha.trim()}`)
  return parts.join('\n')
}

function normalizeBloom(value) {
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

function stripAltPrefix(text) {
  return text.replace(/^[A-D]\)\s*/, '').trim()
}

const QUESTIONS = [
  {
    codigo_item: 'LP5_D3_004',
    title: 'A chuva chegando',
    texto_base:
      'Lucas estava brincando no quintal quando percebeu o céu escuro e sentiu um vento forte. Ele correu para recolher as roupas do varal antes que a chuva começasse. Sua avó disse: — Você foi muito ágil, Lucas!',
    comando: 'No texto, a palavra ágil significa que Lucas foi',
    alternatives: [
      { letter: 'A', text: 'rápido.', correct: true },
      { letter: 'B', text: 'distraído.', correct: false },
      { letter: 'C', text: 'teimoso.', correct: false },
      { letter: 'D', text: 'curioso.', correct: false },
    ],
    conteudo_programatico: 'Sinonimia',
    descritor_saeb: 'D3 – Inferir o sentido de palavra ou expressão.',
    habilidade_bncc:
      'EF35LP05 - Inferir o sentido de palavras ou expressões desconhecidas em textos, com base no contexto da frase ou do texto.',
    nivel_bloom: 'Compreender',
    nivel_dificuldade: 'Fácil',
    tempo_medio_resolucao: 60,
    tipo_texto_base: 'Narrativa curta',
    fonte: 'Texto elaborado para este item.',
    creator_notes: buildCreatorNotes({
      gabarito: 'A',
      resolucao: `A - CORRETA: Lucas correu para recolher as roupas antes da chuva, por isso a palavra ágil indica que ele foi rápido.
B - INCORRETA: O texto mostra que Lucas percebeu o tempo mudando, então ele não agiu de forma distraída.
C - INCORRETA: Lucas atendeu à situação rapidamente; o texto não indica teimosia.
D - INCORRETA: Embora Lucas tenha percebido o ambiente, a palavra destacada se refere à rapidez da ação.`,
      leitura:
        'O acerto indica que o estudante utiliza pistas do contexto para compreender o sentido de uma palavra. Os erros podem indicar leitura apenas superficial ou dificuldade em associar a ação da personagem ao vocabulário usado no texto.',
      trilha: 'Nível 2 — Desenvolvimento da compreensão textual.',
    }),
  },
  {
    codigo_item: 'LP5_D3_005',
    title: 'Na feira de Ciências',
    texto_base:
      'Durante a feira de Ciências, Marina apresentou seu experimento para os visitantes. Ela explicou cada etapa com calma, respondeu às perguntas dos colegas e mostrou os resultados no cartaz. A professora comentou que Marina falou com segurança durante toda a apresentação.',
    comando: 'No texto, a expressão com segurança significa que Marina falou de modo',
    alternatives: [
      { letter: 'A', text: 'apressado.', correct: false },
      { letter: 'B', text: 'confiante.', correct: true },
      { letter: 'C', text: 'assustado.', correct: false },
      { letter: 'D', text: 'silencioso.', correct: false },
    ],
    conteudo_programatico: 'Sinonimia',
    descritor_saeb: 'D3 – Inferir o sentido de palavra ou expressão.',
    habilidade_bncc:
      'EF35LP05 - Inferir o sentido de palavras ou expressões desconhecidas em textos, com base no contexto da frase ou do texto.',
    nivel_bloom: 'Compreender / Analisar',
    nivel_dificuldade: 'Médio',
    tempo_medio_resolucao: 120,
    tipo_texto_base: 'Relato escolar',
    fonte: 'Texto elaborado para este item.',
    creator_notes: buildCreatorNotes({
      gabarito: 'B',
      resolucao: `A - INCORRETA: O texto informa que Marina explicou cada etapa com calma, não de maneira apressada.
B - CORRETA: A expressão com segurança indica que Marina apresentou o trabalho de forma confiante, respondendo às perguntas e mostrando os resultados.
C - INCORRETA: O texto não apresenta sinais de medo ou susto na fala de Marina.
D - INCORRETA: Marina explicou, respondeu e apresentou informações, portanto não ficou em silêncio.`,
      leitura:
        'O acerto indica que o estudante compreende uma expressão a partir das ações descritas no texto. Os erros podem revelar dificuldade em relacionar diferentes pistas textuais para construir o sentido da expressão.',
    }),
  },
  {
    codigo_item: 'LP5_D3_006',
    title: 'Campanha de livros',
    texto_base:
      'No início, poucos estudantes participaram da campanha de arrecadação de livros da escola. Depois que a rádio escolar divulgou a iniciativa, várias turmas começaram a colaborar. Em poucos dias, as caixas ficaram cheias de doações, e o projeto ganhou fôlego.',
    comando: 'No texto, a expressão ganhou fôlego significa que o projeto',
    alternatives: [
      { letter: 'A', text: 'ficou cansado com as doações.', correct: false },
      { letter: 'B', text: 'passou a ter mais força e participação.', correct: true },
      { letter: 'C', text: 'precisou ser encerrado rapidamente.', correct: false },
      { letter: 'D', text: 'mudou de lugar dentro da escola.', correct: false },
    ],
    conteudo_programatico: 'Sinonimia',
    descritor_saeb: 'D3 – Inferir o sentido de palavra ou expressão.',
    habilidade_bncc:
      'EF35LP05 - Inferir o sentido de palavras ou expressões desconhecidas em textos, com base no contexto da frase ou do texto.',
    nivel_bloom: 'Analisar',
    nivel_dificuldade: 'Difícil',
    tempo_medio_resolucao: 180,
    tipo_texto_base: 'Texto informativo curto',
    fonte: 'Texto elaborado para este item.',
    creator_notes: buildCreatorNotes({
      gabarito: 'B',
      resolucao: `A - INCORRETA: A alternativa interpreta a expressão de forma literal, como se o projeto pudesse ficar cansado. No contexto, a expressão tem sentido figurado.
B - CORRETA: A expressão ganhou fôlego indica que o projeto passou a ter mais força, pois mais turmas começaram a participar e as caixas ficaram cheias de livros.
C - INCORRETA: O texto mostra crescimento da campanha, não encerramento.
D - INCORRETA: O texto não informa mudança de local; a expressão se refere ao avanço da campanha.`,
      leitura:
        'O acerto indica que o estudante compreende uma expressão em sentido figurado a partir do contexto. Os erros podem revelar dificuldade em superar o sentido literal da expressão ou em selecionar as pistas mais relevantes do texto.',
    }),
  },
  {
    codigo_item: 'LP5_D4_007',
    title: 'Antes de sair',
    texto_base:
      'Mariana estava pronta para ir à escola. Antes de sair, olhou pela janela e viu o céu escuro. Então, voltou ao quarto e colocou a capa de chuva dentro da mochila.',
    comando: 'Com base no texto, é possível entender que Mariana',
    alternatives: [
      { letter: 'A', text: 'achou que poderia chover.', correct: true },
      { letter: 'B', text: 'queria trocar de mochila.', correct: false },
      { letter: 'C', text: 'esqueceu o material escolar.', correct: false },
      { letter: 'D', text: 'decidiu faltar à aula.', correct: false },
    ],
    conteudo_programatico: 'Interpretação de texto',
    descritor_saeb: 'D4 – Inferir informação implícita em um texto.',
    habilidade_bncc: 'EF35LP04 - Inferir informações implícitas nos textos lidos.',
    nivel_bloom: 'Compreender',
    nivel_dificuldade: 'Fácil',
    tempo_medio_resolucao: 60,
    tipo_texto_base: 'Narrativa curta',
    fonte: 'Texto elaborado para este item.',
    creator_notes: buildCreatorNotes({
      gabarito: 'A',
      resolucao: `A - CORRETA: O texto informa que Mariana viu o céu escuro e colocou a capa de chuva na mochila. Essas pistas permitem inferir que ela achou que poderia chover.
B - INCORRETA: O texto menciona a mochila, mas não indica que Mariana queria trocá-la.
C - INCORRETA: Mariana voltou ao quarto para pegar a capa de chuva, não porque esqueceu o material escolar.
D - INCORRETA: O texto informa que ela estava pronta para ir à escola, não que decidiu faltar.`,
      leitura:
        'O acerto indica que o estudante consegue inferir uma informação simples a partir de pistas explícitas. Os erros podem indicar dificuldade em relacionar ações da personagem à situação apresentada.',
    }),
  },
  {
    codigo_item: 'LP5_D4_008',
    title: 'A pesquisa de João',
    texto_base:
      'João chegou à sala segurando uma pasta colorida. Antes mesmo de a professora perguntar sobre a tarefa, ele levantou a mão e disse:\n— Professora, terminei minha pesquisa sobre os animais do Cerrado e coloquei até imagens no cartaz!',
    comando: 'Com base no texto, é possível entender que João estava',
    alternatives: [
      { letter: 'A', text: 'animado para apresentar sua pesquisa.', correct: true },
      { letter: 'B', text: 'preocupado por não ter feito a tarefa.', correct: false },
      { letter: 'C', text: 'confuso sobre o tema da atividade.', correct: false },
      { letter: 'D', text: 'irritado com a pergunta da professora.', correct: false },
    ],
    conteudo_programatico: 'Interpretação de texto',
    descritor_saeb: 'D4 – Inferir informação implícita em um texto.',
    habilidade_bncc: 'EF35LP04 - Inferir informações implícitas nos textos lidos.',
    nivel_bloom: 'Compreender',
    nivel_dificuldade: 'Difícil',
    tempo_medio_resolucao: 120,
    tipo_texto_base: 'Relato escolar',
    fonte: 'Texto elaborado para este item.',
    creator_notes: buildCreatorNotes({
      gabarito: 'A',
      resolucao: `A - CORRETA: João levantou a mão antes da pergunta da professora e destacou que terminou a pesquisa e colocou imagens. Essas pistas indicam que ele estava animado para apresentar o trabalho.
B - INCORRETA: O texto mostra que João terminou a pesquisa, portanto não estava preocupado por não ter feito a tarefa.
C - INCORRETA: João sabia o tema da pesquisa: animais do Cerrado.
D - INCORRETA: A professora ainda nem havia perguntado sobre a tarefa, e o texto não apresenta sinal de irritação.`,
      leitura:
        'O acerto indica que o estudante consegue inferir o estado de ânimo da personagem a partir de suas ações e falas. Os erros podem revelar dificuldade em usar pistas textuais para compreender informações não ditas diretamente.',
    }),
  },
  {
    codigo_item: 'LP5_D4_009',
    title: 'O ensaio',
    texto_base:
      'A turma ensaiava uma apresentação para a festa da escola. Quando chegou a vez de Lúcia cantar, ela apertou as mãos, olhou para o chão e falou bem baixinho. A professora se aproximou, sorriu e disse: — Vamos tentar mais uma vez. A turma está aqui para apoiar você.',
    comando: 'Com base no texto, é possível entender que Lúcia',
    alternatives: [
      { letter: 'A', text: 'estava envergonhada ao cantar.', correct: true },
      { letter: 'B', text: 'não gostava da professora.', correct: false },
      { letter: 'C', text: 'queria cancelar a festa da escola.', correct: false },
      { letter: 'D', text: 'já tinha apresentado para muitas turmas.', correct: false },
    ],
    conteudo_programatico: 'Interpretação de texto',
    descritor_saeb: 'D4 – Inferir informação implícita em um texto.',
    habilidade_bncc: 'EF35LP04 - Inferir informações implícitas nos textos lidos.',
    nivel_bloom: 'Compreender / Analisar',
    nivel_dificuldade: 'Difícil',
    tempo_medio_resolucao: 180,
    tipo_texto_base: 'Narrativa curta',
    fonte: 'Texto elaborado para este item.',
    creator_notes: buildCreatorNotes({
      gabarito: 'A',
      resolucao: `A - CORRETA: As ações de Lúcia (apertar as mãos, olhar para o chão e falar baixo) permitem inferir que ela estava envergonhada ou insegura ao cantar.
B - INCORRETA: O texto não indica que Lúcia não gostava da professora; a professora demonstra apoio.
C - INCORRETA: Lúcia participa do ensaio, e não há informação que indique vontade de cancelar a festa.
D - INCORRETA: O texto não informa que Lúcia já havia apresentado para muitas turmas.`,
      leitura:
        'O acerto indica que o estudante interpreta pistas de comportamento para inferir uma informação implícita. Os erros podem revelar inferências sem sustentação textual ou dificuldade em compreender sinais de emoção em uma narrativa.',
    }),
  },
  {
    codigo_item: 'LP5_D6_010',
    title: 'Campeonato de futebol',
    texto_base:
      'Aviso: Amanhã haverá campeonato de futebol na escola. Os alunos que quiserem participar devem levar tênis, garrafa de água e chegar no horário. As equipes serão organizadas antes do início dos jogos.',
    comando: 'Qual é o tema principal do texto?',
    alternatives: [
      { letter: 'A', text: 'As regras completas do futebol.', correct: false },
      { letter: 'B', text: 'A organização de um campeonato de futebol na escola.', correct: true },
      { letter: 'C', text: 'A rotina diária dos alunos na escola.', correct: false },
      { letter: 'D', text: 'A importância de beber água durante atividades físicas.', correct: false },
    ],
    conteudo_programatico: 'Interpretação de texto',
    descritor_saeb: 'D6 – Identificar o tema de um texto.',
    habilidade_bncc:
      'EF35LP03 – Identificar a ideia central do texto, demonstrando compreensão global.',
    nivel_bloom: 'Compreender',
    nivel_dificuldade: 'Fácil',
    tempo_medio_resolucao: 60,
    tipo_texto_base: 'Bilhete',
    fonte: 'Texto elaborado para fins pedagógicos.',
    creator_notes: buildCreatorNotes({
      gabarito: 'B',
      resolucao: `A - INCORRETA: O texto não apresenta regras do futebol, apenas informa sobre um evento.
B - CORRETA: O bilhete informa sobre a realização e organização de um campeonato de futebol na escola, que é o tema central.
C - INCORRETA: Não se trata da rotina dos alunos, mas de um evento específico.
D - INCORRETA: Embora cite a garrafa de água, isso não é o tema principal, apenas um detalhe.`,
      leitura:
        'O acerto indica que o estudante identifica o tema global em um gênero cotidiano e de circulação escolar. Os erros podem indicar foco em elementos secundários (como “água” ou “regras”) ou dificuldade em generalizar a informação principal.',
    }),
  },
  {
    codigo_item: 'LP5_D6_011',
    title: 'Apresentação de Ciências',
    texto_base:
      'Oi, turma!\nNão se esqueçam de que amanhã teremos a apresentação de Ciências. Cada grupo deve levar seu cartaz e se preparar para explicar o experimento. Quem ainda não terminou, precisa organizar o material hoje para não se atrasar. Vai ser um momento importante para compartilhar o que aprendemos!',
    comando: 'O texto trata principalmente da',
    alternatives: [
      { letter: 'A', text: 'importância de estudar Ciências todos os dias.', correct: false },
      { letter: 'B', text: 'dificuldade dos alunos em fazer experimentos.', correct: false },
      { letter: 'C', text: 'opinião do professor sobre a turma.', correct: false },
      { letter: 'D', text: 'organização de uma apresentação de trabalho escolar.', correct: true },
    ],
    conteudo_programatico: 'Interpretação de texto',
    descritor_saeb: 'D6 – Identificar o tema de um texto.',
    habilidade_bncc:
      'EF35LP03 – Identificar a ideia central do texto, demonstrando compreensão global.',
    nivel_bloom: 'Compreender',
    nivel_dificuldade: 'Médio',
    tempo_medio_resolucao: 60,
    tipo_texto_base: 'Mensagem em aplicativo',
    fonte: 'Texto elaborado para fins pedagógicos.',
    creator_notes: buildCreatorNotes({
      gabarito: 'D',
      resolucao: `A - INCORRETA: O texto não discute a importância geral da disciplina, mas um evento específico.
B - INCORRETA: Não há menção a dificuldades dos alunos.
C - INCORRETA: Não há opinião expressa, apenas instruções.
D - CORRETA: As orientações sobre cartaz, experimento e organização mostram que o foco é a apresentação do trabalho.`,
      leitura:
        'O acerto indica que o estudante articula informações distribuídas no texto para compreender o assunto central. Os erros podem revelar leitura fragmentada ou associação indevida a palavras-chave isoladas.',
      trilha: 'Nível 2 — Desenvolvimento da compreensão textual',
    }),
  },
  {
    codigo_item: 'LP5_D6_012',
    title: 'Se liga no voto',
    texto_base: 'Observe o cartaz abaixo e analise o slogan, a expressão “se liga” e a imagem do jovem com celular.',
    comando:
      'Ao relacionar o slogan, a expressão “se liga” e a imagem do jovem com celular, conclui-se que o cartaz tem como foco principal:',
    alternatives: [
      {
        letter: 'A',
        text: 'Destacar o uso das tecnologias digitais pelos jovens em diferentes situações do cotidiano.',
        correct: false,
      },
      {
        letter: 'B',
        text: 'Incentivar o jovem a se informar e participar das eleições por meio do alistamento eleitoral.',
        correct: true,
      },
      {
        letter: 'C',
        text: 'Informar sobre regras e obrigações relacionadas ao voto para todos os cidadãos brasileiros.',
        correct: false,
      },
      {
        letter: 'D',
        text: 'Divulgar datas importantes do calendário eleitoral para orientar a população em geral.',
        correct: false,
      },
    ],
    conteudo_programatico: 'Interpretação de texto',
    descritor_saeb: 'D6 – Identificar o tema de um texto.',
    habilidade_bncc:
      'EF35LP03 – Identificar a ideia central do texto, demonstrando compreensão global.',
    nivel_bloom: 'Lembrar / localizar',
    nivel_dificuldade: 'Difícil',
    tempo_medio_resolucao: 120,
    tipo_texto_base: 'Cartaz de campanha',
    fonte:
      'Rede social do TRE (@trernoficial). Tribunal Regional Eleitoral Do Rio Grande Do Norte. Disponível em: https://www.instagram.com/p/DX6oOsqlqpK/. Acesso em: 5 mai. 2026.',
    image_from_docx: 'word/media/image2.png',
    creator_notes: buildCreatorNotes({
      gabarito: 'B',
      resolucao: `A - INCORRETA: A tecnologia aparece como recurso de aproximação com o jovem, mas não é o foco temático central.
B - CORRETA: A articulação entre linguagem jovem (“se liga”), imagem do celular e informações sobre o título eleitoral revela que o objetivo é engajar o jovem no processo eleitoral.
C - INCORRETA: O texto não apresenta regras ou obrigações gerais, mas um convite à participação.
D - INCORRETA: As datas aparecem como apoio, não como foco principal da mensagem.`,
      leitura:
        'O acerto indica que o estudante consegue analisar a relação entre elementos verbais e visuais para construir o sentido global do texto. Os erros podem indicar leitura isolada de elementos (imagem ou palavras), dificuldade em interpretar linguagem figurada (“se liga”) ou em compreender a estratégia de comunicação com o público-alvo.',
      trilha: 'Nível 3 — Ampliação e aprofundamento',
    }),
  },
]

function extractCartazImageFromDocx(docxPath) {
  if (!existsSync(docxPath)) return null
  const tempDir = mkdtempSync(join(tmpdir(), 'gadelha-docx-'))
  try {
    execSync(`tar -xf "${docxPath}" -C "${tempDir}" word/media/image2.png`, { stdio: 'pipe' })
    const imagePath = join(tempDir, 'word', 'media', 'image2.png')
    if (!existsSync(imagePath)) return null
    return readFileSync(imagePath)
  } catch {
    return null
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
  const path = `seed/${codigoItem.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`
  const { error: uploadError } = await supabase.storage
    .from('question-images')
    .upload(path, buffer, { contentType: 'image/png', upsert: true })
  if (uploadError) throw uploadError
  const { data } = supabase.storage.from('question-images').getPublicUrl(path)
  return data.publicUrl
}

async function upsertQuestion(item, createdBy, imageUrlOverride) {
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
    habilidade_bncc: item.habilidade_bncc,
    nivel_bloom: normalizeBloom(item.nivel_bloom),
    nivel_dificuldade: item.nivel_dificuldade,
    tempo_medio_resolucao: item.tempo_medio_resolucao,
    tipo_texto_base: item.tipo_texto_base,
    fonte: item.fonte,
    question_type: 'multipla_escolha',
    point_value: POINT_BY_DIFFICULTY[item.nivel_dificuldade] ?? 1,
    creator_notes: item.creator_notes,
    is_form_exclusive: false,
    image_url: imageUrlOverride ?? null,
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
  console.log('Cadastrando questões Gadelha Group 2026...\n')

  if (!existsSync(DOCX_PATH)) {
    console.warn(`Aviso: DOCX não encontrado em ${DOCX_PATH}`)
    console.warn('Questões serão cadastradas sem imagem do cartaz (LP5_D6_012).\n')
  }

  const createdBy = await getAdminProfileId()
  if (!createdBy) {
    console.warn('Perfil admin não encontrado. Execute npm run seed:users primeiro.\n')
  }

  let cartazImageUrl = null
  const cartazBuffer = extractCartazImageFromDocx(DOCX_PATH)
  if (cartazBuffer) {
    cartazImageUrl = await uploadQuestionImage(cartazBuffer, 'LP5_D6_012')
    console.log(`✓ Imagem do cartaz enviada: ${cartazImageUrl}\n`)
  }

  for (const item of QUESTIONS) {
    const imageUrl = item.codigo_item === 'LP5_D6_012' ? cartazImageUrl : null
    await upsertQuestion(item, createdBy, imageUrl)
  }

  console.log(`\nConcluído: ${QUESTIONS.length} questões cadastradas no banco.`)
}

main().catch((err) => {
  console.error('Erro:', err.message || err)
  process.exit(1)
})
