import { cn } from '@/lib/utils'

export interface BarChartItem {
  label: string
  value: number
  displayValue?: string
  color?: string
  isCritical?: boolean
}

const DEFAULT_BAR = '#8b5cf6'
const CRITICAL_BAR = '#ef4444'

interface HorizontalBarChartProps {
  items: BarChartItem[]
  title?: string
  subtitle?: string
  maxValue?: number
  valueSuffix?: string
  className?: string
  emptyMessage?: string
}

export function HorizontalBarChart({
  items,
  title,
  subtitle,
  maxValue,
  valueSuffix = '%',
  className,
  emptyMessage = 'Sem dados para exibir.',
}: HorizontalBarChartProps) {
  if (items.length === 0) {
    return (
      <div className={className}>
        {title && <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>}
        <p className="text-sm text-slate-500 text-center py-6">{emptyMessage}</p>
      </div>
    )
  }

  const max = maxValue ?? Math.max(...items.map((i) => i.value), 1)

  return (
    <div className={className}>
      {title && <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>}
      {subtitle && <p className="text-xs text-slate-400 mb-4">{subtitle}</p>}
      <div className="space-y-3">
        {items.map((item) => {
          const width = max > 0 ? (item.value / max) * 100 : 0
          const color = item.color ?? (item.isCritical ? CRITICAL_BAR : DEFAULT_BAR)
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span
                  className={cn(
                    'text-xs truncate',
                    item.isCritical ? 'text-red-300 font-medium' : 'text-slate-300',
                  )}
                  title={item.label}
                >
                  {item.label}
                </span>
                <span className="text-xs font-semibold text-white shrink-0">
                  {item.displayValue ?? `${item.value}${valueSuffix}`}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, width)}%`, backgroundColor: color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export interface DonutSegment {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  segments: DonutSegment[]
  centerLabel: string
  centerSubLabel?: string
  title?: string
  subtitle?: string
  className?: string
  size?: number
  layout?: 'horizontal' | 'vertical'
  showEmptyInLegend?: boolean
}

export function DonutChart({
  segments,
  centerLabel,
  centerSubLabel,
  title,
  subtitle,
  className,
  size = 160,
  layout = 'horizontal',
  showEmptyInLegend = false,
}: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  const stroke = Math.round(size * 0.14)
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  const active = segments.filter((s) => s.value > 0)
  const legendSegments = showEmptyInLegend ? segments : active
  const isVertical = layout === 'vertical'

  const legend = (
    <ul
      className={cn(
        'space-y-2',
        isVertical ? 'w-full grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2' : 'flex-1 min-w-0',
      )}
    >
      {legendSegments.map((seg) => (
        <li key={seg.label} className="flex items-center justify-between gap-3 text-xs">
          <span className="flex items-center gap-2 text-slate-400 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: seg.color, opacity: seg.value > 0 ? 1 : 0.35 }}
            />
            <span className={isVertical ? 'leading-snug' : 'truncate'} title={seg.label}>
              {seg.label}
            </span>
          </span>
          <span
            className={cn(
              'font-semibold shrink-0 tabular-nums',
              seg.value > 0 ? 'text-white' : 'text-slate-500',
            )}
          >
            {total > 0 ? Math.round((seg.value / total) * 100) : 0}%
          </span>
        </li>
      ))}
    </ul>
  )

  const ring = (
    <div className="relative shrink-0 mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        {active.map((seg) => {
          const pct = total > 0 ? seg.value / total : 0
          let segLen = pct * circumference
          if (active.length === 1 && segLen > 0) {
            segLen = circumference - 0.5
          }
          const dash = `${segLen} ${circumference - segLen}`
          const el = (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
            />
          )
          offset += segLen
          return el
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        <span className={cn('font-bold text-white', size >= 150 ? 'text-2xl' : 'text-xl')}>
          {centerLabel}
        </span>
        {centerSubLabel && (
          <span className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">
            {centerSubLabel}
          </span>
        )}
      </div>
    </div>
  )

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {title && <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>}
      {subtitle && <p className="text-xs text-slate-400 mb-4">{subtitle}</p>}
      {isVertical ? (
        <div className="flex flex-col items-center gap-5 flex-1">
          {ring}
          {legend}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6 flex-1">
          {ring}
          {legend}
        </div>
      )}
    </div>
  )
}

interface VerticalBarChartProps {
  items: { label: string; value: number; color?: string }[]
  title?: string
  subtitle?: string
  className?: string
  height?: number
}

function wrapSvgLabel(label: string, maxChars: number, maxLines: number): string[] {
  const words = label.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['—']

  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length <= maxChars) {
      current = next
      continue
    }
    if (current) lines.push(current)
    current = word.length > maxChars ? `${word.slice(0, maxChars - 1)}…` : word
    if (lines.length >= maxLines - 1) break
  }

  if (current && lines.length < maxLines) lines.push(current)
  return lines.slice(0, maxLines)
}

export function VerticalBarChart({
  items,
  title,
  subtitle,
  className,
  height = 260,
}: VerticalBarChartProps) {
  const max = Math.max(...items.map((i) => i.value), 1)
  const width = Math.max(420, items.length * 88)
  const pad = { top: 28, right: 20, bottom: 72, left: 20 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom
  const groupW = items.length > 0 ? chartW / items.length : chartW
  const barW = Math.min(40, Math.max(18, groupW * 0.42))
  const charsPerLine = Math.max(10, Math.floor(groupW / 5.5))

  if (items.length === 0) {
    return (
      <div className={className}>
        {title && <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>}
        <p className="text-sm text-slate-500 text-center py-6">Sem dados.</p>
      </div>
    )
  }

  return (
    <div className={className}>
      {title && <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>}
      {subtitle && <p className="text-xs text-slate-400 mb-3">{subtitle}</p>}
      <div className="w-full overflow-x-auto scrollbar-app">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ minHeight: height, maxHeight: height }}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={title}
        >
          {items.map((item, i) => {
            const barH = max > 0 ? chartH * (item.value / max) : 0
            const cx = pad.left + groupW * i + groupW / 2
            const baseY = pad.top + chartH
            const visibleBarH = item.value > 0 ? Math.max(barH, 6) : 3
            const labelLines = wrapSvgLabel(item.label, charsPerLine, 3)

            return (
              <g key={`${item.label}-${i}`}>
                <title>{`${item.label}: ${item.value}`}</title>
                <rect
                  x={cx - barW / 2}
                  y={baseY - visibleBarH}
                  width={barW}
                  height={visibleBarH}
                  fill={item.value > 0 ? (item.color ?? '#8b5cf6') : 'rgba(255,255,255,0.08)'}
                  rx={4}
                />
                {item.value > 0 && (
                  <text
                    x={cx}
                    y={baseY - visibleBarH - 8}
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize={11}
                    fontWeight={600}
                  >
                    {item.value}
                  </text>
                )}
                {labelLines.map((line, lineIndex) => (
                  <text
                    key={lineIndex}
                    x={cx}
                    y={baseY + 14 + lineIndex * 13}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize={10}
                  >
                    {line}
                  </text>
                ))}
              </g>
            )
          })}
          <line
            x1={pad.left}
            y1={pad.top + chartH}
            x2={width - pad.right}
            y2={pad.top + chartH}
            stroke="rgba(255,255,255,0.12)"
          />
        </svg>
      </div>
    </div>
  )
}

export const CHART_COLORS = {
  excelente: '#10b981',
  bom: '#14b8a6',
  regular: '#f59e0b',
  atencao: '#ef4444',
  inicial: '#f59e0b',
  intermediario: '#14b8a6',
  avancado: '#10b981',
  primary: '#8b5cf6',
  bloom: '#6366f1',
}
