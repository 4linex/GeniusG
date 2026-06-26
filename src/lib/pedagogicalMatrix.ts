/**
 * Matriz pedagógica LP 5º ano — descritores SAEB, habilidades BNCC e Bloom.
 */
import { SAEB_LP5_DESCRIPTORS, type SaebLp5Descriptor } from './saebLp5Reference'

export interface MatrixBnccSkill {
  code: string
  label: string
}

export interface MatrixSaebDescriptor {
  code: string
  label: string
  topic: string
  knowledgeArea: string
  bloomHint: string
  bnccCodes: string[]
}

export const MATRIX_BNCC_SKILLS: MatrixBnccSkill[] = [
  { code: 'EF15LP03', label: 'Localizar informações explícitas em textos.' },
  { code: 'EF35LP05', label: 'Inferir o sentido de palavras ou expressões desconhecidas em textos, com base no contexto.' },
  { code: 'EF05LP02', label: 'Identificar o caráter polissêmico das palavras, comparando usos científicos e cotidianos.' },
  { code: 'EF35LP04', label: 'Inferir informações implícitas nos textos lidos.' },
  { code: 'EF35LP03', label: 'Identificar a ideia central do texto, demonstrando compreensão global.' },
  { code: 'EF05LP16', label: 'Comparar informações sobre um mesmo fato em diferentes mídias e concluir qual é mais confiável.' },
  { code: 'EF05LP20', label: 'Analisar a validade e força de argumentos em argumentações sobre produtos de mídia infantil.' },
  { code: 'EF15LP04', label: 'Identificar o efeito de sentido de recursos gráfico-visuais em textos multissemióticos.' },
  { code: 'EF15LP14', label: 'Construir o sentido de HQs e tirinhas, relacionando imagens, palavras e recursos gráficos.' },
  { code: 'EF15LP18', label: 'Relacionar texto com ilustrações e outros recursos gráficos.' },
  { code: 'EF05LP23', label: 'Comparar informações apresentadas em gráficos ou tabelas.' },
  { code: 'EF05LP28', label: 'Observar recursos multissemióticos em ciberpoemas e minicontos digitais.' },
  { code: 'EF15LP01', label: 'Identificar a função social de textos que circulam em diferentes campos da vida social.' },
  { code: 'EF05LP09', label: 'Ler e compreender textos instrucionais de regras de jogo, considerando gênero e finalidade.' },
  { code: 'EF05LP10', label: 'Ler e compreender anedotas, piadas e cartuns, considerando gênero e finalidade.' },
  { code: 'EF05LP15', label: 'Ler/assistir notícias, reportagens e vlogs argumentativos do campo político-cidadão.' },
  { code: 'EF35LP06', label: 'Recuperar relações entre partes do texto, identificando substituições lexicais e pronominais coesivas.' },
  { code: 'EF35LP14', label: 'Identificar e usar pronomes como recurso coesivo anafórico na produção e leitura.' },
  { code: 'EF35LP26', label: 'Ler narrativas ficcionais observando enredo, tempo, espaço, personagens e discurso direto/indireto.' },
  { code: 'EF35LP29', label: 'Identificar cenário, conflito, resolução e ponto de vista em narrativas.' },
  { code: 'EF05LP07', label: 'Identificar conjunções e relações de adição, oposição, tempo, causa, condição e finalidade.' },
  { code: 'EF05LP04', label: 'Diferenciar pontuação e reconhecer efeitos de sentido de reticências, aspas e parênteses.' },
  { code: 'EF35LP22', label: 'Perceber diálogos em narrativas, observando verbos de enunciação e variedades linguísticas.' },
  { code: 'EF35LP30', label: 'Reconhecer marcas linguísticas de locutor e interlocutor em textos dialogados.' },
]

function toMatrixSaeb(desc: SaebLp5Descriptor): MatrixSaebDescriptor {
  return {
    code: desc.code,
    label: desc.label,
    topic: desc.topic,
    knowledgeArea: desc.knowledgeArea,
    bloomHint: desc.bloomHint ?? '',
    bnccCodes: desc.bnccCodes,
  }
}

export const MATRIX_SAEB_DESCRIPTORS: MatrixSaebDescriptor[] =
  SAEB_LP5_DESCRIPTORS.map(toMatrixSaeb)
