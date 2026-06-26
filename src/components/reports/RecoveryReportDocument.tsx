import type { ReactNode } from 'react'
import { AlertTriangle, Brain, LineChart, Target, TrendingUp, type LucideIcon } from 'lucide-react'
import { APP_NAME, APP_TAGLINE } from '@/lib/branding'
import {
  PERFORMANCE_LEVEL_COLORS,
  PERFORMANCE_LEVEL_LABELS,
  type AreaPerformanceRow,
  type RecoveryReportData,
} from '@/lib/recoveryReport'
import {
  buildReportComparativo,
  buildReportKpiCards,
  buildReportMetaFields,
  reportAreaChartTitle,
  reportBnccAreaRows,
  reportBnccRows,
  reportKindSubtitle,
  reportPageTitle,
  reportShowsSection,
} from '@/lib/recoveryReportLayout'

interface RecoveryReportDocumentProps {
  data: RecoveryReportData
}

const PURPLE = '#7C3AED'
const BAR_PALETTE = ['#7C3AED', '#3b82f6', '#10b981', '#f59e0b', '#14b8a6', '#6366f1']
const TRACK = '#f1f5f9'

function BiCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      {subtitle ? <p className="mb-3.5 mt-1 text-[11px] leading-relaxed text-slate-500">{subtitle}</p> : <div className="mb-3.5" />}
      {children}
    </section>
  )
}

function kpiIcon(label: string): LucideIcon {
  const l = label.toLowerCase()
  if (l.includes('desempenho')) return Target
  if (l.includes('tri')) return LineChart
  if (l.includes('crític')) return AlertTriangle
  if (l.includes('competên')) return Brain
  return TrendingUp
}

function BarRow({ label, percentage, color, labelWidth = 120 }: { label: string; percentage: number; color: string; labelWidth?: number }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="shrink-0 text-right text-[10px] text-slate-600" style={{ width: labelWidth }}>
        {label.length > 26 ? `${label.slice(0, 24)}…` : label}
      </span>
      <div className="h-3.5 flex-1 overflow-hidden rounded-full" style={{ background: TRACK }}>
        <div className="h-full rounded-full" style={{ width: `${Math.max(2, percentage)}%`, background: color }} />
      </div>
      <span className="w-9 text-right text-[11px] font-bold text-slate-900">{percentage}%</span>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: 'alta' | 'media' | 'baixa' }) {
  const styles = {
    alta: 'text-red-600 bg-red-50',
    media: 'text-amber-600 bg-amber-50',
    baixa: 'text-emerald-600 bg-emerald-50',
  }[priority]
  const label = { alta: 'Alta', media: 'Média', baixa: 'Baixa' }[priority]
  return <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${styles}`}>{label}</span>
}

function CompetencyTable({ title, rows, accent, headerLabel }: { title: string; rows: AreaPerformanceRow[]; accent: string; headerLabel: string }) {
  if (rows.length === 0) return null
  return (
    <BiCard title={title}>
      <table className="w-full text-[10px]">
        <thead>
          <tr className="text-slate-500">
            <th className="w-14 px-2 py-1 text-left font-semibold">Código</th>
            <th className="px-2 py-1 text-left font-semibold">{headerLabel}</th>
            <th className="w-28 px-2 py-1 text-left font-semibold">Desempenho</th>
            <th className="w-24 px-2 py-1 text-left font-semibold">Situação</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 10).map((row, i) => (
            <tr key={i} className={i % 2 ? 'bg-slate-50' : ''}>
              <td className="px-2 py-2 font-bold" style={{ color: accent }}>{row.label.split(/[\s—-]/)[0] || '—'}</td>
              <td className="px-2 py-2 text-slate-700">{row.label}</td>
              <td className="px-2 py-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: TRACK }}>
                    <div className="h-full rounded-full" style={{ width: `${row.percentage}%`, background: accent }} />
                  </div>
                  <span className="font-bold text-slate-900">{row.percentage}%</span>
                </div>
              </td>
              <td className="px-2 py-2 text-[9px] font-semibold" style={{ color: PERFORMANCE_LEVEL_COLORS[row.level] }}>
                {PERFORMANCE_LEVEL_LABELS[row.level]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </BiCard>
  )
}

function EvolutionChart({ data }: { data: RecoveryReportData }) {
  const points = data.evolutionSeries ?? []
  if (points.length < 2) return null
  const w = 240
  const h = 120
  const padX = 24
  const padY = 16
  const max = Math.max(...points.map((p) => p.value), 100)
  const min = Math.min(...points.map((p) => p.value), 0)
  const range = max - min || 1
  const stepX = (w - padX * 2) / (points.length - 1)
  const coords = points.map((p, i) => {
    const x = padX + i * stepX
    const y = padY + (1 - (p.value - min) / range) * (h - padY * 2)
    return { x, y, ...p }
  })
  const line = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const delta = data.evolutionDelta
  return (
    <BiCard
      title="Evolução do Desempenho"
      subtitle={delta != null ? `Variação no período: ${delta > 0 ? '+' : ''}${delta}%` : undefined}
    >
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ maxWidth: w }}>
        <polyline fill="none" stroke={PURPLE} strokeWidth={2.5} points={line} />
        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={3.5} fill="#ffffff" stroke={PURPLE} strokeWidth={2} />
            <text x={c.x} y={c.y - 8} textAnchor="middle" fontSize={9} fontWeight={700} fill="#0f172a">
              {c.value}%
            </text>
            <text x={c.x} y={h - 2} textAnchor="middle" fontSize={8} fill="#64748b">
              {c.label}
            </text>
          </g>
        ))}
      </svg>
    </BiCard>
  )
}

export function RecoveryReportDocument({ data }: RecoveryReportDocumentProps) {
  const kind = data.kind
  const show = (s: Parameters<typeof reportShowsSection>[1]) => reportShowsSection(kind, s)
  const metaFields = buildReportMetaFields(data)
  const kpis = buildReportKpiCards(data)
  const comparativo = buildReportComparativo(data)
  const bnccRows = reportBnccRows(data)
  const bnccAreaRows = reportBnccAreaRows(data)

  return (
    <div
      id="recovery-report-document"
      className="font-sans text-slate-800"
      style={{ width: 794, minHeight: 1123, background: '#f1f5f9' }}
    >
      <div style={{ height: 4, background: 'linear-gradient(90deg,#6d28d9,#7C3AED,#4f46e5)' }} />
      <div className="border-b border-slate-200 bg-white px-6 pb-4 pt-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] text-slate-400">{APP_NAME} · {APP_TAGLINE}</p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">{reportPageTitle(kind)}</h1>
            <p className="mt-1.5 text-[11px] text-slate-500">{reportKindSubtitle(kind)}</p>
          </div>
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-extrabold text-white"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#4f46e5)' }}
          >
            G
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {metaFields.map((f) => (
            <div key={f.label} className="min-w-[140px] flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-3">
              <p className="text-[9px] uppercase tracking-wide text-slate-400">{f.label}</p>
              <p className="mt-1 text-xs font-semibold text-slate-900">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 px-5 py-5">
        {show('highlights') && data.highlights.length > 0 && (
          <BiCard title="Resumo" subtitle="Principais indicadores do recorte analisado">
            <ul className="space-y-2">
              {data.highlights.map((item, i) => (
                <li key={i} className="flex gap-2 text-[11px] text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                  {item}
                </li>
              ))}
            </ul>
          </BiCard>
        )}

        {show('kpis') && (
          <div className="flex flex-wrap gap-4">
            {kpis.map((kpi) => {
              const Icon = kpiIcon(kpi.label)
              return (
                <div key={kpi.label} className="min-w-[130px] flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500">{kpi.label}</p>
                      <p className="mt-2 text-3xl font-bold leading-none text-slate-900">{kpi.value}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{kpi.subtitle}</p>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${kpi.color}1f` }}>
                      <Icon size={18} style={{ color: kpi.color }} />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {show('studentTrail') && data.recommendedTrails && data.recommendedTrails.length > 0 && (
          <BiCard title="Trilha de Recomposição Recomendada" subtitle="Trilha indicada com base no desempenho do aluno.">
            {data.recommendedTrails.map((row, i) => (
              <div key={i} className="mb-2.5 rounded-xl border-2 p-3.5 last:mb-0" style={{ borderColor: PURPLE, background: '#faf5ff' }}>
                <p className="text-[10px] text-slate-500">
                  Formulário: <strong className="text-slate-700">{row.formTitle || '—'}</strong> · TCT:{' '}
                  <strong style={{ color: PURPLE }}>{row.studentPercent ?? '—'}%</strong>
                </p>
                <p className="mt-1 text-base font-bold text-slate-900">{row.trailTitle}</p>
                <p className="text-[10px] text-slate-500">Faixa: {row.percentRange || '—'}</p>
                {row.pedagogicalObjectives && <p className="mt-2 text-[10px] text-slate-700"><strong>Objetivos:</strong> {row.pedagogicalObjectives}</p>}
                {row.teacherNotes && <p className="mt-1 text-[10px] text-slate-700"><strong>Orientações:</strong> {row.teacherNotes}</p>}
              </div>
            ))}
          </BiCard>
        )}

        {(show('areaBars') || show('nivelDonut')) && (
          <div className="flex flex-wrap gap-4">
            {show('areaBars') && data.areaRows.length > 0 && (
              <div className="min-w-[280px] flex-1">
                <BiCard
                  title={reportAreaChartTitle(kind)}
                  subtitle={
                    kind === 'student'
                      ? 'Classificação: alto (≥70%), médio (40–69%), baixo (<40%)'
                      : kind === 'form' && data.areaRows.length > 1
                        ? 'Comparativo entre formulários do período'
                        : undefined
                  }
                >
                  {data.areaRows.slice(0, 8).map((row, i) => (
                    <BarRow
                      key={i}
                      label={row.detail ? `${row.label} · ${row.detail}` : row.label}
                      percentage={row.percentage}
                      color={BAR_PALETTE[i % BAR_PALETTE.length]}
                    />
                  ))}
                </BiCard>
              </div>
            )}
            {show('nivelDonut') && data.nivelDistribution && data.nivelDistribution.length > 0 && (
              <div className="min-w-[280px] flex-1">
                <BiCard title="Distribuição dos Alunos por Nível">
                  <div className="flex items-center gap-4">
                    <p className="text-2xl font-bold text-slate-900">
                      {data.nivelDistribution.reduce((s, x) => s + x.count, 0)}
                      <span className="block text-[8px] font-normal text-slate-500">respostas</span>
                    </p>
                    <ul className="flex-1 space-y-1.5 text-[10px]">
                      {data.nivelDistribution.map((seg) => (
                        <li key={seg.label} className="flex justify-between text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: seg.color }} />
                            {seg.label}
                          </span>
                          <strong className="text-slate-900">{seg.percentage}%</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                </BiCard>
              </div>
            )}
          </div>
        )}

        {show('bnccArea') && bnccAreaRows.length > 0 && (
          <BiCard
            title="Desempenho por Área do Conhecimento (BNCC)"
            subtitle="Média de acerto das habilidades BNCC agrupadas por componente curricular."
          >
            {bnccAreaRows.map((row, i) => (
              <BarRow
                key={row.label}
                label={`${row.label} (${row.count})`}
                percentage={row.percentage}
                color={BAR_PALETTE[i % BAR_PALETTE.length]}
                labelWidth={150}
              />
            ))}
          </BiCard>
        )}

        {(show('strongSkills') || show('bloom') || show('criticalSkills') || show('comparativo')) && (
          <div className="flex flex-wrap gap-4">
            {show('strongSkills') && (data.strongSkills?.length ?? 0) > 0 && (
              <div className="min-w-[200px] flex-1">
                <BiCard title="Desempenho Positivo" subtitle="Habilidades com bom desempenho (≥70%)">
                  <ul className="space-y-1.5 text-[10px] text-slate-700">
                    {data.strongSkills!.map((skill) => (
                      <li key={skill} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                        {skill}
                      </li>
                    ))}
                  </ul>
                </BiCard>
              </div>
            )}
            {show('bloom') && data.bloomRows && data.bloomRows.length > 0 && (
              <div className="min-w-[200px] flex-1">
                <BiCard title="Desempenho por Taxonomia de Bloom">
                  {data.bloomRows.map((row) => (
                    <BarRow key={row.label} label={row.label} percentage={row.percentage} color={PURPLE} labelWidth={88} />
                  ))}
                </BiCard>
              </div>
            )}
            {show('criticalSkills') && (
              <div className="min-w-[200px] flex-1">
                <BiCard title="Habilidades Críticas" subtitle="Déficits de aprendizagem (<60%)">
                  {data.criticalSkillsTable && data.criticalSkillsTable.length > 0 ? (
                    <table className="w-full text-[10px]">
                      <tbody>
                        {data.criticalSkillsTable.map((row, i) => (
                          <tr key={i} className={i % 2 ? 'bg-slate-50' : ''}>
                            <td className="px-1 py-1.5 font-semibold" style={{ color: PURPLE }}>{row.code}</td>
                            <td className="px-1 py-1.5 text-slate-600">{row.description.slice(0, 40)}…</td>
                            <td className="px-1 py-1.5 font-semibold text-slate-900">{row.percentage}%</td>
                            <td className="px-1 py-1.5"><PriorityBadge priority={row.priority} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-[11px] text-slate-500">Nenhuma habilidade crítica.</p>
                  )}
                </BiCard>
              </div>
            )}
            {show('comparativo') && comparativo.length > 0 && (
              <div className="min-w-[200px] flex-1">
                <BiCard title="Comparativo" subtitle={`${comparativo[0]?.scopeLabel} vs ${comparativo[0]?.referenceLabel}`}>
                  <div className="space-y-3">
                    {comparativo.map((row) => {
                      const maxVal = Math.max(row.scopeValue, row.referenceValue, 1)
                      const unit = row.label.includes('TRI') ? '' : '%'
                      return (
                        <div key={row.label}>
                          <p className="mb-1 text-[10px] font-semibold text-slate-900">{row.label}</p>
                          <div className="mb-1 flex items-center gap-2 text-[9px]">
                            <span className="w-10 text-slate-500">{row.scopeLabel}</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: TRACK }}>
                              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (row.scopeValue / maxVal) * 100)}%`, background: PURPLE }} />
                            </div>
                            <span className="font-semibold text-slate-900">{row.scopeValue}{unit}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[9px]">
                            <span className="w-10 text-slate-500">{row.referenceLabel}</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: TRACK }}>
                              <div className="h-full rounded-full bg-slate-400" style={{ width: `${Math.min(100, (row.referenceValue / maxVal) * 100)}%` }} />
                            </div>
                            <span className="font-semibold text-slate-500">{row.referenceValue}{unit}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </BiCard>
              </div>
            )}
          </div>
        )}

        {(show('bncc') || show('saeb') || show('saebErrors')) && (
          <div className="flex flex-wrap gap-4">
            {show('bncc') && bnccRows.length > 0 && (
              <div className="min-w-[200px] flex-1"><CompetencyTable title="Desempenho por Competência (BNCC)" rows={bnccRows} accent={PURPLE} headerLabel="Habilidade BNCC" /></div>
            )}
            {show('saeb') && data.saebRows && data.saebRows.length > 0 && (
              <div className="min-w-[200px] flex-1"><CompetencyTable title="Desempenho por Descritor (SAEB)" rows={data.saebRows} accent="#3b82f6" headerLabel="Descritor SAEB" /></div>
            )}
            {show('saebErrors') && data.errorDescriptors && data.errorDescriptors.length > 0 && (
              <div className="min-w-[200px] flex-1">
                <BiCard title="Descritores com Maior Índice de Erro">
                  <table className="w-full text-[10px]">
                    <tbody>
                      {data.errorDescriptors.map((row, i) => (
                        <tr key={i} className={i % 2 ? 'bg-slate-50' : ''}>
                          <td className="px-1 py-2 font-semibold text-red-600">{row.code}</td>
                          <td className="px-1 py-2 text-slate-600">{row.description}</td>
                          <td className="px-1 py-2 font-bold text-red-600">{row.errorRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </BiCard>
              </div>
            )}
          </div>
        )}

        {show('tri') && data.triSummary && data.triSummary.length > 0 && (
          <BiCard title="Proficiência TRI (θ) por Avaliação">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-slate-500">
                  <th className="px-2 py-1.5 text-left font-semibold">Avaliação</th>
                  <th className="px-2 py-1.5 font-semibold">θ</th>
                  <th className="px-2 py-1.5 font-semibold">TCT</th>
                  <th className="px-2 py-1.5 font-semibold">N</th>
                </tr>
              </thead>
              <tbody>
                {data.triSummary.map((row, i) => (
                  <tr key={i} className={i % 2 ? 'bg-slate-50' : ''}>
                    <td className="px-2 py-2 text-slate-700">{row.label}</td>
                    <td className="px-2 py-2 font-bold" style={{ color: PURPLE }}>{row.averageTheta?.toFixed(2) ?? '—'}</td>
                    <td className="px-2 py-2 text-slate-900">{row.averageTct}%</td>
                    <td className="px-2 py-2 text-slate-900">{row.totalResponses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </BiCard>
        )}

        {show('trailRanking') && data.trailRanking && data.trailRanking.length > 0 && (
          <BiCard title="Ranking de Trilhas em Uso" subtitle="Ordenado por número de alunos.">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-slate-500">
                  <th className="w-8 px-2 py-1.5 font-semibold">#</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Trilha</th>
                  <th className="px-2 py-1.5 font-semibold">Faixa</th>
                  <th className="px-2 py-1.5 font-semibold">Alunos</th>
                </tr>
              </thead>
              <tbody>
                {data.trailRanking.map((row) => (
                  <tr key={row.rank}>
                    <td className="px-2 py-2 font-bold" style={{ color: PURPLE }}>{row.rank}</td>
                    <td className="px-2 py-2 font-medium text-slate-900">{row.title}</td>
                    <td className="px-2 py-2 text-slate-500">{row.percentRange}</td>
                    <td className="px-2 py-2 font-semibold text-slate-900">{row.studentCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </BiCard>
        )}

        {show('formTrails') && data.recommendedTrails && data.recommendedTrails.length > 0 && (
          <BiCard title="Trilhas Atribuídas no Formulário">
            {data.recommendedTrails.slice(0, 6).map((row, i) => (
              <p key={i} className="mb-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-600 last:mb-0">
                <strong className="text-slate-900">{row.studentName}</strong> · {row.studentPercent}% · {row.trailTitle}
              </p>
            ))}
          </BiCard>
        )}

        {(show('evolution') || show('recommendations') || show('executiveSummary')) && (
          <div className="flex flex-wrap gap-4">
            {show('evolution') && (data.evolutionSeries?.length ?? 0) >= 2 && (
              <div className="min-w-[200px] flex-1">
                <EvolutionChart data={data} />
              </div>
            )}
            {show('recommendations') && (data.recommendations?.length ?? 0) > 0 && (
              <div className="min-w-[200px] flex-1">
                <BiCard title="Recomendações">
                  <ul className="space-y-2">
                    {(data.recommendations ?? []).map((r, i) => (
                      <li key={i} className="flex gap-2 text-[11px] text-slate-700">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-violet-100 text-[10px] font-bold text-violet-700">{i + 1}</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </BiCard>
              </div>
            )}
            {show('executiveSummary') && data.executiveSummary && (
              <div className="min-w-[200px] flex-1">
                <BiCard title="Resumo Executivo">
                  <p className="text-[11px] leading-relaxed text-slate-700">{data.executiveSummary}</p>
                </BiCard>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white px-6 py-3.5 text-center">
        <p className="text-[9px] text-slate-400">Relatório gerado automaticamente · {APP_NAME}</p>
      </div>
    </div>
  )
}
