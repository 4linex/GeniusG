import { useMemo, useState } from 'react'
import { BarChart3, FileBarChart } from 'lucide-react'
import { useReportDataContext } from '@/contexts/ReportDataContext'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { RecoveryReportModal } from '@/components/reports/RecoveryReportModal'
import { ReportFiltersBar } from '@/components/reports/ReportFiltersBar'
import { CHART_COLORS, DonutChart, HorizontalBarChart } from '@/components/reports/ReportCharts'
import { TriByFormChart } from '@/components/dashboard/TriByFormChart'
import { ProficiencyLevelChart } from '@/components/dashboard/ProficiencyLevelChart'
import { buildSkillsRecoveryReport } from '@/lib/recoveryReport'
import type { RecoveryReportData } from '@/lib/recoveryReport'
import { resolveScopedFormIds } from '@/lib/scopedForms'
import { useAuth } from '@/contexts/AuthContext'
import { NIVEL_PROFICIENCIA_LABELS } from '@/lib/scoring'
import type { NivelProficiencia } from '@/types/database'
import {
  aggregateSkillsFromAnswers,
  aggregateTriBySkill,
  applyReportFilters,
  averageThetaFromResponses,
  buildTriChartFromResponses,
  countByProficiency,
  type ReportFilters,
  thetaToBarPercent,
  uniqueForms,
  uniqueStudents,
} from '@/lib/reportAnalytics'

const NIVEL_ORDER: NivelProficiencia[] = ['inicial', 'intermediario', 'avancado']

type SkillsView = 'habilidade' | 'bloom' | 'tri'

export function SkillsReportPage() {
  const { user, profile } = useAuth()
  const { responses, answers, loading, error } = useReportDataContext()
  const [view, setView] = useState<SkillsView>('habilidade')
  const [filters, setFilters] = useState<ReportFilters>({})
  const [reportOpen, setReportOpen] = useState(false)
  const [reportData, setReportData] = useState<RecoveryReportData | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  const forms = useMemo(() => uniqueForms(responses), [responses])
  const students = useMemo(() => uniqueStudents(responses), [responses])
  const filteredResponses = useMemo(
    () => applyReportFilters(responses, filters),
    [responses, filters],
  )
  const filteredIds = useMemo(
    () => new Set(filteredResponses.map((r) => r.id)),
    [filteredResponses],
  )

  const bnccSkills = useMemo(
    () => aggregateSkillsFromAnswers(answers, filteredIds, 'habilidade'),
    [answers, filteredIds],
  )
  const bloomSkills = useMemo(
    () => aggregateSkillsFromAnswers(answers, filteredIds, 'bloom'),
    [answers, filteredIds],
  )

  const byNivel = useMemo(() => countByProficiency(filteredResponses), [filteredResponses])
  const triByForm = useMemo(() => buildTriChartFromResponses(filteredResponses), [filteredResponses])
  const averageTheta = useMemo(
    () => averageThetaFromResponses(filteredResponses),
    [filteredResponses],
  )
  const triBySkill = useMemo(
    () => aggregateTriBySkill(answers, filteredResponses, filteredIds),
    [answers, filteredResponses, filteredIds],
  )

  const skills = view === 'habilidade' ? bnccSkills : view === 'bloom' ? bloomSkills : []
  const deficit = skills.filter((s) => s.percentage < 60)

  const triNivelSegments = useMemo(
    () =>
      NIVEL_ORDER.filter((n) => byNivel[n] > 0).map((n) => ({
        label: NIVEL_PROFICIENCIA_LABELS[n],
        value: byNivel[n],
        color: CHART_COLORS[n],
      })),
    [byNivel],
  )

  const triSkillItems = useMemo(
    () =>
      triBySkill.map((s) => ({
        label: s.label.length > 40 ? `${s.label.slice(0, 38)}…` : s.label,
        value: s.averageTheta != null ? thetaToBarPercent(s.averageTheta) : 0,
        displayValue:
          s.averageTheta != null
            ? `θ ${s.averageTheta.toFixed(2)} · ${s.responseCount} aluno(s)`
            : '—',
        color:
          s.averageTheta != null && s.averageTheta >= 0.5
            ? CHART_COLORS.avancado
            : s.averageTheta != null && s.averageTheta >= -0.5
              ? CHART_COLORS.regular
              : CHART_COLORS.atencao,
      })),
    [triBySkill],
  )

  const openReport = async () => {
    if (!user?.id || !profile?.role) return
    setReportOpen(true)
    setReportLoading(true)
    try {
      const scopedFormIds = await resolveScopedFormIds(user.id, profile.role)
      const ids = filteredResponses.map((r) => r.id)
      setReportData(await buildSkillsRecoveryReport(ids, scopedFormIds))
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
        searchPlaceholder="Buscar habilidade, aluno ou formulário..."
      />

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2 flex-wrap">
          {(
            [
              ['habilidade', 'Habilidade BNCC'],
              ['bloom', 'Nível Bloom'],
              ['tri', 'TRI (θ)'],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                view === v
                  ? 'bg-primary-500/20 text-primary-300'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {filteredResponses.length > 0 && (
          <Button variant="secondary" size="sm" onClick={openReport}>
            <FileBarChart size={16} />
            Gerar relatório PDF
          </Button>
        )}
      </div>

      {view === 'tri' && filteredResponses.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="!p-5">
              <p className="text-sm text-slate-400">Proficiência média (θ)</p>
              <p className="text-3xl font-bold text-white mt-1 font-mono">
                {averageTheta != null ? averageTheta.toFixed(2) : '—'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Escala de −3 a +3</p>
            </Card>
            <Card className="!p-5">
              <p className="text-sm text-slate-400">Respostas com TRI</p>
              <p className="text-3xl font-bold text-white mt-1">
                {filteredResponses.filter((r) => r.theta != null).length}
              </p>
              <p className="text-xs text-slate-500 mt-1">de {filteredResponses.length} no filtro</p>
            </Card>
            <Card className="!p-5">
              <p className="text-sm text-slate-400">Formulários</p>
              <p className="text-3xl font-bold text-white mt-1">{triByForm.length}</p>
              <p className="text-xs text-slate-500 mt-1">com dados de θ por avaliação</p>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="!p-5 flex flex-col">
              <DonutChart
                title="Níveis de proficiência TRI"
                subtitle="Proporção das respostas filtradas"
                centerLabel={String(filteredResponses.length)}
                centerSubLabel="respostas"
                segments={triNivelSegments}
                layout="vertical"
                size={176}
                showEmptyInLegend
                className="flex-1"
              />
            </Card>
            <Card className="!p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">TRI por formulário</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Posição de θ na escala de −3 a +3 por avaliação
                  </p>
                </div>
                <BarChart3 size={20} className="text-primary-400 shrink-0 mt-1" />
              </div>
              <TriByFormChart data={triByForm} />
            </Card>
          </div>

          <Card className="!p-5">
            <ProficiencyLevelChart
              byNivel={byNivel}
              totalResponses={filteredResponses.length}
            />
          </Card>

          {triBySkill.length > 0 && (
            <Card className="!p-5">
              <HorizontalBarChart
                title="θ médio por habilidade BNCC"
                subtitle="Proficiência estimada dos alunos em cada competência"
                items={triSkillItems}
                maxValue={100}
                valueSuffix=""
                emptyMessage="Nenhuma habilidade com dados TRI."
              />
            </Card>
          )}
        </>
      )}

      {view !== 'tri' && skills.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="!p-5">
            <HorizontalBarChart
              title={view === 'habilidade' ? 'Desempenho por habilidade' : 'Desempenho por Bloom'}
              subtitle="Top 12 competências — vermelho indica déficit (&lt;60%)"
              items={skills.slice(0, 12).map((s) => ({
                label: s.label,
                value: s.percentage,
                displayValue: `${s.percentage}% (${s.correct}/${s.total})`,
                isCritical: s.percentage < 60,
                color: view === 'bloom' ? CHART_COLORS.bloom : undefined,
              }))}
            />
          </Card>
          <Card className="!p-5">
            <DonutChart
              title="Habilidades adequadas vs. déficit"
              centerLabel={String(skills.length)}
              centerSubLabel="Competências"
              segments={[
                {
                  label: 'Adequadas (≥60%)',
                  value: skills.filter((s) => s.percentage >= 60).length,
                  color: CHART_COLORS.avancado,
                },
                {
                  label: 'Com déficit (<60%)',
                  value: deficit.length,
                  color: CHART_COLORS.atencao,
                },
              ]}
            />
          </Card>
        </div>
      )}

      {view !== 'tri' && deficit.length > 0 && (
        <Card className="!p-5 border-red-500/20">
          <h2 className="text-lg font-semibold text-red-300 mb-3">
            Habilidades com déficit ({deficit.length})
          </h2>
          <HorizontalBarChart
            items={deficit.map((s) => ({
              label: s.label,
              value: s.percentage,
              displayValue: `${s.percentage}% (${s.correct}/${s.total})`,
              isCritical: true,
            }))}
          />
        </Card>
      )}

      {view !== 'tri' && (
      <div className="space-y-3">
        {skills.map((s) => (
          <Card key={s.key}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white text-sm truncate">{s.label}</h3>
                <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${s.percentage}%`,
                      backgroundColor: s.percentage < 60 ? CHART_COLORS.atencao : CHART_COLORS.primary,
                    }}
                  />
                </div>
              </div>
              <div className="text-right shrink-0">
                <Badge variant={s.percentage >= 60 ? 'success' : 'warning'}>
                  {s.percentage}%
                </Badge>
                <p className="text-xs text-slate-500 mt-1">
                  {s.correct}/{s.total}
                </p>
              </div>
            </div>
          </Card>
        ))}
        {skills.length === 0 && (
          <Card>
            <p className="text-slate-400 text-center py-8">Nenhum dado disponível.</p>
          </Card>
        )}
      </div>
      )}

      {view === 'tri' && filteredResponses.length === 0 && (
        <Card>
          <p className="text-slate-400 text-center py-8">Nenhum dado TRI disponível para os filtros selecionados.</p>
        </Card>
      )}

      <RecoveryReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        data={reportData}
        loading={reportLoading}
      />
    </div>
  )
}
