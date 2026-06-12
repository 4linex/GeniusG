import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, FileBarChart } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ProficiencyLevelChartCard } from '@/components/dashboard/ProficiencyLevelChart'
import { RecoveryReportModal } from '@/components/reports/RecoveryReportModal'
import { CHART_COLORS, DonutChart, HorizontalBarChart } from '@/components/reports/ReportCharts'
import { ReportFiltersBar } from '@/components/reports/ReportFiltersBar'
import { buildFormRecoveryReport } from '@/lib/recoveryReport'
import type { RecoveryReportData } from '@/lib/recoveryReport'
import {
  type ReportFilters,
} from '@/lib/reportAnalytics'
import {
  loadFormAssessmentDetail,
  type FormAssessmentSummary,
  type FormStudentRow,
  type SkillBreakdownRow,
} from '@/lib/formAssessmentReport'
import { resolveScopedFormIds, canAccessForm } from '@/lib/scopedForms'
import { formatDate, formatScore } from '@/lib/utils'
import { NIVEL_PROFICIENCIA_LABELS } from '@/lib/scoring'

export function FormReportDetailPage() {
  const { formId } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [summary, setSummary] = useState<FormAssessmentSummary | null>(null)
  const [students, setStudents] = useState<FormStudentRow[]>([])
  const [bnccSkills, setBnccSkills] = useState<SkillBreakdownRow[]>([])
  const [bloomSkills, setBloomSkills] = useState<SkillBreakdownRow[]>([])
  const [filters, setFilters] = useState<ReportFilters>({})
  const [reportOpen, setReportOpen] = useState(false)
  const [reportData, setReportData] = useState<RecoveryReportData | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  useEffect(() => {
    if (!formId || !user?.id || !profile?.role) return

    const load = async () => {
      setLoading(true)
      setDenied(false)
      try {
        const scoped = await resolveScopedFormIds(user.id, profile.role)
        if (!canAccessForm(formId, scoped)) {
          setDenied(true)
          return
        }
        const data = await loadFormAssessmentDetail(formId)
        if (!data) {
          setDenied(true)
          return
        }
        setSummary(data.summary)
        setStudents(data.students)
        setBnccSkills(data.bnccSkills)
        setBloomSkills(data.bloomSkills)
      } catch (err) {
        console.error(err)
        setDenied(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [formId, user?.id, profile?.role])

  const studentOptions = useMemo(
    () =>
      students.map((s) => ({ email: s.student_email, name: s.student_name })),
    [students],
  )

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (filters.studentEmail && s.student_email !== filters.studentEmail) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!`${s.student_name} ${s.student_email}`.toLowerCase().includes(q)) return false
      }
      if (filters.dateFrom && new Date(s.completed_at) < new Date(`${filters.dateFrom}T00:00:00`)) {
        return false
      }
      if (filters.dateTo && new Date(s.completed_at) > new Date(`${filters.dateTo}T23:59:59`)) {
        return false
      }
      return true
    })
  }, [students, filters])

  const filteredSummary = useMemo(() => {
    if (!summary) return null
    const tct = filteredStudents
      .map((s) => s.percentual_acerto)
      .filter((v): v is number => v != null)
    const byNivel = { inicial: 0, intermediario: 0, avancado: 0 }
    for (const s of filteredStudents) {
      if (s.nivel_proficiencia && s.nivel_proficiencia in byNivel) {
        byNivel[s.nivel_proficiencia]++
      }
    }
    return {
      totalResponses: filteredStudents.length,
      averageTct:
        tct.length > 0
          ? Math.round((tct.reduce((a, b) => a + b, 0) / tct.length) * 10) / 10
          : 0,
      byNivel,
    }
  }, [summary, filteredStudents])

  const deficitSkills = bnccSkills.filter((s) => s.percentage < 60)
  const bloomDeficit = bloomSkills.filter((s) => s.percentage < 60)

  const openReport = async () => {
    if (!formId) return
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
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
      </div>
    )
  }

  if (denied || !summary || !filteredSummary) {
    return (
      <div>
        <Link
          to="/professor/relatorios/formulario"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6"
        >
          <ArrowLeft size={16} />
          Voltar para formulários
        </Link>
        <Card>
          <p className="text-slate-400 text-center py-8">Formulário não encontrado ou sem acesso.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/professor/relatorios/formulario"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4"
          >
            <ArrowLeft size={16} />
            Voltar para formulários
          </Link>
          <h1 className="text-2xl font-bold text-white">{summary.title}</h1>
          {summary.turma && <p className="text-slate-400 mt-1">Turma: {summary.turma}</p>}
        </div>
        <Button variant="secondary" size="sm" onClick={openReport}>
          <FileBarChart size={16} />
          Gerar relatório PDF
        </Button>
      </div>

      <ReportFiltersBar
        filters={filters}
        onChange={setFilters}
        students={studentOptions}
        showForm={false}
        searchPlaceholder="Buscar aluno..."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="!p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Respostas</p>
          <p className="text-3xl font-bold text-white mt-1">{filteredSummary.totalResponses}</p>
        </Card>
        <Card className="!p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide">TCT médio</p>
          <p className="text-3xl font-bold text-white mt-1">
            {filteredSummary.totalResponses > 0 ? formatScore(filteredSummary.averageTct) : '—'}
          </p>
        </Card>
        <Card className="!p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Habilidades críticas</p>
          <p className="text-3xl font-bold text-red-400 mt-1">{deficitSkills.length}</p>
          <p className="text-xs text-slate-500 mt-1">Abaixo de 60%</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="!p-5">
          <ProficiencyLevelChartCard
            byNivel={filteredSummary.byNivel}
            totalResponses={filteredSummary.totalResponses}
          />
        </Card>
        <Card className="!p-5">
          <DonutChart
            title="Distribuição por nível"
            subtitle="Proporção de alunos em cada nível de proficiência"
            centerLabel={String(filteredSummary.totalResponses)}
            centerSubLabel="Respostas"
            segments={[
              {
                label: NIVEL_PROFICIENCIA_LABELS.inicial,
                value: filteredSummary.byNivel.inicial,
                color: CHART_COLORS.inicial,
              },
              {
                label: NIVEL_PROFICIENCIA_LABELS.intermediario,
                value: filteredSummary.byNivel.intermediario,
                color: CHART_COLORS.intermediario,
              },
              {
                label: NIVEL_PROFICIENCIA_LABELS.avancado,
                value: filteredSummary.byNivel.avancado,
                color: CHART_COLORS.avancado,
              },
            ]}
          />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="!p-5">
          <HorizontalBarChart
            title="Habilidades BNCC / SAEB"
            subtitle="Ordenado do menor ao maior desempenho — vermelho abaixo de 60%"
            items={bnccSkills.slice(0, 10).map((s) => ({
              label: s.label,
              value: s.percentage,
              displayValue: `${s.percentage}% (${s.correct}/${s.total})`,
              isCritical: s.percentage < 60,
            }))}
          />
        </Card>
        <Card className="!p-5">
          <HorizontalBarChart
            title="Nível Bloom"
            subtitle="Desempenho por nível cognitivo"
            items={bloomSkills.map((s) => ({
              label: s.label,
              value: s.percentage,
              displayValue: `${s.percentage}% (${s.correct}/${s.total})`,
              color: CHART_COLORS.bloom,
              isCritical: s.percentage < 60,
            }))}
          />
        </Card>
      </div>

      {deficitSkills.length > 0 && (
        <Card className="!p-5 border-red-500/20">
          <h2 className="text-lg font-semibold text-red-300 mb-3">Habilidades com déficit</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {deficitSkills.map((s) => (
              <div
                key={s.key}
                className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3"
              >
                <p className="text-sm font-medium text-white truncate">{s.label}</p>
                <p className="text-xs text-red-300 mt-1">
                  {s.percentage}% · {s.correct}/{s.total} acertos
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {bloomDeficit.length > 0 && (
        <Card className="!p-5">
          <HorizontalBarChart
            title="Bloom — níveis com déficit"
            items={bloomDeficit.map((s) => ({
              label: s.label,
              value: s.percentage,
              isCritical: true,
            }))}
          />
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-white mb-4">
          Respostas dos alunos ({filteredStudents.length})
        </h2>
        {filteredStudents.length === 0 ? (
          <p className="text-slate-400 text-center py-8 text-sm">Nenhuma resposta com os filtros atuais.</p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="text-left py-3 px-4 font-medium">Aluno</th>
                  <th className="text-left py-3 px-4 font-medium">TCT</th>
                  <th className="text-left py-3 px-4 font-medium">Nível</th>
                  <th className="text-left py-3 px-4 font-medium">Acertos</th>
                  <th className="text-left py-3 px-4 font-medium">Data</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-white/5 hover:bg-white/[0.04] cursor-pointer transition-colors"
                    onClick={() =>
                      navigate(`/dashboard/avaliacoes/${formId}/resposta/${s.id}`)
                    }
                  >
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-white">{s.student_name}</p>
                      <p className="text-xs text-slate-500">{s.student_email}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      {s.percentual_acerto != null ? formatScore(s.percentual_acerto) : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {s.nivel_proficiencia ? (
                        <Badge variant="info">
                          {NIVEL_PROFICIENCIA_LABELS[s.nivel_proficiencia]}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {s.correct_answers}/{s.total_questions}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{formatDate(s.completed_at)}</td>
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
