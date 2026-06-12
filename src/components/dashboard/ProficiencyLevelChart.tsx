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

const GRID_STROKE = 'rgba(255, 255, 255, 0.08)'
const AXIS_STROKE = 'rgba(255, 255, 255, 0.12)'
const LABEL_FILL = '#94a3b8'

interface ProficiencyLevelChartProps {
  byNivel: Record<NivelProficiencia, number>
  totalResponses: number
  className?: string
}

function niceYMax(max: number): number {
  if (max <= 2) return 2
  if (max <= 5) return 5
  if (max <= 10) return 10
  return Math.ceil(max / 5) * 5
}

function yTicks(max: number): number[] {
  const top = niceYMax(max)
  const step = top <= 5 ? 1 : top <= 10 ? 2 : 5
  const ticks: number[] = []
  for (let v = 0; v <= top; v += step) ticks.push(v)
  if (ticks[ticks.length - 1] !== top) ticks.push(top)
  return ticks
}

export function ProficiencyLevelChart({
  byNivel,
  totalResponses,
  className,
}: ProficiencyLevelChartProps) {
  const activeLevels = useMemo(
    () => NIVEL_ORDER.filter((n) => byNivel[n] > 0),
    [byNivel],
  )

  const maxCount = Math.max(...activeLevels.map((n) => byNivel[n]), 1)
  const yMax = niceYMax(maxCount)
  const ticks = yTicks(maxCount)

  const width = 420
  const height = 168
  const pad = { top: 10, right: 12, bottom: 36, left: 32 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom
  const groupW = activeLevels.length > 0 ? chartW / activeLevels.length : chartW
  const barW = Math.min(36, groupW * 0.42)

  const yScale = (v: number) => pad.top + chartH - (v / yMax) * chartH

  if (totalResponses === 0) {
    return (
      <p className={cn('text-sm text-slate-500 text-center py-8', className)}>
        Nenhum aluno respondeu esta avaliação ainda.
      </p>
    )
  }

  if (activeLevels.length === 0) {
    return (
      <p className={cn('text-sm text-slate-500 text-center py-8', className)}>
        Nenhum aluno classificado por nível de proficiência neste formulário.
      </p>
    )
  }

  return (
    <div className={cn('w-full max-w-lg', className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-xs text-slate-500">
        {activeLevels.map((nivel) => (
          <span key={nivel} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: BAR_COLORS[nivel] }}
            />
            {NIVEL_PROFICIENCIA_LABELS[nivel]} ({byNivel[nivel]})
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[10.5rem]"
        role="img"
        aria-label="Gráfico de alunos por nível de proficiência"
      >
        {ticks.map((tick) => {
          const y = yScale(tick)
          return (
            <g key={tick}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke={GRID_STROKE} strokeWidth={1} />
              <text x={pad.left - 6} y={y + 4} textAnchor="end" fill={LABEL_FILL} fontSize={10}>
                {tick}
              </text>
            </g>
          )
        })}

        {activeLevels.map((nivel, i) => {
          const count = byNivel[nivel]
          const groupCenter = pad.left + groupW * i + groupW / 2
          const barH = chartH * (count / yMax)
          const baseY = pad.top + chartH

          return (
            <g key={nivel}>
              <rect
                x={groupCenter - barW / 2}
                y={baseY - barH}
                width={barW}
                height={barH}
                fill={BAR_COLORS[nivel]}
                rx={3}
              />
              {count > 0 && (
                <text
                  x={groupCenter}
                  y={baseY - barH - 5}
                  textAnchor="middle"
                  fill="#e2e8f0"
                  fontSize={11}
                  fontWeight={600}
                >
                  {count}
                </text>
              )}
              <text
                x={groupCenter}
                y={height - 10}
                textAnchor="middle"
                fill={LABEL_FILL}
                fontSize={10}
              >
                {SHORT_LABELS[nivel]}
              </text>
              <title>
                {NIVEL_PROFICIENCIA_LABELS[nivel]}: {count} aluno{count !== 1 ? 's' : ''}
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
          strokeWidth={1}
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
