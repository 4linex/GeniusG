import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BiCard, BiSectionHeader } from '@/components/dashboard/bi/BiCard'
import { Select } from '@/components/ui/Select'
import { useIsMobile, useIsTablet } from '@/hooks/useMediaQuery'

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    fontSize: 12,
  },
  labelStyle: { color: '#e2e8f0' },
  itemStyle: { color: '#f8fafc' },
}

interface FormPerformanceChartProps {
  items: { label: string; value: number; color: string }[]
}

export function FormPerformanceChart({ items }: FormPerformanceChartProps) {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const yAxisWidth = isMobile ? 96 : isTablet ? 120 : 140
  const chartHeight = Math.max(160, items.length * (isMobile ? 40 : 48) + 24)

  return (
    <BiCard className="h-full min-w-0">
      <BiSectionHeader
        title="Desempenho por avaliação"
        subtitle="Média TCT em cada formulário com respostas no escopo"
      />
      {items.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500 sm:py-16">Sem dados para exibir.</p>
      ) : (
        <div className="w-full min-w-0" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <BarChart
              data={items}
              layout="vertical"
              margin={{ top: 0, right: 16, left: isMobile ? 0 : 4, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fill: '#94a3b8', fontSize: isMobile ? 10 : 11 }}
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={yAxisWidth}
                tick={{ fill: '#cbd5e1', fontSize: isMobile ? 10 : 11 }}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                cursor={false}
                formatter={(value) => [`${Number(value ?? 0).toFixed(1)}%`, 'Média TCT']}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={isMobile ? 18 : 22}>
                {items.map((item) => (
                  <Cell key={item.label} fill={item.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </BiCard>
  )
}

interface LevelDistributionChartProps {
  segments: { label: string; value: number; color: string }[]
  totalStudents: number
}

export function LevelDistributionChart({ segments, totalStudents }: LevelDistributionChartProps) {
  const isMobile = useIsMobile()
  const active = segments.filter((segment) => segment.value > 0)

  return (
    <BiCard className="h-full min-w-0">
      <BiSectionHeader
        title="Distribuição por nível"
        subtitle="Classificação das respostas por faixa de desempenho (TCT)"
      />
      {active.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500 sm:py-16">Sem dados para exibir.</p>
      ) : (
        <div className="grid items-center gap-5 sm:gap-6">
          <div className="relative mx-auto h-[200px] w-full max-w-[220px] sm:h-[240px] sm:max-w-[240px]">
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <PieChart>
                <Pie
                  data={active}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={isMobile ? 52 : 62}
                  outerRadius={isMobile ? 78 : 92}
                  paddingAngle={3}
                  stroke="transparent"
                >
                  {active.map((segment) => (
                    <Cell key={segment.label} fill={segment.color} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} cursor={false} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white sm:text-3xl">{totalStudents}</span>
              <span className="text-[12px] text-slate-400 sm:text-[13px]">respostas</span>
            </div>
          </div>
          <ul className="space-y-2.5 sm:space-y-3">
            {segments.map((segment) => {
              const pct = totalStudents > 0 ? Math.round((segment.value / totalStudents) * 100) : 0
              return (
                <li key={segment.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-slate-300">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: segment.color }}
                    />
                    <span className="truncate">{segment.label}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-white tabular-nums">
                    {segment.value} · {pct}%
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </BiCard>
  )
}

interface BloomPerformanceChartProps {
  items: { label: string; value: number }[]
}

export function BloomPerformanceChart({ items }: BloomPerformanceChartProps) {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  const yAxisWidth = isMobile ? 64 : isTablet ? 76 : 88

  return (
    <BiCard className="h-full min-w-0">
      <BiSectionHeader
        title="Desempenho por Taxonomia de Bloom"
        subtitle="Percentual de acerto por nível cognitivo"
      />
      {items.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">Sem dados de Bloom.</p>
      ) : (
        <div className="h-[240px] w-full min-w-0 sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <BarChart
              data={items}
              layout="vertical"
              margin={{ top: 0, right: 12, left: isMobile ? 0 : 4, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: isMobile ? 10 : 11 }} />
              <YAxis
                type="category"
                dataKey="label"
                width={yAxisWidth}
                tick={{ fill: '#cbd5e1', fontSize: isMobile ? 10 : 11 }}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                cursor={false}
                formatter={(value) => [`${Number(value ?? 0)}%`, 'Acerto']}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} maxBarSize={isMobile ? 14 : 18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </BiCard>
  )
}

export type CompareScope = 'rede' | 'municipio' | 'escola' | 'turma'

interface ComparativeChartProps {
  scope: CompareScope
  onScopeChange: (scope: CompareScope) => void
  current: { desempenho: number; tri: number; participacao: number }
  reference: { desempenho: number; tri: number; participacao: number }
}

const SCOPE_LABELS: Record<CompareScope, string> = {
  rede: 'Rede',
  municipio: 'Município',
  escola: 'Escola',
  turma: 'Turma',
}

const COMPARE_OPTIONS = [
  { value: 'rede', label: 'Comparar com: Rede' },
  { value: 'municipio', label: 'Comparar com: Município' },
  { value: 'escola', label: 'Comparar com: Escola' },
  { value: 'turma', label: 'Comparar com: Turma' },
]

export function ComparativeChart({
  scope,
  onScopeChange,
  current,
  reference,
}: ComparativeChartProps) {
  const isMobile = useIsMobile()
  const data = [
    { metric: 'Desempenho', atual: current.desempenho, referencia: reference.desempenho },
    { metric: 'TRI (θ)', atual: current.tri, referencia: reference.tri },
    { metric: 'Participação', atual: current.participacao, referencia: reference.participacao },
  ]

  return (
    <BiCard className="h-full min-w-0">
      <BiSectionHeader
        title="Comparativo"
        subtitle={`Referência: mês anterior no escopo de ${SCOPE_LABELS[scope]}`}
        action={
          <Select
            size="sm"
            value={scope}
            onChange={(event) => onScopeChange(event.target.value as CompareScope)}
            options={COMPARE_OPTIONS}
            className="w-full sm:min-w-[220px]"
          />
        }
      />
      <div className="h-[220px] w-full min-w-0 sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 12, left: isMobile ? 0 : 4, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: isMobile ? 10 : 11 }} />
            <YAxis
              type="category"
              dataKey="metric"
              width={isMobile ? 76 : 92}
              tick={{ fill: '#cbd5e1', fontSize: isMobile ? 10 : 11 }}
            />
            <Tooltip {...TOOLTIP_STYLE} cursor={false} />
            <Bar dataKey="atual" name="Atual" fill="#8b5cf6" radius={[0, 6, 6, 0]} maxBarSize={isMobile ? 12 : 14} />
            <Bar
              dataKey="referencia"
              name="Referência"
              fill="#64748b"
              radius={[0, 6, 6, 0]}
              maxBarSize={isMobile ? 12 : 14}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-col gap-2 text-[12px] text-slate-400 sm:flex-row sm:flex-wrap sm:gap-4 sm:text-[13px]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary-500" />
          Escopo filtrado
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
          Referência do período anterior
        </span>
      </div>
    </BiCard>
  )
}

interface RankingChartProps {
  title: string
  subtitle: string
  items: { label: string; value: number; suffix?: string }[]
}

export function RankingChart({ title, subtitle, items }: RankingChartProps) {
  const maxValue = Math.max(...items.map((item) => item.value), 1)

  return (
    <BiCard className="min-w-0">
      <BiSectionHeader title={title} subtitle={subtitle} />
      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">Sem dados para ranking.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={`${item.label}-${index}`} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-slate-300">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                  <span className="text-sm leading-snug text-slate-200 sm:truncate">{item.label}</span>
                  <span className="shrink-0 text-sm font-semibold text-white tabular-nums">
                    {item.value}
                    {item.suffix ?? ''}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 to-violet-400 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(8, (item.value / maxValue) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </BiCard>
  )
}
