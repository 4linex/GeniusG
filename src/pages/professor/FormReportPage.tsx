import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useReportDataContext } from '@/contexts/ReportDataContext'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { RecoveryReportModal } from '@/components/reports/RecoveryReportModal'
import { ReportFiltersBar } from '@/components/reports/ReportFiltersBar'
import { CHART_COLORS, DonutChart, HorizontalBarChart, VerticalBarChart } from '@/components/reports/ReportCharts'
import {
  buildFormRecoveryReport,
  buildFormsOverviewRecoveryReport,
} from '@/lib/recoveryReport'
import type { RecoveryReportData } from '@/lib/recoveryReport'
import {
  applyReportFilters,
  averageThetaFromResponses,
  avgTct,
  countByProficiency,
  type ReportFilters,
  uniqueForms,
  uniqueStudents,
} from '@/lib/reportAnalytics'
import { cn, formatScore } from '@/lib/utils'
import { NIVEL_PROFICIENCIA_LABELS } from '@/lib/scoring'
import type { NivelProficiencia } from '@/types/database'

const NIVEL_ORDER: NivelProficiencia[] = ['inicial', 'intermediario', 'avancado']

interface FormStat {
  formId: string
  title: string
  totalResponses: number
  uniqueStudents: number
  averageTCT: number
  averageTheta: number | null
  byNivel: Record<NivelProficiencia, number>
}

function ProficiencyMiniBar({
  byNivel,
  total,
}: {
  byNivel: Record<NivelProficiencia, number>
  total: number
}) {
  if (total === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
        {NIVEL_ORDER.map((nivel) => {
          const pct = (byNivel[nivel] / total) * 100
          if (pct === 0) return null
          return (
            <div
              key={nivel}
              className="h-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[nivel] }}
              title={`${NIVEL_PROFICIENCIA_LABELS[nivel]}: ${byNivel[nivel]}`}
            />
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {NIVEL_ORDER.map((nivel) =>
          byNivel[nivel] > 0 ? (
            <span key={nivel} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: CHART_COLORS[nivel] }}
              />
              {NIVEL_PROFICIENCIA_LABELS[nivel]}: {byNivel[nivel]}
            </span>
          ) : null,
        )}
      </div>
    </div>
  )
}

function FormStatCell({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn('text-xl font-bold mt-1', accent ?? 'text-white')}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export function FormReportPage() {
  const { profile } = useAuth()
  const { responses, loading, error } = useReportDataContext()
  const [filters, setFilters] = useState<ReportFilters>({})
  const [reportOpen, setReportOpen] = useState(false)
  const [reportData, setReportData] = useState<RecoveryReportData | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  const forms = useMemo(() => uniqueForms(responses), [responses])
  const students = useMemo(() => uniqueStudents(responses), [responses])
  const filtered = useMemo(() => applyReportFilters(responses, filters), [responses, filters])

  const stats = useMemo(() => {
    const grouped = new Map<string, FormStat>()

    for (const r of filtered) {
      const nivel = r.nivel_proficiencia as NivelProficiencia | null
      const existing = grouped.get(r.form_id)

      if (existing) {
        existing.totalResponses++
        existing.averageTCT += r.percentual_acerto || 0
        if (nivel) existing.byNivel[nivel]++
      } else {
        grouped.set(r.form_id, {
          formId: r.form_id,
          title: r.form?.title || 'Formulário',
          totalResponses: 1,
          uniqueStudents: 0,
          averageTCT: r.percentual_acerto || 0,
          averageTheta: null,
          byNivel: {
            inicial: nivel === 'inicial' ? 1 : 0,
            intermediario: nivel === 'intermediario' ? 1 : 0,
            avancado: nivel === 'avancado' ? 1 : 0,
          },
        })
      }
    }

    for (const stat of grouped.values()) {
      const formResponses = filtered.filter((r) => r.form_id === stat.formId)
      const emails = new Set(formResponses.map((r) => r.student_email))
      stat.uniqueStudents = emails.size
      stat.averageTCT =
        stat.totalResponses > 0 ? stat.averageTCT / stat.totalResponses : 0
      stat.averageTheta = averageThetaFromResponses(formResponses)
    }

    return Array.from(grouped.values()).sort((a, b) => b.averageTCT - a.averageTCT)
  }, [filtered])

  const byNivel = useMemo(() => countByProficiency(filtered), [filtered])
  const overallAvg = avgTct(filtered)
  const overallTheta = averageThetaFromResponses(filtered)
  const studentCount = useMemo(() => uniqueStudents(filtered).length, [filtered])

  const openOverviewReport = async () => {
    setReportOpen(true)
    setReportLoading(true)
    try {
      const ids = filtered.map((r) => r.id)
      if (filters.formId) {
        setReportData(await buildFormRecoveryReport(filters.formId, filters))
      } else {
        setReportData(await buildFormsOverviewRecoveryReport(ids, filters))
      }
    } finally {
      setReportLoading(false)
    }
  }

  const openFormReport = async (formId: string) => {
    setReportOpen(true)
    setReportLoading(true)
    try {
      setReportData(await buildFormRecoveryReport(formId, filters))
    } finally {
      setReportLoading(false)
    }
  }

  if (loading && responses.length === 0) {
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
        showScope
        scopeProfile={profile}
        searchPlaceholder="Buscar formulário ou turma..."
      />

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {filtered.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-slate-400">
              {stats.length} formulário{stats.length !== 1 ? 's' : ''} · {filtered.length} resposta
              {filtered.length !== 1 ? 's' : ''} no período
            </p>
            <Button variant="secondary" size="sm" onClick={openOverviewReport}>
              <FileBarChart size={16} />
              Gerar relatório PDF
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="!p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-400">TCT médio geral</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {overallAvg != null ? formatScore(overallAvg) : '—'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Taxa de acerto consolidada</p>
                </div>
                <div className="rounded-2xl bg-primary-500/15 p-2.5">
                  <TrendingUp size={20} className="text-primary-400" />
                </div>
              </div>
            </Card>
            <Card className="!p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-400">Respostas</p>
                  <p className="text-3xl font-bold text-white mt-1">{filtered.length}</p>
                  <p className="text-xs text-slate-500 mt-1">no recorte filtrado</p>
                </div>
                <div className="rounded-2xl bg-sky-500/15 p-2.5">
                  <ClipboardList size={20} className="text-sky-400" />
                </div>
              </div>
            </Card>
            <Card className="!p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-400">Formulários</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.length}</p>
                  <p className="text-xs text-slate-500 mt-1">com dados no período</p>
                </div>
                <div className="rounded-2xl bg-violet-500/15 p-2.5">
                  <BarChart3 size={20} className="text-violet-400" />
                </div>
              </div>
            </Card>
            <Card className="!p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-400">Alunos únicos</p>
                  <p className="text-3xl font-bold text-white mt-1">{studentCount}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {overallTheta != null ? `θ médio ${overallTheta.toFixed(2)}` : 'sem TRI calibrado'}
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-500/15 p-2.5">
                  <Users size={20} className="text-emerald-400" />
                </div>
              </div>
            </Card>
          </div>

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
                subtitle="Comparativo entre avaliações"
                items={stats.map((s) => ({
                  label: s.title,
                  value: s.averageTCT,
                  displayValue: formatScore(s.averageTCT),
                }))}
              />
            </Card>
          </div>

          <Card className="!p-5">
            <VerticalBarChart
              title="Respostas por formulário"
              subtitle="Volume de respostas recebidas"
              height={280}
              items={stats.map((s) => ({
                label: s.title,
                value: s.totalResponses,
                color: CHART_COLORS.primary,
              }))}
            />
          </Card>
        </>
      )}

      <div className="space-y-3">
        {stats.map((s) => (
          <Card key={s.formId} className="!p-0 overflow-hidden border-white/10">
            <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4 border-b border-white/5">
              <div className="min-w-0">
                <Link
                  to={`/professor/relatorios/formulario/${s.formId}`}
                  className="font-semibold text-white hover:text-primary-300 transition-colors inline-flex items-center gap-1"
                >
                  {s.title}
                  <ChevronRight size={16} className="opacity-50" />
                </Link>
                <p className="text-sm text-slate-400 mt-1">
                  {s.totalResponses} resposta{s.totalResponses !== 1 ? 's' : ''} · {s.uniqueStudents}{' '}
                  aluno{s.uniqueStudents !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                <Badge variant="info">TCT {formatScore(s.averageTCT)}</Badge>
                {s.averageTheta != null && (
                  <Badge variant="default">θ {s.averageTheta.toFixed(2)}</Badge>
                )}
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
              <FormStatCell label="Respostas" value={String(s.totalResponses)} />
              <FormStatCell label="Alunos" value={String(s.uniqueStudents)} />
              <FormStatCell
                label="TCT médio"
                value={formatScore(s.averageTCT)}
                accent="text-primary-300"
              />
              <FormStatCell
                label="Proficiência TRI"
                value={s.averageTheta != null ? s.averageTheta.toFixed(2) : '—'}
                sub={s.averageTheta != null ? 'escala −3 a +3' : 'sem calibração'}
              />
            </div>

            <div className="px-5 pb-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                Distribuição por nível
              </p>
              <ProficiencyMiniBar byNivel={s.byNivel} total={s.totalResponses} />
            </div>
          </Card>
        ))}
        {stats.length === 0 && (
          <Card>
            <p className="text-slate-400 text-center py-8">Nenhum dado disponível para os filtros selecionados.</p>
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
