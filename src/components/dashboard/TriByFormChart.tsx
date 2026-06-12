import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import type { TriFormChartRow } from '@/lib/formAssessmentReport'

const THETA_MIN = -3
const THETA_MAX = 3

function thetaToPercent(theta: number): number {
  return Math.max(0, Math.min(100, ((theta - THETA_MIN) / (THETA_MAX - THETA_MIN)) * 100))
}

function thetaBarColor(theta: number): string {
  if (theta >= 0.5) return 'bg-emerald-500'
  if (theta >= -0.5) return 'bg-amber-500'
  return 'bg-red-500'
}

interface TriByFormChartProps {
  data: TriFormChartRow[]
}

export function TriByFormChart({ data }: TriByFormChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-slate-400 text-center py-10 text-sm">
        Nenhum dado de TRI disponível. As barras aparecem após alunos concluírem avaliações.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-xs text-slate-500 px-1">
        <span>θ = {THETA_MIN}</span>
        <span>θ = 0</span>
        <span>θ = {THETA_MAX}</span>
      </div>

      {data.map((row) => {
        const theta = row.averageTheta ?? 0
        const width = row.averageTheta != null ? thetaToPercent(theta) : 0

        return (
          <div key={row.formId} className="group">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <Link
                to={`/professor/relatorios/formulario/${row.formId}`}
                className="text-sm font-medium text-white truncate hover:text-primary-300 transition-colors"
                title={row.title}
              >
                {row.title}
              </Link>
              <div className="flex items-center gap-2 shrink-0 text-xs">
                <span className="text-slate-400">{row.totalResponses} resp.</span>
                <span className="font-mono text-primary-300">
                  {row.averageTheta != null ? `θ ${row.averageTheta.toFixed(2)}` : '—'}
                </span>
              </div>
            </div>
            <div className="relative h-3 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${row.averageTheta != null ? thetaBarColor(theta) : 'bg-slate-600'}`}
                style={{ width: `${width}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-px bg-white/20"
                style={{ left: `${thetaToPercent(0)}%` }}
                aria-hidden
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Média TCT: {row.averageTct.toFixed(1)}%
            </p>
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
