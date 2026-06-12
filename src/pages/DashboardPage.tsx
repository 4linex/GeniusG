import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus'
import { PERFORMANCE_STATUS_LABELS } from '@/hooks/useScopedResponses'
import { cn, formatDate, formatScore } from '@/lib/utils'
import { buildDashboardRecoveryReport, type RecoveryReportData } from '@/lib/recoveryReport'
import { RecoveryReportModal } from '@/components/reports/RecoveryReportModal'
import {
  CHART_COLORS,
  DonutChart,
  HorizontalBarChart,
  VerticalBarChart,
} from '@/components/reports/ReportCharts'
import { ProficiencyLevelChart } from '@/components/dashboard/ProficiencyLevelChart'
import { TriByFormChart } from '@/components/dashboard/TriByFormChart'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  GraduationCap,
  Layers,
  TrendingUp,
  Users,
} from 'lucide-react'
import type { NivelProficiencia } from '@/types/database'

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
  to,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  iconBg: string
  iconColor: string
  to?: string
}) {
  const card = (
    <Card className={cn('!p-5', to && 'cursor-pointer hover:border-white/20 transition-colors')}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-emerald-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${iconBg}`}>
          <Icon size={22} className={iconColor} />
        </div>
      </div>
    </Card>
  )

  if (to) {
    return (
      <Link to={to} className="block">
        {card}
      </Link>
    )
  }

  return card
}

const NIVEL_ORDER: NivelProficiencia[] = ['inicial', 'intermediario', 'avancado']

const NIVEL_SHORT: Record<NivelProficiencia, string> = {
  inicial: 'Inicial',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { stats, charts, evaluations, triByForm, loading, error, refetch } = useDashboardData(
    user?.id,
    profile?.role,
  )
  const [reportOpen, setReportOpen] = useState(false)
  const [reportData, setReportData] = useState<RecoveryReportData | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  useRefreshOnFocus(refetch, Boolean(user && profile))

  const openGeneralReport = async () => {
    if (!user?.id || !profile?.role) return
    setReportOpen(true)
    setReportLoading(true)
    try {
      setReportData(await buildDashboardRecoveryReport(user.id, profile.role))
    } finally {
      setReportLoading(false)
    }
  }

  const mediaDelta =
    stats.mediaMesAnterior > 0
      ? Math.round((stats.mediaTurma - stats.mediaMesAnterior) * 10) / 10
      : null

  const statusSegments = useMemo(
    () =>
      (['excelente', 'bom', 'regular', 'atencao'] as const).map((key) => ({
        label: PERFORMANCE_STATUS_LABELS[key],
        value: charts.statusCounts[key],
        color: CHART_COLORS[key],
      })),
    [charts.statusCounts],
  )

  const nivelSegments = useMemo(
    () =>
      NIVEL_ORDER.map((key) => ({
        label: NIVEL_SHORT[key],
        value: charts.byNivel[key],
        color: CHART_COLORS[key],
      })),
    [charts.byNivel],
  )

  const tctBucketItems = useMemo(
    () =>
      charts.tctBuckets.map((b, i) => ({
        label: b.label,
        value: b.count,
        color: ['#ef4444', '#f59e0b', '#14b8a6', '#10b981'][i] ?? CHART_COLORS.primary,
      })),
    [charts.tctBuckets],
  )

  const formTctItems = useMemo(
    () =>
      charts.formTctBars.map((f) => ({
        label: f.title.length > 28 ? `${f.title.slice(0, 26)}…` : f.title,
        value: f.averageTct,
        displayValue: `${formatScore(f.averageTct)} · ${f.totalResponses} resp.`,
        color: f.averageTct >= 60 ? CHART_COLORS.bom : f.averageTct >= 40 ? CHART_COLORS.regular : CHART_COLORS.atencao,
      })),
    [charts.formTctBars],
  )

  const criticalSkillItems = useMemo(
    () =>
      charts.criticalSkills.map((s) => ({
        label: s.label.length > 36 ? `${s.label.slice(0, 34)}…` : s.label,
        value: s.percentage,
        isCritical: true,
      })),
    [charts.criticalSkills],
  )

  const bloomItems = useMemo(
    () =>
      charts.bloomSkills.map((s) => ({
        label: s.label,
        value: s.percentage,
        color: CHART_COLORS.bloom,
      })),
    [charts.bloomSkills],
  )

  const hasData = stats.totalRespostas > 0

  if (loading && evaluations.length === 0) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1 max-w-xl">
            Centro de análise — visão consolidada de avaliações, desempenho dos alunos e
            habilidades que precisam de atenção.
          </p>
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
            className="inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all px-3 py-1.5 text-sm bg-white/10 text-white hover:bg-white/20 border border-white/10"
          >
            <Users size={16} />
            Alunos
          </Link>
          <Link
            to="/professor/relatorios/formulario"
            className="inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all px-3 py-1.5 text-sm bg-white/10 text-white hover:bg-white/20 border border-white/10"
          >
            <ClipboardList size={16} />
            Por formulário
          </Link>
          <Link
            to="/professor/relatorios/habilidades"
            className="inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all px-3 py-1.5 text-sm bg-white/10 text-white hover:bg-white/20 border border-white/10"
          >
            <Layers size={16} />
            Habilidades
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-400">
          {error}
          <button type="button" onClick={refetch} className="ml-2 underline">
            Tentar novamente
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Avaliações Aplicadas"
          value={stats.avaliacoesAplicadas}
          sub={
            stats.formulariosComRespostas > 0
              ? `${stats.formulariosComRespostas} com respostas`
              : stats.avaliacoesMesAtual > 0
                ? `+${stats.avaliacoesMesAtual} este mês`
                : undefined
          }
          icon={ClipboardList}
          iconBg="bg-primary-500/15"
          iconColor="text-primary-400"
          to="/formularios"
        />
        <StatCard
          label="Alunos Avaliados"
          value={stats.alunosAvaliados}
          sub={
            stats.totalRespostas > 0
              ? `${stats.totalRespostas} respostas no total`
              : stats.alunosMesAtual > 0
                ? `+${stats.alunosMesAtual} este mês`
                : undefined
          }
          icon={Users}
          iconBg="bg-emerald-500/15"
          iconColor="text-emerald-400"
          to="/professor/relatorios/alunos"
        />
        <StatCard
          label="Habilidades Críticas"
          value={stats.habilidadesCriticas}
          sub={stats.habilidadesCriticas > 0 ? 'Abaixo de 60% de acerto' : 'Nenhuma abaixo de 60%'}
          icon={AlertTriangle}
          iconBg="bg-amber-500/15"
          iconColor="text-amber-400"
          to="/professor/relatorios/habilidades"
        />
        <StatCard
          label="Média Geral TCT"
          value={stats.mediaTurma > 0 ? `${formatScore(stats.mediaTurma)}` : '—'}
          sub={
            mediaDelta != null
              ? `${mediaDelta >= 0 ? '+' : ''}${mediaDelta}% vs mês anterior`
              : undefined
          }
          icon={TrendingUp}
          iconBg="bg-violet-500/15"
          iconColor="text-violet-400"
        />
      </div>

      {hasData ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-6 items-stretch">
            <Card className="p-5 flex flex-col min-h-[320px]">
              <DonutChart
                title="Status de desempenho"
                subtitle="Distribuição por faixa de acerto (TCT)"
                segments={statusSegments}
                centerLabel={String(stats.totalRespostas)}
                centerSubLabel="respostas"
                layout="vertical"
                size={148}
              />
            </Card>
            <Card className="p-5 flex flex-col min-h-[320px]">
              <DonutChart
                title="Nível de proficiência"
                subtitle="Classificação TRI por resposta"
                segments={nivelSegments}
                centerLabel={String(stats.totalRespostas)}
                centerSubLabel="avaliações"
                layout="vertical"
                size={148}
                showEmptyInLegend
              />
            </Card>
            <Card className="p-5 flex flex-col min-h-[320px] md:col-span-2 xl:col-span-1">
              <VerticalBarChart
                title="Faixas de acerto (TCT)"
                subtitle="Quantidade de respostas por intervalo"
                items={tctBucketItems}
                height={220}
                className="flex-1 flex flex-col"
              />
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
            <Card className="p-5">
              <HorizontalBarChart
                title="Desempenho por formulário"
                subtitle="Média TCT em cada avaliação"
                items={formTctItems}
                emptyMessage="Nenhum formulário com respostas."
              />
            </Card>
            <Card className="p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">TRI por formulário</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Média de θ (proficiência estimada) por avaliação
                  </p>
                </div>
                <BarChart3 size={20} className="text-primary-400 shrink-0 mt-1" />
              </div>
              <TriByFormChart data={triByForm} />
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
            <Card className="p-5">
              <HorizontalBarChart
                title="Habilidades com maior déficit"
                subtitle="BNCC / SAEB com acerto abaixo de 60%"
                items={criticalSkillItems}
                emptyMessage="Nenhuma habilidade crítica identificada."
              />
              {stats.habilidadesCriticas > 0 && (
                <Link
                  to="/professor/relatorios/habilidades"
                  className="inline-flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 mt-4 transition-colors"
                >
                  Ver relatório completo de habilidades
                  <ArrowRight size={14} />
                </Link>
              )}
            </Card>
            <Card className="p-5">
              <HorizontalBarChart
                title="Taxonomia de Bloom"
                subtitle="Percentual de acerto por nível cognitivo"
                items={bloomItems}
                emptyMessage="Sem dados de Bloom nas questões."
              />
            </Card>
          </div>

          <Card className="p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap size={20} className="text-teal-400" />
              <div>
                <h2 className="text-lg font-semibold text-white">Distribuição de proficiência</h2>
                <p className="text-sm text-slate-400">
                  Quantidade de respostas em cada nível (inicial, intermediário, avançado)
                </p>
              </div>
            </div>
            <ProficiencyLevelChart
              byNivel={charts.byNivel}
              totalResponses={stats.totalRespostas}
            />
          </Card>
        </>
      ) : (
        <Card className="p-8 mb-6 text-center">
          <BarChart3 size={40} className="mx-auto text-slate-600 mb-4" />
          <p className="text-white font-medium">Ainda não há dados para exibir gráficos</p>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
            Compartilhe um formulário com os alunos. Os gráficos de desempenho, proficiência e
            habilidades aparecerão aqui automaticamente.
          </p>
          <Link
            to="/formularios"
            className="inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all px-4 py-2 text-sm gradient-bg text-white hover:opacity-90 shadow-lg shadow-primary-500/25 mt-6"
          >
            Ir para formulários
          </Link>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Últimas avaliações</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Clique em uma linha para ver o relatório detalhado
            </p>
          </div>
          <Link
            to="/professor/relatorios/formulario"
            className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 shrink-0"
          >
            Ver todas
            <ChevronRight size={16} />
          </Link>
        </div>

        {evaluations.length === 0 ? (
          <p className="text-slate-400 text-center py-10">
            Nenhuma avaliação com respostas ainda. Compartilhe um formulário para os alunos
            responderem.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="text-left py-3 px-4 font-medium">Nome</th>
                  <th className="text-left py-3 px-4 font-medium">Última resposta</th>
                  <th className="text-left py-3 px-4 font-medium">Respostas</th>
                  <th className="text-left py-3 px-4 font-medium">Média TCT</th>
                  <th className="text-left py-3 px-4 font-medium hidden sm:table-cell">θ médio</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {evaluations.map((ev) => (
                  <tr
                    key={ev.id}
                    className="border-b border-white/5 hover:bg-white/[0.04] cursor-pointer transition-colors"
                    onClick={() => navigate(`/professor/relatorios/formulario/${ev.id}`)}
                  >
                    <td className="py-3.5 px-4 font-medium text-white">{ev.title}</td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {ev.last_response_at ? formatDate(ev.last_response_at) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{ev.total_responses}</td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {ev.average_tct != null ? formatScore(ev.average_tct) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 hidden sm:table-cell font-mono text-xs">
                      {ev.average_theta != null ? ev.average_theta.toFixed(2) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      <ChevronRight size={16} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <RecoveryReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        data={reportData}
        loading={reportLoading}
      />
    </div>
  )
}
