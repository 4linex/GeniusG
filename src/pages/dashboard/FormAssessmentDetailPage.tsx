import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SkillBreakdownList } from '@/components/dashboard/SkillBreakdownList'
import { ProficiencyLevelChartCard } from '@/components/dashboard/ProficiencyLevelChart'
import {
  loadFormAssessmentDetail,
  type FormAssessmentSummary,
  type FormStudentRow,
  type SkillBreakdownRow,
} from '@/lib/formAssessmentReport'
import { resolveScopedFormIds, canAccessForm } from '@/lib/scopedForms'
import { formatDate, formatScore } from '@/lib/utils'
import { NIVEL_PROFICIENCIA_LABELS } from '@/lib/scoring'

export function FormAssessmentDetailPage() {
  const { formId } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<FormAssessmentSummary | null>(null)
  const [students, setStudents] = useState<FormStudentRow[]>([])
  const [bnccSkills, setBnccSkills] = useState<SkillBreakdownRow[]>([])
  const [saebSkills, setSaebSkills] = useState<SkillBreakdownRow[]>([])
  const [bloomSkills, setBloomSkills] = useState<SkillBreakdownRow[]>([])
  const [skillsView, setSkillsView] = useState<'bncc' | 'saeb' | 'bloom'>('bncc')
  const [denied, setDenied] = useState(false)

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
        setSaebSkills(data.saebSkills)
        setBloomSkills(data.bloomSkills)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [formId, user?.id, profile?.role])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
      </div>
    )
  }

  if (denied || !summary) {
    return (
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6"
        >
          <ArrowLeft size={16} />
          Voltar ao dashboard
        </Link>
        <Card>
          <p className="text-slate-400 text-center py-8">
            Avaliação não encontrada ou sem permissão de acesso.
          </p>
        </Card>
      </div>
    )
  }

  const skills =
    skillsView === 'bncc' ? bnccSkills : skillsView === 'saeb' ? saebSkills : bloomSkills

  return (
    <div>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft size={16} />
        Voltar ao dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{summary.title}</h1>
        {summary.turma && (
          <p className="text-slate-400 mt-1">Turma: {summary.turma}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="!p-5">
          <p className="text-sm text-slate-400">Respostas</p>
          <p className="text-3xl font-bold text-white mt-1">{summary.totalResponses}</p>
        </Card>
        <Card className="!p-5">
          <p className="text-sm text-slate-400">Média TCT</p>
          <p className="text-3xl font-bold text-white mt-1">
            {summary.totalResponses > 0 ? formatScore(summary.averageTct) : '—'}
          </p>
        </Card>
      </div>

      <Card className="mb-8 !p-5">
        <ProficiencyLevelChartCard
          byNivel={summary.byNivel}
          totalResponses={summary.totalResponses}
        />
      </Card>

      <Card className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Alunos</h2>
        {students.length === 0 ? (
          <p className="text-slate-400 text-center py-8 text-sm">
            Nenhum aluno respondeu esta avaliação ainda.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="text-left py-3 px-4 font-medium">Aluno</th>
                  <th className="text-left py-3 px-4 font-medium">Acertos</th>
                  <th className="text-left py-3 px-4 font-medium">TCT</th>
                  <th className="text-left py-3 px-4 font-medium">Nível</th>
                  <th className="text-left py-3 px-4 font-medium">Data</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-white/5 hover:bg-white/[0.04] cursor-pointer transition-colors"
                    onClick={() => navigate(`/dashboard/avaliacoes/${formId}/resposta/${s.id}`)}
                  >
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-white">{s.student_name}</p>
                      <p className="text-xs text-slate-500">{s.student_email}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {s.correct_answers ?? '—'}/{s.total_questions ?? '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {s.percentual_acerto != null ? formatScore(s.percentual_acerto) : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {s.nivel_proficiencia ? (
                        <Badge
                          variant={
                            s.nivel_proficiencia === 'avancado'
                              ? 'success'
                              : s.nivel_proficiencia === 'intermediario'
                                ? 'info'
                                : 'warning'
                          }
                        >
                          {NIVEL_PROFICIENCIA_LABELS[s.nivel_proficiencia]}
                        </Badge>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
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

      <div>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-white">Desempenho por competência</h2>
          <div className="flex gap-2">
            {(['bncc', 'saeb', 'bloom'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setSkillsView(v)}
                className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                  skillsView === v
                    ? 'bg-primary-500/20 text-primary-300'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {v === 'bncc' ? 'Habilidade BNCC' : v === 'saeb' ? 'Descritor SAEB' : 'Nível Bloom'}
              </button>
            ))}
          </div>
        </div>
        <SkillBreakdownList skills={skills} />
      </div>
    </div>
  )
}
