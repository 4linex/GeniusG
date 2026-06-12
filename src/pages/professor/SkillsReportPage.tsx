import { useMemo, useState } from 'react'
import { FileBarChart } from 'lucide-react'
import { useReportData } from '@/hooks/useReportData'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { RecoveryReportModal } from '@/components/reports/RecoveryReportModal'
import { ReportFiltersBar } from '@/components/reports/ReportFiltersBar'
import { CHART_COLORS, DonutChart, HorizontalBarChart } from '@/components/reports/ReportCharts'
import { buildSkillsRecoveryReport } from '@/lib/recoveryReport'
import type { RecoveryReportData } from '@/lib/recoveryReport'
import { resolveScopedFormIds } from '@/lib/scopedForms'
import { useAuth } from '@/contexts/AuthContext'
import {
  aggregateSkillsFromAnswers,
  applyReportFilters,
  type ReportFilters,
  uniqueForms,
  uniqueStudents,
} from '@/lib/reportAnalytics'

export function SkillsReportPage() {
  const { user, profile } = useAuth()
  const { responses, answers, loading } = useReportData()
  const [view, setView] = useState<'habilidade' | 'bloom'>('habilidade')
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

  const skills = view === 'habilidade' ? bnccSkills : bloomSkills
  const deficit = skills.filter((s) => s.percentage < 60)

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
        searchPlaceholder="Buscar habilidade, aluno ou formulário..."
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {(['habilidade', 'bloom'] as const).map((v) => (
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
              {v === 'habilidade' ? 'Habilidade BNCC' : 'Nível Bloom'}
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

      {skills.length > 0 && (
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

      {deficit.length > 0 && (
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

      <RecoveryReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        data={reportData}
        loading={reportLoading}
      />
    </div>
  )
}
