import { APP_NAME, APP_TAGLINE } from '@/lib/branding'
import {
  PERFORMANCE_LEVEL_COLORS,
  PERFORMANCE_LEVEL_LABELS,
  type AreaPerformanceRow,
  type PerformanceBreakdownItem,
  type RecoveryReportData,
} from '@/lib/recoveryReport'

interface RecoveryReportDocumentProps {
  data: RecoveryReportData
}

function DonutChart({ percentage, breakdown }: { percentage: number; breakdown: PerformanceBreakdownItem[] }) {
  const size = 140
  const stroke = 18
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  const segments = breakdown.filter((b) => b.count > 0)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        {segments.map((seg) => {
          const segLen = (seg.percentage / 100) * circumference
          const dash = `${segLen} ${circumference - segLen}`
          const el = (
            <circle
              key={seg.level}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={PERFORMANCE_LEVEL_COLORS[seg.level]}
              strokeWidth={stroke}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          )
          offset += segLen
          return el
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold text-gray-800">{percentage}%</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wide">Desempenho</span>
      </div>
    </div>
  )
}

function ProgressBar({ percentage, level }: { percentage: number; level: AreaPerformanceRow['level'] }) {
  return (
    <div className="h-2 rounded-full bg-gray-100 overflow-hidden flex-1 min-w-[80px]">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.min(100, percentage)}%`, backgroundColor: PERFORMANCE_LEVEL_COLORS[level] }}
      />
    </div>
  )
}

function LegendDot({ level }: { level: AreaPerformanceRow['level'] }) {
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
      style={{ backgroundColor: PERFORMANCE_LEVEL_COLORS[level] }}
    />
  )
}

function MetaField({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="text-right">
      <p className="text-[10px] text-purple-200 uppercase tracking-wide">{label}</p>
      <p className="text-xs font-medium text-white">{value}</p>
    </div>
  )
}

export function RecoveryReportDocument({ data }: RecoveryReportDocumentProps) {
  const subtitle =
    data.kind === 'student'
      ? 'Relatório Individual do Aluno'
      : data.kind === 'form'
        ? 'Relatório do Formulário'
        : data.kind === 'dashboard'
          ? 'Relatório Geral — Dashboard Consolidado'
          : 'Análise por Habilidades, TRI e Bloom'

  const areaTableTitle =
    data.kind === 'student'
      ? 'Desempenho por Formulário'
      : data.kind === 'form'
        ? 'Desempenho por Habilidade BNCC'
        : data.kind === 'dashboard'
          ? 'Desempenho por Formulário'
          : 'Desempenho por Habilidade BNCC / SAEB'

  return (
    <div
      id="recovery-report-document"
      className="bg-white text-gray-800 font-sans"
      style={{ width: 794, minHeight: 1123 }}
    >
      {/* Header */}
      <div
        className="px-8 py-6 text-white"
        style={{ background: 'linear-gradient(to right, #7e22ce, #9333ea, #4f46e5)' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg font-bold">
              G
            </div>
            <div>
              <p className="text-sm font-semibold opacity-90">{APP_NAME}</p>
              <p className="text-[10px] opacity-70">{APP_TAGLINE}</p>
            </div>
          </div>
          <div className="flex gap-6 flex-wrap justify-end">
            <MetaField label="Data do relatório" value={data.reportDate} />
            {data.studentName && <MetaField label="Aluno(a)" value={data.studentName} />}
            {data.formTitle && <MetaField label="Formulário" value={data.formTitle} />}
            <MetaField label="Turma / Série" value={data.turma} />
            <MetaField label="Escola" value={data.escola} />
          </div>
        </div>
        <div className="mt-5">
          <h1 className="text-2xl font-bold tracking-tight">RELATÓRIO</h1>
          <p className="text-purple-100 text-sm mt-0.5">{subtitle}</p>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-[220px] shrink-0 border-r border-gray-100 bg-gray-50/80 p-5 space-y-5">
          <section>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-purple-700 mb-3">
              Resumo
            </h2>
            <dl className="space-y-2 text-xs">
              {data.studentName && (
                <div>
                  <dt className="text-gray-400">Nome</dt>
                  <dd className="font-medium text-gray-800">{data.studentName}</dd>
                </div>
              )}
              {data.studentEmail && (
                <div>
                  <dt className="text-gray-400">E-mail</dt>
                  <dd className="font-medium text-gray-800 break-all">{data.studentEmail}</dd>
                </div>
              )}
              {data.formTitle && (
                <div>
                  <dt className="text-gray-400">Formulário</dt>
                  <dd className="font-medium text-gray-800">{data.formTitle}</dd>
                </div>
              )}
              {data.turma && (
                <div>
                  <dt className="text-gray-400">Turma</dt>
                  <dd className="font-medium text-gray-800">{data.turma}</dd>
                </div>
              )}
              {data.periodo && (
                <div>
                  <dt className="text-gray-400">Período analisado</dt>
                  <dd className="font-medium text-gray-800">{data.periodo}</dd>
                </div>
              )}
              {data.averageTheta != null && (
                <div>
                  <dt className="text-gray-400">TRI médio (θ)</dt>
                  <dd className="font-medium text-gray-800">{data.averageTheta.toFixed(2)}</dd>
                </div>
              )}
              {data.summaryMetrics?.map((m) => (
                <div key={m.label}>
                  <dt className="text-gray-400">{m.label}</dt>
                  <dd className="font-medium text-gray-800">{m.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-purple-700 mb-3">
              Destaques
            </h2>
            <ul className="space-y-2">
              {data.highlights.map((h, i) => (
                <li key={i} className="flex gap-2 text-[11px] text-gray-600 leading-snug">
                  <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {h}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-purple-700 mb-3">
              Legenda de Desempenho
            </h2>
            <ul className="space-y-1.5">
              {(Object.keys(PERFORMANCE_LEVEL_LABELS) as Array<keyof typeof PERFORMANCE_LEVEL_LABELS>).map(
                (level) => (
                  <li key={level} className="flex items-center gap-2 text-[10px] text-gray-600">
                    <LegendDot level={level} />
                    {PERFORMANCE_LEVEL_LABELS[level]}
                  </li>
                ),
              )}
            </ul>
          </section>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 space-y-6">
          {/* Overview */}
          <section className="rounded-xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-4">Visão Geral do Desempenho</h2>
            <div className="flex items-center gap-6 flex-wrap">
              <DonutChart percentage={data.overallPercentage} breakdown={data.performanceBreakdown} />
              <div className="flex-1 min-w-[180px]">
                <p className="text-xs text-gray-500 leading-relaxed mb-3">
                  O percentual representa o desempenho médio nas avaliações analisadas, considerando
                  acertos por habilidade e nível de proficiência.
                </p>
                <ul className="space-y-1">
                  {data.performanceBreakdown
                    .filter((b) => b.count > 0)
                    .map((b) => (
                      <li key={b.level} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 text-gray-600">
                          <LegendDot level={b.level} />
                          {b.label}
                        </span>
                        <span className="font-semibold text-gray-800">{b.percentage}%</span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Area performance */}
          <section className="rounded-xl border border-gray-100 overflow-hidden">
            <h2 className="text-sm font-bold text-gray-800 px-5 pt-5 pb-3">
              {areaTableTitle}
            </h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-purple-50 text-purple-800">
                  <th className="text-left py-2 px-5 font-semibold">Área / Competência</th>
                  <th className="text-left py-2 px-3 font-semibold w-[140px]">Desempenho</th>
                  <th className="text-left py-2 px-5 font-semibold w-[100px]">Situação</th>
                </tr>
              </thead>
              <tbody>
                {data.areaRows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="py-2.5 px-5">
                      <p className="font-medium text-gray-800">{row.label}</p>
                      {row.detail && <p className="text-[10px] text-gray-400 mt-0.5">{row.detail}</p>}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar percentage={row.percentage} level={row.level} />
                        <span className="font-semibold text-gray-700 w-8">{row.percentage}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-5">
                      <span
                        className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          color: PERFORMANCE_LEVEL_COLORS[row.level],
                          backgroundColor: `${PERFORMANCE_LEVEL_COLORS[row.level]}18`,
                        }}
                      >
                        <LegendDot level={row.level} />
                        {PERFORMANCE_LEVEL_LABELS[row.level]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Bloom section for skills/form/student */}
          {data.kind === 'dashboard' && data.criticalSkillRows && data.criticalSkillRows.length > 0 && (
            <section className="rounded-xl border border-gray-100 overflow-hidden">
              <h2 className="text-sm font-bold text-gray-800 px-5 pt-5 pb-3">
                Habilidades com maior déficit (BNCC / SAEB)
              </h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-amber-50 text-amber-900">
                    <th className="text-left py-2 px-5 font-semibold">Habilidade</th>
                    <th className="text-left py-2 px-3 font-semibold w-[140px]">Desempenho</th>
                    <th className="text-left py-2 px-5 font-semibold w-[100px]">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {data.criticalSkillRows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="py-2.5 px-5 font-medium text-gray-800">{row.label}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <ProgressBar percentage={row.percentage} level={row.level} />
                          <span className="font-semibold text-gray-700 w-8">{row.percentage}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-5">
                        <span className="text-[10px] font-medium text-gray-600">
                          {PERFORMANCE_LEVEL_LABELS[row.level]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Bloom section for skills/form/student */}
          {data.bloomRows && data.bloomRows.length > 0 && (
            <section className="rounded-xl border border-gray-100 overflow-hidden">
              <h2 className="text-sm font-bold text-gray-800 px-5 pt-5 pb-3">Desempenho por Nível Bloom</h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-indigo-50 text-indigo-800">
                    <th className="text-left py-2 px-5 font-semibold">Nível cognitivo</th>
                    <th className="text-left py-2 px-3 font-semibold w-[140px]">Desempenho</th>
                    <th className="text-left py-2 px-5 font-semibold w-[100px]">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bloomRows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="py-2.5 px-5 font-medium text-gray-800">{row.label}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <ProgressBar percentage={row.percentage} level={row.level} />
                          <span className="font-semibold text-gray-700 w-8">{row.percentage}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-5">
                        <span className="text-[10px] font-medium text-gray-600">
                          {PERFORMANCE_LEVEL_LABELS[row.level]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* TRI summary for skills report */}
          {data.triSummary && data.triSummary.length > 0 && (
            <section className="rounded-xl border border-gray-100 overflow-hidden">
              <h2 className="text-sm font-bold text-gray-800 px-5 pt-5 pb-3">Proficiência TRI (θ) por Formulário</h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-violet-50 text-violet-800">
                    <th className="text-left py-2 px-5 font-semibold">Formulário</th>
                    <th className="text-left py-2 px-3 font-semibold">θ médio</th>
                    <th className="text-left py-2 px-3 font-semibold">TCT médio</th>
                    <th className="text-left py-2 px-5 font-semibold">Respostas</th>
                  </tr>
                </thead>
                <tbody>
                  {data.triSummary.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="py-2.5 px-5 font-medium text-gray-800">{row.label}</td>
                      <td className="py-2.5 px-3 font-semibold text-purple-700">
                        {row.averageTheta != null ? row.averageTheta.toFixed(2) : '—'}
                      </td>
                      <td className="py-2.5 px-3">{row.averageTct}%</td>
                      <td className="py-2.5 px-5">{row.totalResponses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Priority skills */}
          <section className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-red-100 bg-red-50/30 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-700 mb-3">
                Habilidades que precisam de mais apoio
              </h3>
              {data.weakSkills.length > 0 ? (
                <ul className="space-y-1.5">
                  {data.weakSkills.map((s, i) => (
                    <li key={i} className="flex gap-2 text-[11px] text-gray-700">
                      <span className="text-red-400">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-gray-500">Nenhuma habilidade crítica identificada.</p>
              )}
            </div>
            <div className="rounded-xl border border-purple-100 bg-purple-50/30 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-3">
                Próximos passos / Recomendações
              </h3>
              <ul className="space-y-1.5">
                {data.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2 text-[11px] text-gray-700">
                    <span className="text-purple-400">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </main>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-8 py-4 bg-gray-50">
        <p className="text-[11px] text-gray-500 text-center mb-3">
          💡 Com foco e continuidade, o aluno pode avançar ainda mais nas habilidades trabalhadas.
          Este relatório foi gerado automaticamente pela plataforma {APP_NAME}.
        </p>
        <div className="h-1 rounded-full" style={{ background: 'linear-gradient(to right, #9333ea, #6366f1)' }} />
        <p className="text-[10px] text-center text-gray-400 mt-2">
          {APP_NAME} · {APP_TAGLINE}
        </p>
      </div>
    </div>
  )
}
