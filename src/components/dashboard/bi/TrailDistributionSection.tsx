import { Route } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BiCard, BiSectionHeader } from '@/components/dashboard/bi/BiCard'
import { useIsMobile, useIsTablet } from '@/hooks/useMediaQuery'
import type { TrailDistributionRow } from '@/lib/trailDistribution'

const TRAIL_COLORS = ['#8b5cf6', '#6366f1', '#10b981', '#14b8a6', '#f59e0b', '#3b82f6']

interface TrailDistributionSectionProps {
  rows: TrailDistributionRow[]
}

export function TrailDistributionSection({ rows }: TrailDistributionSectionProps) {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const totalStudents = rows.reduce((sum, row) => sum + row.studentCount, 0)
  const chartData = rows.map((row, index) => ({
    name: row.title.length > (isMobile ? 18 : 28) ? `${row.title.slice(0, isMobile ? 16 : 26)}…` : row.title,
    fullTitle: row.title,
    students: row.studentCount,
    range: row.percentRange,
    color: row.key === 'sem-trilha' ? '#ef4444' : TRAIL_COLORS[index % TRAIL_COLORS.length],
  }))
  const yAxisWidth = isMobile ? 96 : isTablet ? 120 : 140
  const chartHeight = Math.max(160, chartData.length * (isMobile ? 40 : 48) + 24)

  return (
    <BiCard className="min-w-0 border-primary-500/25 bg-gradient-to-br from-primary-500/10 via-transparent to-transparent">
      <BiSectionHeader
        title="Alunos por trilha de recomposição"
        subtitle="Quantidade de alunos direcionados a cada trilha conforme o desempenho nas avaliações"
        action={
          <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500/15 px-3 py-2 text-primary-200 sm:w-auto sm:justify-start">
            <Route size={16} />
            <span className="text-sm font-semibold">{totalStudents} alunos</span>
          </div>
        }
      />

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          Nenhum aluno com trilha atribuída no escopo filtrado.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="w-full min-w-0" style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 16, left: isMobile ? 0 : 4, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: '#94a3b8', fontSize: isMobile ? 10 : 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={yAxisWidth}
                  tick={{ fill: '#cbd5e1', fontSize: isMobile ? 10 : 11 }}
                />
                <Tooltip
                  cursor={false}
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(value) => [Number(value ?? 0), 'Alunos']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTitle ?? ''}
                />
                <Bar dataKey="students" radius={[0, 10, 10, 0]} maxBarSize={isMobile ? 22 : 28}>
                  {chartData.map((entry) => (
                    <Cell key={entry.fullTitle} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            {rows.map((row, index) => (
              <div
                key={row.key}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          row.key === 'sem-trilha'
                            ? '#ef4444'
                            : TRAIL_COLORS[index % TRAIL_COLORS.length],
                      }}
                    />
                    <p className="text-sm font-medium leading-snug text-white">{row.title}</p>
                  </div>
                  <p className="mt-1 text-[13px] text-slate-500">{row.percentRange}</p>
                </div>
                <div className="flex items-baseline justify-between gap-3 sm:block sm:text-right">
                  <p className="text-2xl font-bold text-white tabular-nums">{row.studentCount}</p>
                  <p className="text-[13px] text-slate-500">
                    aluno{row.studentCount !== 1 ? 's' : ''}
                    {row.responseCount !== row.studentCount && (
                      <span> · {row.responseCount} aval.</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </BiCard>
  )
}
