import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, ChevronRight, FileBarChart } from 'lucide-react'
import { useReportData } from '@/hooks/useReportData'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { RecoveryReportModal } from '@/components/reports/RecoveryReportModal'
import { ReportFiltersBar } from '@/components/reports/ReportFiltersBar'
import { CHART_COLORS, DonutChart, HorizontalBarChart, VerticalBarChart } from '@/components/reports/ReportCharts'
import { buildFormRecoveryReport } from '@/lib/recoveryReport'
import type { RecoveryReportData } from '@/lib/recoveryReport'
import {
  applyReportFilters,
  avgTct,
  countByProficiency,
  type ReportFilters,
  uniqueForms,
  uniqueStudents,
} from '@/lib/reportAnalytics'
import { formatScore } from '@/lib/utils'
import { NIVEL_PROFICIENCIA_LABELS } from '@/lib/scoring'
import type { NivelProficiencia } from '@/types/database'

const NIVEL_ORDER: NivelProficiencia[] = ['inicial', 'intermediario', 'avancado']

export function FormReportPage() {
  const { responses, loading } = useReportData()
  const [filters, setFilters] = useState<ReportFilters>({})
  const [reportOpen, setReportOpen] = useState(false)
  const [reportData, setReportData] = useState<RecoveryReportData | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  const forms = useMemo(() => uniqueForms(responses), [responses])
  const students = useMemo(() => uniqueStudents(responses), [responses])
  const filtered = useMemo(() => applyReportFilters(responses, filters), [responses, filters])

  const stats = useMemo(() => {
    const grouped = new Map<
      string,
      {
        formId: string
        title: string
        totalResponses: number
        averageTCT: number
        byNivel: Record<NivelProficiencia, number>
      }
    >()

    for (const r of filtered) {
      const existing = grouped.get(r.form_id)
      const nivel = r.nivel_proficiencia as NivelProficiencia | null

      if (existing) {
        existing.totalResponses++
        existing.averageTCT += r.percentual_acerto || 0
        if (nivel) existing.byNivel[nivel]++
      } else {
        grouped.set(r.form_id, {
          formId: r.form_id,
          title: r.form?.title || 'Formulário',
          totalResponses: 1,
          averageTCT: r.percentual_acerto || 0,
          byNivel: {
            inicial: nivel === 'inicial' ? 1 : 0,
            intermediario: nivel === 'intermediario' ? 1 : 0,
            avancado: nivel === 'avancado' ? 1 : 0,
          },
        })
      }
    }

    return Array.from(grouped.values()).map((s) => ({
      ...s,
      averageTCT: s.totalResponses > 0 ? s.averageTCT / s.totalResponses : 0,
    }))
  }, [filtered])

  const byNivel = useMemo(() => countByProficiency(filtered), [filtered])
  const overallAvg = avgTct(filtered)

  const openFormReport = async (formId: string) => {
    setReportOpen(true)
    setReportLoading(true)
    try {
      setReportData(await buildFormRecoveryReport(formId))
    } finally {
      setReportLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ReportFiltersBar
        filters={filters}
        onChange={setFilters}
        forms={forms}
        students={students}
        searchPlaceholder="Buscar formulário ou turma..."
      />

      {filtered.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="!p-5 lg:col-span-1">
            <DonutChart
              title="Níveis de proficiência"
              subtitle="Todas as respostas filtradas"
              centerLabel={overallAvg != null ? formatScore(overallAvg) : '—'}
              centerSubLabel="TCT médio"
              segments={NIVEL_ORDER.filter((n) => byNivel[n] > 0).map((n) => ({
                label: NIVEL_PROFICIENCIA_LABELS[n],
                value: byNivel[n],
                color: CHART_COLORS[n],
              }))}
            />
          </Card>
          <Card className="!p-5 lg:col-span-2">
            <HorizontalBarChart
              title="TCT médio por formulário"
              subtitle="Comparativo entre formulários"
              items={stats.map((s) => ({
                label: s.title,
                value: s.averageTCT,
                displayValue: formatScore(s.averageTCT),
              }))}
            />
          </Card>
        </div>
      )}

      {stats.length > 0 && (
        <Card className="!p-5">
          <VerticalBarChart
            title="Respostas por formulário"
            subtitle="Volume de respostas recebidas"
            items={stats.map((s) => ({
              label: s.title.length > 12 ? `${s.title.slice(0, 12)}…` : s.title,
              value: s.totalResponses,
              color: CHART_COLORS.primary,
            }))}
          />
        </Card>
      )}

      <div className="space-y-3">
        {stats.map((s) => (
          <Card key={s.formId}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="min-w-0">
                <Link
                  to={`/professor/relatorios/formulario/${s.formId}`}
                  className="font-medium text-white hover:text-primary-300 transition-colors inline-flex items-center gap-1"
                >
                  {s.title}
                  <ChevronRight size={16} className="opacity-50" />
                </Link>
                <p className="text-sm text-slate-400">{s.totalResponses} respostas</p>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                <Badge variant="info">TCT médio: {formatScore(s.averageTCT)}</Badge>
                <Link to={`/professor/relatorios/formulario/${s.formId}`}>
                  <Button variant="secondary" size="sm">
                    <BarChart3 size={14} />
                    Análise
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => openFormReport(s.formId)}>
                  <FileBarChart size={14} />
                  PDF
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {NIVEL_ORDER.map((nivel) => (
                <div key={nivel} className="rounded-xl bg-white/5 p-3 text-center">
                  <p className="text-lg font-bold text-white">{s.byNivel[nivel]}</p>
                  <p className="text-xs text-slate-500">{NIVEL_PROFICIENCIA_LABELS[nivel]}</p>
                </div>
              ))}
            </div>
          </Card>
        ))}
        {stats.length === 0 && (
          <Card>
            <p className="text-slate-400 text-center py-8">Nenhum dado disponível.</p>
          </Card>
        )}
      </div>

      <RecoveryReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        data={reportData}
        loading={reportLoading}
      />
    </div>
  )
}
