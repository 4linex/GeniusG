import { Route } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { CHART_COLORS, DonutChart } from '@/components/reports/ReportCharts'
import type { TrailDistributionRow } from '@/lib/trailDistribution'

const TRAIL_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.bloom,
  CHART_COLORS.bom,
  CHART_COLORS.regular,
  CHART_COLORS.avancado,
  CHART_COLORS.intermediario,
]

interface TrailDistributionPanelProps {
  rows: TrailDistributionRow[]
}

export function TrailDistributionPanel({ rows }: TrailDistributionPanelProps) {
  if (rows.length === 0) {
    return (
      <Card className="p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Route size={20} className="text-violet-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">Alunos por trilha</h2>
            <p className="text-sm text-slate-400">
              Distribuição conforme desempenho nas avaliações filtradas
            </p>
          </div>
        </div>
        <p className="text-slate-400 text-center py-8 text-sm">
          Nenhum aluno com trilha atribuída no período filtrado.
        </p>
      </Card>
    )
  }

  const totalStudents = rows.reduce((sum, row) => sum + row.studentCount, 0)
  const segments = rows.map((row, index) => ({
    label: row.title,
    value: row.studentCount,
    color:
      row.key === 'sem-trilha'
        ? CHART_COLORS.atencao
        : TRAIL_PALETTE[index % TRAIL_PALETTE.length],
  }))

  return (
    <Card className="p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Route size={20} className="text-violet-400" />
        <div>
          <h2 className="text-lg font-semibold text-white">Alunos por trilha</h2>
          <p className="text-sm text-slate-400">
            Quantos alunos foram direcionados a cada trilha de recomposição
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DonutChart
          segments={segments}
          centerLabel={String(totalStudents)}
          centerSubLabel="alunos"
          layout="vertical"
          size={160}
          showEmptyInLegend
        />

        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{row.title}</p>
                <p className="text-xs text-slate-500">{row.percentRange}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-white">{row.studentCount}</p>
                <p className="text-xs text-slate-500">
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
    </Card>
  )
}
