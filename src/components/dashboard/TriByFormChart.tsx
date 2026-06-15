import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import type { TriFormChartRow } from '@/lib/formAssessmentReport'
import { cn } from '@/lib/utils'

const THETA_MIN = -3
const THETA_MAX = 3

function thetaToPercent(theta: number): number {
  return Math.max(0, Math.min(100, ((theta - THETA_MIN) / (THETA_MAX - THETA_MIN)) * 100))
}

function thetaBadgeClass(theta: number): string {
  if (theta >= 0.5) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  if (theta >= -0.5) return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  return 'bg-red-500/15 text-red-300 border-red-500/30'
}

interface TriByFormChartProps {
  data: TriFormChartRow[]
  className?: string
}

export function TriByFormChart({ data, className }: TriByFormChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-slate-400 text-center py-10 text-sm">
        Nenhum dado de TRI disponível. As barras aparecem após alunos concluírem avaliações.
      </p>
    )
  }

  const zeroMark = thetaToPercent(0)

  return (
    <div className={cn('space-y-5', className)}>
      <div className="relative rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2.5">
        <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-500 font-medium">
          <span>θ {THETA_MIN}</span>
          <span className="text-slate-400">θ 0</span>
          <span>θ {THETA_MAX}</span>
        </div>
        <div className="relative h-1.5 mt-1 rounded-full bg-gradient-to-r from-red-500/20 via-amber-500/20 to-emerald-500/20">
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/30"
            style={{ left: `${zeroMark}%` }}
            aria-hidden
          />
        </div>
      </div>

      {data.map((row) => {
        const theta = row.averageTheta ?? 0
        const markerLeft = row.averageTheta != null ? thetaToPercent(theta) : null

        return (
          <div
            key={row.formId}
            className="rounded-xl bg-white/[0.02] border border-white/5 p-4 hover:border-white/10 transition-colors"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <Link
                to={`/professor/relatorios/formulario/${row.formId}`}
                className="text-sm font-medium text-white hover:text-primary-300 transition-colors line-clamp-2 leading-snug"
                title={row.title}
              >
                {row.title}
              </Link>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {row.averageTheta != null ? (
                  <span
                    className={cn(
                      'inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-mono font-semibold',
                      thetaBadgeClass(theta),
                    )}
                  >
                    θ {row.averageTheta.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">—</span>
                )}
                <span className="text-[11px] text-slate-500">{row.totalResponses} respostas</span>
              </div>
            </div>

            <div className="relative h-4 rounded-full bg-white/8 overflow-visible">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500/10 via-amber-500/10 to-emerald-500/10" />
              <div
                className="absolute top-0 bottom-0 w-px bg-white/25 z-10"
                style={{ left: `${zeroMark}%` }}
                aria-hidden
              />
              {markerLeft != null && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-primary-400 shadow-md z-20"
                  style={{ left: `clamp(0px, calc(${markerLeft}% - 6px), calc(100% - 12px))` }}
                  title={`θ = ${theta.toFixed(2)}`}
                />
              )}
            </div>

            <div className="flex justify-between mt-2 text-[11px] text-slate-500">
              <span>TCT médio: {row.averageTct.toFixed(1)}%</span>
              {markerLeft != null && (
                <span className="font-mono text-slate-400">
                  posição {markerLeft.toFixed(0)}% na escala
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function TriByFormChartCard({ data }: TriByFormChartProps) {
  return (
    <Card>
      <h2 className="text-lg font-semibold text-white mb-2">TRI por formulário</h2>
      <p className="text-sm text-slate-400 mb-6">
        Média de θ (proficiência estimada) em cada avaliação com respostas
      </p>
      <TriByFormChart data={data} />
    </Card>
  )
}
