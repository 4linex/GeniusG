import {
  PERFORMANCE_LEVEL_LABELS,
  percentageToLevel,
  type RecoveryReportData,
  type RecoveryReportKind,
} from '@/lib/recoveryReport'

export type ReportSectionId =
  | 'kpis'
  | 'highlights'
  | 'studentTrail'
  | 'areaBars'
  | 'nivelDonut'
  | 'bloom'
  | 'criticalSkills'
  | 'strongSkills'
  | 'comparativo'
  | 'bnccArea'
  | 'bncc'
  | 'saeb'
  | 'saebErrors'
  | 'tri'
  | 'trailRanking'
  | 'formTrails'
  | 'evolution'
  | 'recommendations'
  | 'executiveSummary'

const AGGREGATE_SECTIONS: ReportSectionId[] = [
  'kpis',
  'highlights',
  'areaBars',
  'nivelDonut',
  'bnccArea',
  'bloom',
  'criticalSkills',
  'comparativo',
  'bncc',
  'saeb',
  'saebErrors',
  'tri',
  'trailRanking',
  'evolution',
  'recommendations',
  'executiveSummary',
]

/** Seções visíveis por tipo de relatório — o layout visual é o mesmo; só muda o conteúdo. */
export const REPORT_SECTIONS: Record<RecoveryReportKind, ReportSectionId[]> = {
  dashboard: AGGREGATE_SECTIONS,
  municipio: [
    'kpis',
    'highlights',
    'comparativo',
    'areaBars',
    'bnccArea',
    'criticalSkills',
    'bncc',
    'tri',
    'evolution',
    'executiveSummary',
  ],
  escola: [
    'kpis',
    'highlights',
    'areaBars',
    'trailRanking',
    'tri',
    'comparativo',
    'criticalSkills',
    'bnccArea',
    'evolution',
    'executiveSummary',
  ],
  turma: [
    'kpis',
    'highlights',
    'nivelDonut',
    'trailRanking',
    'criticalSkills',
    'bncc',
    'studentTrail',
    'evolution',
    'executiveSummary',
  ],
  student: [
    'highlights',
    'kpis',
    'areaBars',
    'criticalSkills',
    'strongSkills',
    'studentTrail',
  ],
  studentForm: [
    'highlights',
    'kpis',
    'criticalSkills',
    'strongSkills',
    'studentTrail',
  ],
  form: [
    'highlights',
    'kpis',
    'nivelDonut',
    'areaBars',
    'criticalSkills',
    'bloom',
    'formTrails',
    'tri',
  ],
  skills: [
    'highlights',
    'kpis',
    'bloom',
    'bncc',
    'saeb',
    'tri',
  ],
}

export function reportShowsSection(kind: RecoveryReportKind, section: ReportSectionId): boolean {
  return REPORT_SECTIONS[kind].includes(section)
}

export function reportPageTitle(kind: RecoveryReportKind): string {
  const titles: Record<RecoveryReportKind, string> = {
    dashboard: 'Visão Geral Consolidada',
    turma: 'Visão Geral da Turma',
    escola: 'Visão Geral da Escola',
    municipio: 'Visão Geral do Município',
    student: 'Relatório Geral do Aluno',
    studentForm: 'Relatório do Aluno por Formulário',
    form: 'Visão Geral do Formulário',
    skills: 'Análise de Habilidades',
  }
  return titles[kind]
}

export function reportKindSubtitle(kind: RecoveryReportKind): string {
  switch (kind) {
    case 'student':
      return 'Déficits, destaques, ranking por formulário e trilhas indicadas'
    case 'studentForm':
      return 'Déficits, destaques, acertos e trilha recomendada'
    case 'form':
      return 'Desempenho da avaliação, déficits, trilhas e TRI'
    case 'skills':
      return 'Análise BNCC, SAEB, Bloom e TRI do recorte'
    default:
      return 'Relatório pedagógico · BNCC · SAEB · Bloom · TRI'
  }
}

export function reportAreaChartTitle(kind: RecoveryReportKind): string {
  if (kind === 'municipio') return 'Desempenho por Escola'
  if (kind === 'escola') return 'Desempenho por Turma'
  if (kind === 'skills') return 'Desempenho por Habilidade BNCC'
  if (kind === 'form') return 'Desempenho por Avaliação'
  if (kind === 'student') return 'Ranking por Formulário (alto · médio · baixo)'
  return 'Desempenho por Avaliação'
}

export interface ReportMetaField {
  label: string
  value: string
}

export function buildReportMetaFields(data: RecoveryReportData): ReportMetaField[] {
  const fields: ReportMetaField[] = []

  if ((data.kind === 'student' || data.kind === 'studentForm') && data.studentName) {
    fields.push({ label: 'Aluno(a)', value: data.studentName })
  }
  if (data.kind === 'studentForm' && data.formTitle) {
    fields.push({ label: 'Formulário', value: data.formTitle })
  }
  if ((data.kind === 'student' || data.kind === 'studentForm') && data.escola && data.escola !== '—') {
    fields.push({ label: 'Escola', value: data.escola })
  }
  if ((data.kind === 'student' || data.kind === 'studentForm') && data.turma && data.turma !== '—') {
    fields.push({ label: 'Turma', value: data.turma })
  }
  if (data.kind === 'form' && data.formTitle) {
    fields.push({ label: 'Formulário', value: data.formTitle })
  }
  if (data.municipio) {
    fields.push({ label: 'Município', value: data.municipio })
  }
  if (
    data.kind !== 'student' &&
    data.kind !== 'studentForm' &&
    data.escola &&
    data.escola !== 'Todas as escolas'
  ) {
    fields.push({ label: 'Escola', value: data.escola })
  }
  if (
    data.kind !== 'student' &&
    data.kind !== 'studentForm' &&
    data.turma &&
    data.turma !== 'Visão consolidada'
  ) {
    fields.push({ label: 'Turma', value: data.turma })
  }
  if (data.professor) {
    fields.push({ label: 'Professor(a)', value: data.professor })
  }
  if (data.periodo) {
    fields.push({ label: 'Período da Avaliação', value: data.periodo })
  }

  const alunosMetric = data.summaryMetrics?.find(
    (m) => m.label.toLowerCase().includes('aluno'),
  )
  const respostasMetric = data.summaryMetrics?.find(
    (m) => m.label.toLowerCase().includes('resposta'),
  )
  const formulariosMetric = data.summaryMetrics?.find(
    (m) => m.label.toLowerCase().includes('formulário'),
  )

  if (data.participation && data.participation.expected > 0) {
    fields.push({
      label: 'Alunos Avaliados',
      value: `${data.participation.evaluated} de ${data.participation.expected} (${data.participation.rate}% de participação)`,
    })
  } else if (alunosMetric) {
    fields.push({ label: 'Alunos Avaliados', value: alunosMetric.value })
  } else if (data.kind === 'student' && data.studentName) {
    fields.push({ label: 'Aluno Avaliado', value: data.studentName })
  }

  if (respostasMetric) {
    fields.push({ label: 'Total de Respostas', value: respostasMetric.value })
  } else if (formulariosMetric) {
    fields.push({ label: 'Total de Avaliações', value: formulariosMetric.value })
  } else if (data.totalItems != null) {
    fields.push({ label: 'Itens Analisados', value: String(data.totalItems) })
  }

  fields.push({ label: 'Gerado em', value: data.reportDate })

  return fields
}

export interface ReportKpiCard {
  label: string
  value: string
  subtitle: string
  color: string
  sparkline: number[]
}

export function buildReportKpiCards(data: RecoveryReportData): ReportKpiCard[] {
  switch (data.kind) {
    case 'student':
      return buildStudentKpiCards(data)
    case 'studentForm':
      return buildStudentFormKpiCards(data)
    case 'form':
      return buildFormKpiCards(data)
    case 'skills':
      return buildSkillsKpiCards(data)
    default:
      return buildDefaultKpiCards(data)
  }
}

function sparkFromBreakdown(data: RecoveryReportData): number[] {
  const sparkBase = data.performanceBreakdown
    .filter((b) => b.count > 0)
    .map((b) => b.percentage)
  return sparkBase.length >= 2 ? sparkBase : [data.overallPercentage, data.overallPercentage]
}

function buildStudentKpiCards(data: RecoveryReportData): ReportKpiCard[] {
  const sparkline = sparkFromBreakdown(data)
  const criticalCount =
    data.criticalSkillsTable?.length ?? data.weakSkills?.length ?? 0
  const trailCount = data.recommendedTrails?.length ?? 0
  const strongCount = data.strongSkills?.length ?? 0

  return [
    {
      label: 'Desempenho Geral',
      value: `${data.overallPercentage}%`,
      subtitle: PERFORMANCE_LEVEL_LABELS[percentageToLevel(data.overallPercentage)],
      color: '#7C3AED',
      sparkline,
    },
    {
      label: 'Formulários',
      value: String(data.totalItems ?? 0),
      subtitle: 'Avaliações respondidas',
      color: '#3B82F6',
      sparkline,
    },
    {
      label: 'Trilhas Indicadas',
      value: String(trailCount),
      subtitle: trailCount > 0 ? 'Recomposição atribuída' : 'Nenhuma trilha',
      color: '#10B981',
      sparkline: [trailCount, trailCount],
    },
    {
      label: 'Déficits',
      value: String(criticalCount),
      subtitle: 'Habilidades abaixo de 60%',
      color: '#EF4444',
      sparkline: [criticalCount, Math.max(0, criticalCount - 1), criticalCount],
    },
    {
      label: 'Destaques',
      value: String(strongCount),
      subtitle: 'Habilidades com bom desempenho',
      color: '#F59E0B',
      sparkline: [strongCount, strongCount],
    },
  ]
}

function buildStudentFormKpiCards(data: RecoveryReportData): ReportKpiCard[] {
  const sparkline = sparkFromBreakdown(data)
  const acertos = data.summaryMetrics?.find((m) => m.label.toLowerCase().includes('corret'))
  const criticalCount =
    data.criticalSkillsTable?.length ?? data.weakSkills?.length ?? 0
  const strongCount = data.strongSkills?.length ?? 0

  return [
    {
      label: 'Taxa de Acerto',
      value: `${data.overallPercentage}%`,
      subtitle: PERFORMANCE_LEVEL_LABELS[percentageToLevel(data.overallPercentage)],
      color: '#7C3AED',
      sparkline,
    },
    {
      label: 'Questões',
      value: acertos?.value ?? '—',
      subtitle: 'Acertos nesta avaliação',
      color: '#3B82F6',
      sparkline,
    },
    {
      label: 'TRI (θ)',
      value: data.averageTheta != null ? String(data.averageTheta) : '—',
      subtitle: data.averageTheta != null ? 'Proficiência' : 'Sem calibração',
      color: '#6366F1',
      sparkline,
    },
    {
      label: 'Déficits',
      value: String(criticalCount),
      subtitle: 'Habilidades a reforçar',
      color: '#EF4444',
      sparkline: [criticalCount, criticalCount],
    },
    {
      label: 'Destaques',
      value: String(strongCount),
      subtitle: 'Habilidades com bom desempenho',
      color: '#10B981',
      sparkline: [strongCount, strongCount],
    },
  ]
}

function buildFormKpiCards(data: RecoveryReportData): ReportKpiCard[] {
  const sparkline = sparkFromBreakdown(data)
  const criticalCount =
    data.criticalSkillsTable?.length ?? data.weakSkills?.length ?? 0
  const alunosMetric = data.summaryMetrics?.find((m) =>
    m.label.toLowerCase().includes('aluno'),
  )

  return [
    {
      label: 'TCT Médio',
      value: `${data.overallPercentage}%`,
      subtitle: PERFORMANCE_LEVEL_LABELS[percentageToLevel(data.overallPercentage)],
      color: '#7C3AED',
      sparkline,
    },
    {
      label: 'Respostas',
      value: String(data.totalItems ?? 0),
      subtitle: 'No recorte do relatório',
      color: '#3B82F6',
      sparkline,
    },
    {
      label: 'Alunos',
      value: alunosMetric?.value ?? '—',
      subtitle: 'Participantes',
      color: '#10B981',
      sparkline,
    },
    {
      label: 'TRI Médio',
      value: data.averageTheta != null ? String(data.averageTheta) : '—',
      subtitle: data.averageTheta != null ? 'Proficiência (θ)' : 'Sem dados TRI',
      color: '#6366F1',
      sparkline,
    },
    {
      label: 'Déficits',
      value: String(criticalCount),
      subtitle: 'Competências abaixo de 60%',
      color: '#EF4444',
      sparkline: [criticalCount, criticalCount],
    },
  ]
}

function buildSkillsKpiCards(data: RecoveryReportData): ReportKpiCard[] {
  const sparkline = sparkFromBreakdown(data)
  const bnccCount = data.bnccRows?.length ?? 0
  const saebCount = data.saebRows?.length ?? 0
  const criticalCount =
    data.criticalSkillsTable?.length ?? data.weakSkills?.length ?? 0

  return [
    {
      label: 'TCT Médio',
      value: `${data.overallPercentage}%`,
      subtitle: 'Média das respostas filtradas',
      color: '#7C3AED',
      sparkline,
    },
    {
      label: 'BNCC',
      value: String(bnccCount),
      subtitle: 'Habilidades mapeadas',
      color: '#3B82F6',
      sparkline: [bnccCount, bnccCount],
    },
    {
      label: 'SAEB',
      value: String(saebCount),
      subtitle: 'Descritores mapeados',
      color: '#10B981',
      sparkline: [saebCount, saebCount],
    },
    {
      label: 'Críticas',
      value: String(criticalCount),
      subtitle: 'Abaixo de 60% de acerto',
      color: '#EF4444',
      sparkline: [criticalCount, criticalCount],
    },
    {
      label: 'TRI Médio',
      value: data.averageTheta != null ? String(data.averageTheta) : '—',
      subtitle: data.averageTheta != null ? 'Proficiência (θ)' : 'Sem dados TRI',
      color: '#F59E0B',
      sparkline,
    },
  ]
}

function buildDefaultKpiCards(data: RecoveryReportData): ReportKpiCard[] {
  const level = PERFORMANCE_LEVEL_LABELS[percentageToLevel(data.overallPercentage)]
  const criticalCount =
    data.criticalSkillsTable?.length ?? data.weakSkills.length ?? 0
  const competencyCount =
    (data.bnccRows?.length ?? 0) + (data.saebRows?.length ?? 0) || data.totalItems || 0

  const sparkline = sparkFromBreakdown(data)

  const participacaoMetric = data.summaryMetrics?.find((m) =>
    m.label.toLowerCase().includes('particip'),
  )

  const hasEvolution =
    data.evolutionDelta != null && (data.evolutionSeries?.length ?? 0) >= 2
  const evolutionValue =
    data.evolutionDelta != null
      ? `${data.evolutionDelta > 0 ? '+' : ''}${data.evolutionDelta}%`
      : '—'
  const fifthCard: ReportKpiCard = hasEvolution
    ? {
        label: data.kind === 'student' ? 'Evolução do Aluno' : 'Evolução',
        value: evolutionValue,
        subtitle: 'Em relação ao período inicial',
        color: (data.evolutionDelta ?? 0) >= 0 ? '#F59E0B' : '#EF4444',
        sparkline: data.evolutionSeries?.map((p) => p.value) ?? sparkline,
      }
    : {
        label: participacaoMetric ? 'Participação' : 'Respostas',
        value:
          participacaoMetric?.value ??
          (data.participation
            ? `${data.participation.rate}%`
            : String(data.totalItems ?? data.highlights[0]?.match(/\d+/)?.[0] ?? '—')),
        subtitle: participacaoMetric ? 'Taxa de participação' : 'Volume analisado',
        color: '#F59E0B',
        sparkline,
      }

  return [
    {
      label: 'Desempenho Geral',
      value: `${data.overallPercentage}%`,
      subtitle: level,
      color: '#7C3AED',
      sparkline,
    },
    {
      label: 'TRI Médio',
      value: data.averageTheta != null ? String(data.averageTheta) : '—',
      subtitle: data.averageTheta != null ? 'Proficiência (θ)' : 'Sem dados TRI',
      color: '#3B82F6',
      sparkline: data.triSummary?.map((t) => t.averageTct).slice(0, 5) ?? sparkline,
    },
    {
      label: 'Habilidades Críticas',
      value: String(criticalCount),
      subtitle: criticalCount > 0 ? 'Requer atenção' : 'Nenhuma crítica',
      color: '#EF4444',
      sparkline: [criticalCount, Math.max(0, criticalCount - 1), criticalCount],
    },
    {
      label: 'Competências Avaliadas',
      value: String(competencyCount),
      subtitle: 'BNCC + SAEB',
      color: '#10B981',
      sparkline: [competencyCount * 0.8, competencyCount * 0.9, competencyCount],
    },
    fifthCard,
  ]
}

export interface ReportComparativoRow {
  label: string
  scopeLabel: string
  scopeValue: number
  referenceLabel: string
  referenceValue: number
}

/** Comparativo com dados reais calculados no builder; sem estimativas. */
export function buildReportComparativo(data: RecoveryReportData): ReportComparativoRow[] {
  if (!reportShowsSection(data.kind, 'comparativo')) return []
  return data.comparisonRows ?? []
}

/** Linhas BNCC — sempre habilidades BNCC, nunca descritores SAEB. */
export function reportBnccRows(data: RecoveryReportData) {
  return data.bnccRows ?? []
}

const BNCC_COMPONENTS: Record<string, string> = {
  LP: 'Língua Portuguesa',
  LI: 'Língua Inglesa',
  AR: 'Arte',
  EF: 'Educação Física',
  MA: 'Matemática',
  CI: 'Ciências',
  GE: 'Geografia',
  HI: 'História',
  ER: 'Ensino Religioso',
  LGG: 'Linguagens',
  LGP: 'Língua Portuguesa',
  MAT: 'Matemática',
  CNT: 'Ciências da Natureza',
  CHS: 'Ciências Humanas',
}

export interface ReportBnccArea {
  label: string
  percentage: number
  count: number
}

/** Agrupa as habilidades BNCC por componente/área do conhecimento a partir do código. */
export function reportBnccAreaRows(data: RecoveryReportData): ReportBnccArea[] {
  const rows = data.bnccRows ?? []
  if (rows.length === 0) return []

  const groups = new Map<string, { sum: number; count: number }>()
  for (const row of rows) {
    const code = row.label.trim().toUpperCase()
    const match = code.match(/^E[FMI]\d{2}([A-Z]{2,3})/)
    const comp = match?.[1] ?? 'OUTROS'
    const label = BNCC_COMPONENTS[comp] ?? 'Outras habilidades'
    const cur = groups.get(label) || { sum: 0, count: 0 }
    cur.sum += row.percentage
    cur.count += 1
    groups.set(label, cur)
  }

  return [...groups.entries()]
    .map(([label, g]) => ({ label, percentage: Math.round(g.sum / g.count), count: g.count }))
    .sort((a, b) => b.percentage - a.percentage)
}
