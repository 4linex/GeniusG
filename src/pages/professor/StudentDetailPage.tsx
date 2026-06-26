import { Link, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { ArrowLeft, FileBarChart } from 'lucide-react'
import { useScopedResponses } from '@/hooks/useScopedResponses'
import { useReportDataContext } from '@/contexts/ReportDataContext'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { RecoveryReportModal } from '@/components/reports/RecoveryReportModal'
import { StudentReportPickerModal } from '@/components/reports/StudentReportPickerModal'
import { CHART_COLORS, DonutChart, HorizontalBarChart } from '@/components/reports/ReportCharts'
import {
  buildStudentFormRecoveryReport,
  buildStudentRecoveryReport,
} from '@/lib/recoveryReport'
import type { RecoveryReportData } from '@/lib/recoveryReport'
import { aggregateSkillsFromAnswers } from '@/lib/reportAnalytics'
import { formatScore } from '@/lib/utils'
import { formatPercentRange } from '@/lib/formTrails'
import { StudentAnsweredFormCard } from '@/components/trails/StudentAnsweredFormCard'
import { PROFESSOR_TRAIL_COLUMNS } from '@/lib/trailAreas'
import type { FormResponse, FormTrail, LearningTrail } from '@/types/database'

interface ResponseWithTrail extends FormResponse {
  form?: { title: string }
  trail_assignment?: {
    form_trail: Pick<FormTrail, 'min_percent' | 'max_percent'> & {
      learning_trail?: LearningTrail | null
    } | null
  } | null
}

export function StudentDetailPage() {
  const { email: emailParam } = useParams()
  const email = emailParam ? decodeURIComponent(emailParam) : ''
  const [reportOpen, setReportOpen] = useState(false)
  const [reportPickerOpen, setReportPickerOpen] = useState(false)
  const [reportData, setReportData] = useState<RecoveryReportData | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  const { responses: allResponses, loading } = useScopedResponses<ResponseWithTrail>(`
    *,
    form:forms(id, title),
    trail_assignment:student_trail_assignments(
      form_trail:form_trails(
      min_percent,
      max_percent,
      learning_trail:learning_trails(${PROFESSOR_TRAIL_COLUMNS})
    )
    )
  `)

  const responses = allResponses.filter((r) => r.student_email === email)
  const student = responses[0]

  const { answers } = useReportDataContext()
  const responseIds = useMemo(() => new Set(responses.map((r) => r.id)), [responses])
  const bnccSkills = useMemo(
    () => aggregateSkillsFromAnswers(answers, responseIds, 'bncc'),
    [answers, responseIds],
  )
  const saebSkills = useMemo(
    () => aggregateSkillsFromAnswers(answers, responseIds, 'saeb'),
    [answers, responseIds],
  )
  const bloomSkills = useMemo(
    () => aggregateSkillsFromAnswers(answers, responseIds, 'bloom'),
    [answers, responseIds],
  )
  const deficitSkills = bnccSkills.filter((s) => s.percentage < 60)
  const deficitSaeb = saebSkills.filter((s) => s.percentage < 60)

  const formChartItems = useMemo(
    () =>
      responses
        .filter((r) => r.percentual_acerto != null)
        .map((r) => ({
          label: r.form?.title || 'Formulário',
          value: r.percentual_acerto!,
          displayValue: formatScore(r.percentual_acerto!),
        })),
    [responses],
  )

  const tctResponses = responses.filter((r) => r.percentual_acerto != null)
  const avgTct =
    tctResponses.length > 0
      ? tctResponses.reduce((sum, r) => sum + (r.percentual_acerto ?? 0), 0) / tctResponses.length
      : null

  const openGeneralReport = async (filters: { dateFrom?: string; dateTo?: string }) => {
    setReportPickerOpen(false)
    setReportOpen(true)
    setReportLoading(true)
    try {
      const data = await buildStudentRecoveryReport(allResponses, email, filters)
      setReportData(data)
    } finally {
      setReportLoading(false)
    }
  }

  const openFormReport = async (formId: string) => {
    setReportOpen(true)
    setReportLoading(true)
    try {
      const data = await buildStudentFormRecoveryReport(allResponses, email, formId)
      setReportData(data)
    } finally {
      setReportLoading(false)
    }
  }

  if (loading && allResponses.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
      </div>
    )
  }

  if (!student) {
    return (
      <div>
        <Link
          to="/professor/relatorios/alunos"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6"
        >
          <ArrowLeft size={16} />
          Voltar para alunos
        </Link>
        <Card>
          <p className="text-slate-400 text-center py-8">Aluno não encontrado ou sem respostas.</p>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <Link
        to="/professor/relatorios/alunos"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft size={16} />
        Voltar para alunos
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{student.student_name}</h1>
          <p className="text-slate-400 mt-1">{student.student_email}</p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Badge variant="default">{responses.length} formulário(s) respondido(s)</Badge>
            {avgTct != null && (
              <Badge variant="info">Média TCT: {formatScore(avgTct)}</Badge>
            )}
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setReportPickerOpen(true)}>
          <FileBarChart size={16} />
          Relatório geral do aluno
        </Button>
      </div>

      {responses.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2 mb-8">
          <Card className="!p-5">
            <HorizontalBarChart
              title="Desempenho por formulário"
              subtitle="TCT em cada avaliação respondida"
              items={formChartItems}
            />
          </Card>
          <Card className="!p-5">
            <DonutChart
              title="Habilidades BNCC"
              centerLabel={String(bnccSkills.length)}
              centerSubLabel="Competências"
              segments={[
                {
                  label: 'Adequadas',
                  value: bnccSkills.filter((s) => s.percentage >= 60).length,
                  color: CHART_COLORS.avancado,
                },
                {
                  label: 'Com déficit',
                  value: deficitSkills.length,
                  color: CHART_COLORS.atencao,
                },
              ]}
            />
          </Card>
          {bloomSkills.length > 0 && (
            <Card className="!p-5 lg:col-span-2">
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
          )}
          {deficitSaeb.length > 0 && (
            <Card className="!p-5 lg:col-span-2 border-amber-500/20">
              <HorizontalBarChart
                title="Descritores SAEB com déficit"
                items={deficitSaeb.map((s) => ({
                  label: s.label,
                  value: s.percentage,
                  isCritical: true,
                }))}
              />
            </Card>
          )}
          {deficitSkills.length > 0 && (
            <Card className="!p-5 lg:col-span-2 border-red-500/20">
              <HorizontalBarChart
                title="Habilidades com déficit"
                items={deficitSkills.map((s) => ({
                  label: s.label,
                  value: s.percentage,
                  isCritical: true,
                }))}
              />
            </Card>
          )}
        </div>
      )}

      <h2 className="text-lg font-semibold text-white mb-1">Formulários respondidos</h2>
      <p className="text-sm text-slate-400 mb-4">
        A trilha de recomposição é a principal orientação pedagógica para cada avaliação.
      </p>

      <div className="space-y-4">
        {responses.map((r) => {
          const formTrail = r.trail_assignment?.form_trail
          const trail = formTrail?.learning_trail ?? null
          const trailLabel =
            formTrail?.min_percent != null && formTrail?.max_percent != null
              ? formatPercentRange(formTrail.min_percent, formTrail.max_percent)
              : null
          return (
            <StudentAnsweredFormCard
              key={r.id}
              formTitle={r.form?.title || 'Formulário'}
              completedAt={r.completed_at}
              percentualAcerto={r.percentual_acerto ?? null}
              nivelProficiencia={r.nivel_proficiencia ?? null}
              correctAnswers={r.correct_answers ?? null}
              totalQuestions={r.total_questions ?? null}
              trail={trail}
              percentRange={trailLabel}
              onReport={
                r.form_id
                  ? () => void openFormReport(r.form_id)
                  : undefined
              }
            />
          )
        })}
      </div>

      <StudentReportPickerModal
        open={reportPickerOpen}
        onClose={() => setReportPickerOpen(false)}
        onGenerate={openGeneralReport}
        generating={reportLoading}
        studentName={student.student_name}
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
