import { useMemo } from 'react'
import type { NivelProficiencia } from '@/types/database'
import { NIVEL_PROFICIENCIA_LABELS } from '@/lib/scoring'
import { cn } from '@/lib/utils'

const NIVEL_ORDER: NivelProficiencia[] = ['inicial', 'intermediario', 'avancado']

const SHORT_LABELS: Record<NivelProficiencia, string> = {
  inicial: 'Inicial',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
}

const BAR_COLORS: Record<NivelProficiencia, string> = {
  inicial: '#f59e0b',
  intermediario: '#14b8a6',
  avancado: '#10b981',
}

const GRID_STROKE = 'rgba(255, 255, 255, 0.06)'
const AXIS_STROKE = 'rgba(255, 255, 255, 0.14)'
const LABEL_FILL = '#94a3b8'

interface ProficiencyLevelChartProps {
  byNivel: Record<NivelProficiencia, number>
  totalResponses: number
  className?: string
  hideHeader?: boolean
  emptyMessage?: string
}

function niceYMax(max: number): number {
  if (max <= 0) return 5
  if (max <= 5) return 5
  if (max <= 10) return 10
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)))
  const normalized = max / magnitude
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return nice * magnitude
}

/** Gera no máximo 6 marcas no eixo Y para evitar sobreposição de labels. */
function yTicks(max: number, maxTickCount = 6): number[] {
  const top = niceYMax(max)
  if (top === 0) return [0]

  let step = Math.ceil(top / (maxTickCount - 1))
  const pow = Math.pow(10, Math.floor(Math.log10(step)))
  step = Math.max(1, Math.ceil(step / pow) * pow)

  const ticks: number[] = []
  for (let v = 0; v < top; v += step) ticks.push(v)
  ticks.push(top)

  return [...new Set(ticks)]
}

export function ProficiencyLevelChart({
  byNivel,
  totalResponses,
  className,
  hideHeader = false,
  emptyMessage = 'Nenhuma resposta classificada por nível de proficiência.',
}: ProficiencyLevelChartProps) {
  const maxCount = Math.max(...NIVEL_ORDER.map((n) => byNivel[n]), 0)
  const yMax = niceYMax(Math.max(maxCount, 1))
  const ticks = useMemo(() => yTicks(maxCount), [maxCount])

  const yAxisLabelWidth = useMemo(() => {
    const widest = Math.max(...ticks.map((t) => String(t).length), 1)
    return Math.max(28, widest * 7 + 8)
  }, [ticks])

  const width = 640
  const height = 220
  const pad = { top: 16, right: 16, bottom: 44, left: yAxisLabelWidth }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom
  const groupW = chartW / NIVEL_ORDER.length
  const barW = Math.min(72, groupW * 0.55)

  const yScale = (v: number) => pad.top + chartH - (v / yMax) * chartH

  if (totalResponses === 0) {
    return (
      <p className={cn('text-sm text-slate-500 text-center py-8', className)}>
        {emptyMessage}
      </p>
    )
  }

  const hasAnyLevel = NIVEL_ORDER.some((n) => byNivel[n] > 0)
  if (!hasAnyLevel) {
    return (
      <p className={cn('text-sm text-slate-500 text-center py-8', className)}>
        Nenhum aluno classificado por nível de proficiência neste formulário.
      </p>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      {!hideHeader && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white">Distribuição por nível</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Respostas classificadas em inicial, intermediário e avançado
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {NIVEL_ORDER.map((nivel) => {
          const count = byNivel[nivel]
          const pct = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0
          return (
            <div
              key={nivel}
              className="rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: BAR_COLORS[nivel] }}
                />
                <span className="text-xs text-slate-400 truncate">{SHORT_LABELS[nivel]}</span>
              </div>
              <p className="text-2xl font-bold text-white tabular-nums">{count}</p>
              <p className="text-xs text-slate-500 mt-0.5">{pct}% do total</p>
            </div>
          )
        })}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto min-h-[12rem]"
        role="img"
        aria-label="Gráfico de respostas por nível de proficiência"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {NIVEL_ORDER.map((nivel) => (
            <linearGradient key={nivel} id={`barGrad-${nivel}`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor={BAR_COLORS[nivel]} stopOpacity={0.85} />
              <stop offset="100%" stopColor={BAR_COLORS[nivel]} stopOpacity={1} />
            </linearGradient>
          ))}
        </defs>

        {ticks.map((tick) => {
          const y = yScale(tick)
          return (
            <g key={tick}>
              <line
                x1={pad.left}
                y1={y}
                x2={width - pad.right}
                y2={y}
                stroke={GRID_STROKE}
                strokeWidth={1}
              />
              <text
                x={pad.left - 8}
                y={y + 4}
                textAnchor="end"
                fill={LABEL_FILL}
                fontSize={11}
                fontFamily="ui-monospace, monospace"
              >
                {tick}
              </text>
            </g>
          )
        })}

        {NIVEL_ORDER.map((nivel, i) => {
          const count = byNivel[nivel]
          const pct = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0
          const groupCenter = pad.left + groupW * i + groupW / 2
          const barH = yMax > 0 ? chartH * (count / yMax) : 0
          const baseY = pad.top + chartH
          const minBarH = count > 0 ? Math.max(barH, 4) : 0

          return (
            <g key={nivel}>
              {count > 0 && (
                <>
                  <rect
                    x={groupCenter - barW / 2}
                    y={baseY - minBarH}
                    width={barW}
                    height={minBarH}
                    fill={BAR_COLORS[nivel]}
                    fillOpacity={0.35}
                    rx={6}
                  />
                  <rect
                    x={groupCenter - barW / 2}
                    y={baseY - minBarH}
                    width={barW}
                    height={minBarH}
                    fill={`url(#barGrad-${nivel})`}
                    rx={6}
                  />
                </>
              )}
              {count === 0 && (
                <rect
                  x={groupCenter - barW / 2}
                  y={baseY - 2}
                  width={barW}
                  height={2}
                  fill="rgba(255,255,255,0.08)"
                  rx={1}
                />
              )}
              {count > 0 && (
                <>
                  <text
                    x={groupCenter}
                    y={baseY - minBarH - 8}
                    textAnchor="middle"
                    fill="#f1f5f9"
                    fontSize={13}
                    fontWeight={700}
                  >
                    {count}
                  </text>
                  <text
                    x={groupCenter}
                    y={baseY - minBarH - 22}
                    textAnchor="middle"
                    fill={LABEL_FILL}
                    fontSize={10}
                  >
                    {pct}%
                  </text>
                </>
              )}
              <text
                x={groupCenter}
                y={height - 22}
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize={12}
                fontWeight={500}
              >
                {SHORT_LABELS[nivel]}
              </text>
              <text
                x={groupCenter}
                y={height - 8}
                textAnchor="middle"
                fill={LABEL_FILL}
                fontSize={9}
              >
                {NIVEL_PROFICIENCIA_LABELS[nivel].split(' / ')[1] ?? ''}
              </text>
              <title>
                {NIVEL_PROFICIENCIA_LABELS[nivel]}: {count} resposta{count !== 1 ? 's' : ''} ({pct}%)
              </title>
            </g>
          )
        })}

        <line
          x1={pad.left}
          y1={pad.top + chartH}
          x2={width - pad.right}
          y2={pad.top + chartH}
          stroke={AXIS_STROKE}
          strokeWidth={1.5}
        />
      </svg>
    </div>
  )
}

export function ProficiencyLevelChartCard({
  byNivel,
  totalResponses,
}: ProficiencyLevelChartProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">Por nível de proficiência</h2>
      <p className="text-sm text-slate-400 mb-4">
        Alunos deste formulário classificados por nível de proficiência
      </p>
      <ProficiencyLevelChart byNivel={byNivel} totalResponses={totalResponses} />
    </div>
  )
}
