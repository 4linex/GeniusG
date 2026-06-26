import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  Brain,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  Layers,
  LineChart,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus'
import {
  DashboardContextFiltersBar,
  AdminContextFiltersBar,
  ProfessorContextFiltersBar,
} from '@/components/dashboard/DashboardContextFiltersBar'
import {
  isRootRole,
  isScopedAdminRole,
  EMPTY_DASHBOARD_CONTEXT_FILTERS,
} from '@/lib/dashboardScope'
import type { DashboardContextFilters } from '@/lib/dashboardScope'
import { buildDashboardRecoveryReport, type RecoveryReportData } from '@/lib/recoveryReport'
import { RecoveryReportModal } from '@/components/reports/RecoveryReportModal'
import { DashboardReportPickerModal } from '@/components/reports/DashboardReportPickerModal'
import type { ReportFilters } from '@/lib/reportAnalytics'
import { formatDate, formatScore } from '@/lib/utils'
import { KpiSparkCard } from '@/components/dashboard/bi/KpiSparkCard'
import { DashboardSkeleton } from '@/components/dashboard/bi/DashboardSkeleton'
import { TrailDistributionSection } from '@/components/dashboard/bi/TrailDistributionSection'
import {
  BloomPerformanceChart,
  ComparativeChart,
  FormPerformanceChart,
  LevelDistributionChart,
  type CompareScope,
} from '@/components/dashboard/bi/DashboardRecharts'
import {
  BnccCompetenciesTable,
  CriticalSkillsTable,
  DashboardInsightsPanel,
  ErrorDescriptorsTable,
} from '@/components/dashboard/bi/DashboardTables'
import { BiCard } from '@/components/dashboard/bi/BiCard'
import { buildDashboardInsights } from '@/lib/dashboardInsights'
import {
  averageTri,
  BI_BAR_PALETTE,
  competencyCount,
  evolutionLabel,
  mergeCriticalSkills,
  NIVEL_DISTRIBUTION,
  participationRate,
  performanceLevelLabel,
  sparklineFromBuckets,
  sparklineFromForms,
} from '@/lib/dashboardPresentation'

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [contextFilters, setContextFilters] = useState<DashboardContextFilters>(
    EMPTY_DASHBOARD_CONTEXT_FILTERS,
  )
  const [compareScope, setCompareScope] = useState<CompareScope>('rede')
  const {
    stats,
    charts,
    evaluations,
    triByForm,
    trailDistribution,
    filterOptions,
    filterOptionsLoading,
    loading,
    error,
    refetch,
  } = useDashboardData(user?.id, profile?.role, profile, contextFilters)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportPickerOpen, setReportPickerOpen] = useState(false)
  const [reportData, setReportData] = useState<RecoveryReportData | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  useRefreshOnFocus(refetch, Boolean(user && profile))

  const generateReport = async (scope: ReportFilters) => {
    if (!user?.id || !profile?.role) return
    setReportPickerOpen(false)
    setReportOpen(true)
    setReportLoading(true)
    try {
      const mergedScope: ReportFilters = {
        ...scope,
        municipio: scope.municipio ?? contextFilters.municipio,
        school_name: scope.school_name ?? contextFilters.school_name,
        turma: scope.turma ?? contextFilters.turma,
      }
      setReportData(await buildDashboardRecoveryReport(user.id, profile.role, mergedScope, profile))
    } finally {
      setReportLoading(false)
    }
  }

  const openGeneralReport = () => {
    if (!user?.id || !profile?.role) return
    setReportPickerOpen(true)
  }

  const avgTri = useMemo(() => averageTri(triByForm), [triByForm])

  const formBarItems = useMemo(
    () =>
      charts.formTctBars.map((form, index) => ({
        label: form.title.length > 22 ? `${form.title.slice(0, 20)}…` : form.title,
        value: form.averageTct,
        color: BI_BAR_PALETTE[index % BI_BAR_PALETTE.length],
      })),
    [charts.formTctBars],
  )

  const nivelSegments = useMemo(
    () =>
      NIVEL_DISTRIBUTION.map((item) => ({
        label: item.label,
        value: charts.statusCounts[item.key],
        color: item.color,
      })),
    [charts.statusCounts],
  )

  const bloomItems = useMemo(
    () => charts.bloomSkills.map((skill) => ({ label: skill.label, value: skill.percentage })),
    [charts.bloomSkills],
  )

  const criticalSkills = useMemo(() => mergeCriticalSkills(charts), [charts])

  const insights = useMemo(
    () => buildDashboardInsights({ stats, charts, triByForm, trailDistribution }),
    [stats, charts, triByForm, trailDistribution],
  )

  const participation = participationRate(stats)
  const competencies = competencyCount(charts)

  const sparkPerformance = sparklineFromBuckets(charts.tctBuckets, [
    stats.mediaMesAnterior,
    stats.mediaTurma,
  ])
  const sparkTri = sparklineFromForms(charts.formTctBars)
  const sparkCritical = sparklineFromBuckets(
    charts.criticalBnccSkills.map((skill, index) => ({
      label: String(index),
      count: 100 - skill.percentage,
    })),
    [stats.habilidadesCriticas, stats.habilidadesCriticas],
  )
  const sparkCompetencies = sparklineFromForms(charts.formTctBars)
  const sparkEvolution = [stats.mediaMesAnterior, stats.mediaTurma, stats.mediaTurma]

  const compareReference = useMemo(
    () => ({
      desempenho: stats.mediaMesAnterior,
      tri: avgTri != null && stats.mediaMesAnterior > 0 && stats.mediaTurma > 0
        ? Math.round(avgTri * (stats.mediaMesAnterior / stats.mediaTurma) * 100) / 100
        : 0,
      participacao:
        stats.avaliacoesAplicadas > 0
          ? Math.round((stats.alunosMesAtual / stats.avaliacoesAplicadas) * 100)
          : 0,
    }),
    [avgTri, stats.alunosMesAtual, stats.avaliacoesAplicadas, stats.mediaMesAnterior, stats.mediaTurma],
  )

  const compareCurrent = {
    desempenho: stats.mediaTurma,
    tri: avgTri ?? 0,
    participacao: participation,
  }

  const hasData = stats.totalRespostas > 0
  const isRoot = isRootRole(profile?.role)
  const isScopedAdmin = isScopedAdminRole(profile?.role)

  return (
    <div className="min-w-0 max-w-full space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white sm:text-2xl">Dashboard</h1>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {hasData && (
            <Button variant="secondary" size="sm" onClick={openGeneralReport}>
              <FileBarChart size={16} />
              Relatório PDF
            </Button>
          )}
          <Link
            to="/professor/relatorios/alunos"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-white/20"
          >
            <Users size={16} />
            Alunos
          </Link>
          <Link
            to="/professor/relatorios/formulario"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-white/20"
          >
            <ClipboardList size={16} />
            Por formulário
          </Link>
          <Link
            to="/professor/relatorios/habilidades"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-white/20"
          >
            <Layers size={16} />
            Habilidades
          </Link>
        </div>
      </div>

      {isRoot ? (
        <DashboardContextFiltersBar
          filters={contextFilters}
          options={filterOptions}
          loading={filterOptionsLoading}
          onChange={setContextFilters}
        />
      ) : isScopedAdmin ? (
        <AdminContextFiltersBar
          filters={contextFilters}
          options={filterOptions}
          loading={filterOptionsLoading}
          onChange={setContextFilters}
        />
      ) : (
        <ProfessorContextFiltersBar
          filters={contextFilters}
          options={filterOptions}
          loading={filterOptionsLoading}
          onChange={setContextFilters}
        />
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
          <button type="button" onClick={refetch} className="ml-2 underline">
            Tentar novamente
          </button>
        </div>
      )}

      {loading && evaluations.length === 0 ? (
        <DashboardSkeleton />
      ) : !hasData ? (
        <BiCard>
          <div className="py-10 text-center">
            <BarChart3 size={40} className="mx-auto mb-4 text-slate-600" />
            <p className="font-medium text-white">Ainda não há dados para exibir gráficos</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
              Compartilhe um formulário com os alunos. Os indicadores, gráficos e trilhas aparecerão
              aqui automaticamente.
            </p>
            <Link
              to="/formularios"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-lg shadow-primary-500/25 gradient-bg hover:opacity-90"
            >
              Ir para formulários
            </Link>
          </div>
        </BiCard>
      ) : (
        <>
          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <KpiSparkCard
                title="Desempenho Geral"
                value={stats.mediaTurma > 0 ? `${formatScore(stats.mediaTurma)}` : '—'}
                sub={stats.mediaTurma > 0 ? performanceLevelLabel(stats.mediaTurma) : 'Sem respostas'}
                icon={Target}
                iconClassName="bg-violet-500/15 text-violet-300"
                sparkColor="#8b5cf6"
                sparkData={sparkPerformance}
              />
              <KpiSparkCard
                title="TRI Médio"
                value={avgTri != null ? avgTri.toFixed(0) : '—'}
                sub={
                  triByForm.length > 0
                    ? `Média θ em ${triByForm.length} formulário(s)`
                    : 'Sem dados TRI'
                }
                icon={LineChart}
                iconClassName="bg-blue-500/15 text-blue-300"
                sparkColor="#3b82f6"
                sparkData={sparkTri.length > 0 ? sparkTri : [0]}
              />
              <KpiSparkCard
                title="Habilidades Críticas"
                value={String(stats.habilidadesCriticas)}
                sub={
                  stats.habilidadesCriticas > 0
                    ? 'BNCC e SAEB abaixo de 60%'
                    : 'Nenhuma abaixo de 60%'
                }
                icon={AlertTriangle}
                iconClassName="bg-red-500/15 text-red-300"
                sparkColor="#ef4444"
                sparkData={sparkCritical}
                to="/professor/relatorios/habilidades"
              />
              <KpiSparkCard
                title="Competências Avaliadas"
                value={String(competencies)}
                sub="BNCC + SAEB + Bloom no escopo"
                icon={Brain}
                iconClassName="bg-emerald-500/15 text-emerald-300"
                sparkColor="#10b981"
                sparkData={sparkCompetencies.length > 0 ? sparkCompetencies : [competencies]}
                to="/professor/relatorios/habilidades"
              />
              <KpiSparkCard
                title="Evolução"
                value={
                  stats.mediaMesAnterior > 0
                    ? `${stats.mediaTurma >= stats.mediaMesAnterior ? '+' : ''}${(
                        stats.mediaTurma - stats.mediaMesAnterior
                      ).toFixed(1)}%`
                    : '—'
                }
                sub={evolutionLabel(stats)}
                icon={TrendingUp}
                iconClassName="bg-amber-500/15 text-amber-300"
                sparkColor="#f59e0b"
                sparkData={sparkEvolution}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <TrailDistributionSection rows={trailDistribution} />

              <FormPerformanceChart items={formBarItems} />

              <LevelDistributionChart
                segments={nivelSegments}
                totalStudents={stats.totalRespostas}
              />

              <BloomPerformanceChart items={bloomItems} />

              <CriticalSkillsTable skills={criticalSkills} />

              <ComparativeChart
                scope={compareScope}
                onScopeChange={setCompareScope}
                current={compareCurrent}
                reference={compareReference}
              />

              <BnccCompetenciesTable skills={charts.criticalBnccSkills} />

              <ErrorDescriptorsTable skills={charts.criticalSaebSkills} />

              <DashboardInsightsPanel insights={insights} />
            </div>
          </div>
        </>
      )}

      <Card className="min-w-0 overflow-hidden">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Últimas avaliações</h2>
            <p className="mt-0.5 text-[13px] text-slate-400">
              Clique em uma linha para ver o relatório detalhado
            </p>
          </div>
          <Link
            to="/professor/relatorios/formulario"
            className="flex shrink-0 items-center gap-1 text-sm text-primary-400 hover:text-primary-300"
          >
            Ver todas
            <ChevronRight size={16} />
          </Link>
        </div>

        {evaluations.length === 0 ? (
          <p className="py-10 text-center text-slate-400">
            Nenhuma avaliação com respostas ainda. Compartilhe um formulário para os alunos
            responderem.
          </p>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[13px] text-slate-400">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Última resposta</th>
                  <th className="px-4 py-3 font-medium">Respostas</th>
                  <th className="px-4 py-3 font-medium">Média TCT</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">θ médio</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {evaluations.map((ev) => (
                  <tr
                    key={ev.id}
                    className="cursor-pointer border-b border-white/5 transition-colors hover:bg-white/[0.04]"
                    onClick={() => navigate(`/professor/relatorios/formulario/${ev.id}`)}
                  >
                    <td className="px-4 py-3.5 font-medium text-white">{ev.title}</td>
                    <td className="px-4 py-3.5 text-slate-400">
                      {ev.last_response_at ? formatDate(ev.last_response_at) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">{ev.total_responses}</td>
                    <td className="px-4 py-3.5 text-slate-300">
                      {ev.average_tct != null ? formatScore(ev.average_tct) : '—'}
                    </td>
                    <td className="hidden px-4 py-3.5 font-mono text-xs text-slate-400 sm:table-cell">
                      {ev.average_theta != null ? ev.average_theta.toFixed(2) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      <ChevronRight size={16} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <DashboardReportPickerModal
        open={reportPickerOpen}
        onClose={() => setReportPickerOpen(false)}
        onGenerate={generateReport}
        generating={reportLoading}
        filterOptions={filterOptions}
        contextFilters={contextFilters}
        profile={profile}
      />

      <RecoveryReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        data={reportData}
        loading={reportLoading}
      />
    </div>
  )
}
