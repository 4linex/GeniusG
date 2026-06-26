/**
 * Matriz de Referência de Língua Portuguesa do SAEB — 5º ano EF.
 * Fonte: Inep/MEC (SAEB 2001; publicação 2022).
 * PDF: Matriz_de_Referencia_de_Lingua_Portuguesa.pdf
 */

export const SAEB_LP_KNOWLEDGE_AREA = 'Linguagens' as const

export const SAEB_LP5_TOPICS = {
  procedimentos: 'I. Procedimentos de Leitura',
  suporteGenero: 'II. Implicações do Suporte, do Gênero e/ou do Enunciador na Compreensão do Texto',
  relacaoTextos: 'III. Relação entre Textos',
  coerenciaCoesao: 'IV. Coerência e Coesão no Processamento do Texto',
  recursosExpressivos: 'V. Relações entre Recursos Expressivos e Efeitos de Sentido',
  variacaoLinguistica: 'VI. Variação Linguística',
} as const

export interface SaebLp5Descriptor {
  code: string
  label: string
  topic: (typeof SAEB_LP5_TOPICS)[keyof typeof SAEB_LP5_TOPICS]
  knowledgeArea: typeof SAEB_LP_KNOWLEDGE_AREA
  bloomHint?: string
  bnccCodes: string[]
}

/** 15 descritores SAEB de Língua Portuguesa — 5º ano do Ensino Fundamental. */
export const SAEB_LP5_DESCRIPTORS: SaebLp5Descriptor[] = [
  {
    code: 'D1',
    label: 'Localizar informações explícitas em um texto.',
    topic: SAEB_LP5_TOPICS.procedimentos,
    knowledgeArea: SAEB_LP_KNOWLEDGE_AREA,
    bloomHint: 'Memorizar / Lembrar',
    bnccCodes: ['EF15LP03'],
  },
  {
    code: 'D3',
    label: 'Inferir o sentido de uma palavra ou expressão.',
    topic: SAEB_LP5_TOPICS.procedimentos,
    knowledgeArea: SAEB_LP_KNOWLEDGE_AREA,
    bloomHint: 'Compreender',
    bnccCodes: ['EF35LP05', 'EF05LP02'],
  },
  {
    code: 'D4',
    label: 'Inferir uma informação implícita em um texto.',
    topic: SAEB_LP5_TOPICS.procedimentos,
    knowledgeArea: SAEB_LP_KNOWLEDGE_AREA,
    bloomHint: 'Compreender',
    bnccCodes: ['EF35LP04'],
  },
  {
    code: 'D6',
    label: 'Identificar o tema de um texto.',
    topic: SAEB_LP5_TOPICS.procedimentos,
    knowledgeArea: SAEB_LP_KNOWLEDGE_AREA,
    bloomHint: 'Compreender',
    bnccCodes: ['EF35LP03'],
  },
  {
    code: 'D11',
    label: 'Distinguir um fato da opinião relativa a esse fato.',
    topic: SAEB_LP5_TOPICS.procedimentos,
    knowledgeArea: SAEB_LP_KNOWLEDGE_AREA,
    bloomHint: 'Analisar / Avaliar',
    bnccCodes: ['EF05LP16', 'EF05LP20'],
  },
  {
    code: 'D5',
    label:
      'Interpretar texto com auxílio de material gráfico diverso (propagandas, quadrinhos, foto etc.).',
    topic: SAEB_LP5_TOPICS.suporteGenero,
    knowledgeArea: SAEB_LP_KNOWLEDGE_AREA,
    bloomHint: 'Compreender / Analisar',
    bnccCodes: ['EF15LP04', 'EF15LP14', 'EF15LP18', 'EF05LP23', 'EF05LP28'],
  },
  {
    code: 'D9',
    label: 'Identificar a finalidade de textos de diferentes gêneros.',
    topic: SAEB_LP5_TOPICS.suporteGenero,
    knowledgeArea: SAEB_LP_KNOWLEDGE_AREA,
    bloomHint: 'Compreender',
    bnccCodes: ['EF15LP01', 'EF05LP09', 'EF05LP10', 'EF05LP15'],
  },
  {
    code: 'D15',
    label:
      'Reconhecer diferentes formas de tratar uma informação na comparação de textos que tratam do mesmo tema, em função das condições em que ele foi produzido e daquelas em que será recebido.',
    topic: SAEB_LP5_TOPICS.relacaoTextos,
    knowledgeArea: SAEB_LP_KNOWLEDGE_AREA,
    bloomHint: 'Analisar / Avaliar',
    bnccCodes: ['EF05LP16'],
  },
  {
    code: 'D2',
    label:
      'Estabelecer relações entre partes de um texto, identificando repetições ou substituições que contribuem para a continuidade de um texto.',
    topic: SAEB_LP5_TOPICS.coerenciaCoesao,
    knowledgeArea: SAEB_LP_KNOWLEDGE_AREA,
    bloomHint: 'Analisar',
    bnccCodes: ['EF35LP06', 'EF35LP14'],
  },
  {
    code: 'D7',
    label: 'Identificar o conflito gerador do enredo e os elementos que constroem a narrativa.',
    topic: SAEB_LP5_TOPICS.coerenciaCoesao,
    knowledgeArea: SAEB_LP_KNOWLEDGE_AREA,
    bloomHint: 'Analisar',
    bnccCodes: ['EF35LP26', 'EF35LP29'],
  },
  {
    code: 'D8',
    label: 'Estabelecer relação causa/consequência entre partes e elementos do texto.',
    topic: SAEB_LP5_TOPICS.coerenciaCoesao,
    knowledgeArea: SAEB_LP_KNOWLEDGE_AREA,
    bloomHint: 'Analisar',
    bnccCodes: ['EF05LP07'],
  },
  {
    code: 'D12',
    label:
      'Estabelecer relações lógico-discursivas presentes no texto, marcadas por conjunções, advérbios etc.',
    topic: SAEB_LP5_TOPICS.coerenciaCoesao,
    knowledgeArea: SAEB_LP_KNOWLEDGE_AREA,
    bloomHint: 'Analisar',
    bnccCodes: ['EF05LP07'],
  },
  {
    code: 'D13',
    label: 'Identificar efeitos de ironia ou humor em textos variados.',
    topic: SAEB_LP5_TOPICS.recursosExpressivos,
    knowledgeArea: SAEB_LP_KNOWLEDGE_AREA,
    bloomHint: 'Analisar',
    bnccCodes: ['EF15LP14'],
  },
  {
    code: 'D14',
    label: 'Identificar o efeito de sentido decorrente do uso da pontuação e de outras notações.',
    topic: SAEB_LP5_TOPICS.recursosExpressivos,
    knowledgeArea: SAEB_LP_KNOWLEDGE_AREA,
    bloomHint: 'Analisar',
    bnccCodes: ['EF05LP04'],
  },
  {
    code: 'D10',
    label: 'Identificar as marcas linguísticas que evidenciam o locutor e o interlocutor de um texto.',
    topic: SAEB_LP5_TOPICS.variacaoLinguistica,
    knowledgeArea: SAEB_LP_KNOWLEDGE_AREA,
    bloomHint: 'Analisar',
    bnccCodes: ['EF35LP22', 'EF35LP30'],
  },
]

export const SAEB_LP5_DESCRIPTOR_CODES = new Set(SAEB_LP5_DESCRIPTORS.map((d) => d.code))
