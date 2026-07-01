import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { flattenNestedAnswers, type NestedResponseAnswer } from '@/lib/responseAnswers'
import { loadTriByFormChart, type TriFormChartRow } from '@/lib/formAssessmentReport'
import { loadTrailDistribution, type TrailDistributionRow } from '@/lib/trailDistribution'
import {
  applyDashboardContextFilters,
  applyDashboardDateFilters,
  applyProfessorProfileScope,
  applyProfileTurmaScope,
  applyProfileLocationScope,
  dashboardScopeCacheKey,
  getProfessorLinkIds,
  hasDashboardContextFilters,
  isRootRole,
  isScopedAdminRole,
  loadDashboardFilterOptions,
  profileLocationFilters,
  type DashboardContextFilters,
  type DashboardFilterOptions,
  EMPTY_DASHBOARD_CONTEXT_FILTERS,
} from '@/lib/dashboardScope'
import { resolveScopedFormIds } from '@/lib/scopedForms'
import { getPerformanceStatus } from '@/hooks/useScopedResponses'
import { buildTctBuckets, EMPTY_SKILL_LABELS } from '@/lib/reportAnalytics'
import type { FormStatus, NivelProficiencia, Profile } from '@/types/database'

export interface DashboardStats {
  avaliacoesAplicadas: number
  avaliacoesMesAtual: number
  alunosAvaliados: number
  alunosMesAtual: number
  habilidadesCriticas: number
  mediaTurma: number
  mediaMesAnterior: number
  totalRespostas: number
  formulariosComRespostas: number
}

export interface DashboardSkillRow {
  label: string
  percentage: number
  total: number
  correct: number
}

export interface DashboardCharts {
  byNivel: Record<NivelProficiencia, number>
  statusCounts: Record<'excelente' | 'bom' | 'regular' | 'atencao', number>
  tctBuckets: { label: string; count: number }[]
  criticalBnccSkills: DashboardSkillRow[]
  criticalSaebSkills: DashboardSkillRow[]
  bloomSkills: DashboardSkillRow[]
  formTctBars: { formId: string; title: string; averageTct: number; totalResponses: number }[]
}

export interface DashboardEvaluation {
  id: string
  title: string
  created_at: string
  expected_students: number | null
  status: FormStatus
  total_responses: number
  average_tct: number | null
  average_theta: number | null
  last_response_at: string | null
}

const emptyStats: DashboardStats = {
  avaliacoesAplicadas: 0,
  avaliacoesMesAtual: 0,
  alunosAvaliados: 0,
  alunosMesAtual: 0,
  habilidadesCriticas: 0,
  mediaTurma: 0,
  mediaMesAnterior: 0,
  totalRespostas: 0,
  formulariosComRespostas: 0,
}

const emptyCharts: DashboardCharts = {
  byNivel: { inicial: 0, intermediario: 0, avancado: 0 },
  statusCounts: { excelente: 0, bom: 0, regular: 0, atencao: 0 },
  tctBuckets: [],
  criticalBnccSkills: [],
  criticalSaebSkills: [],
  bloomSkills: [],
  formTctBars: [],
}

interface DashboardSnapshot {
  stats: DashboardStats
  charts: DashboardCharts
  evaluations: DashboardEvaluation[]
  triByForm: TriFormChartRow[]
  trailDistribution: TrailDistributionRow[]
}

const dashboardCache = new Map<string, DashboardSnapshot>()

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function isInCurrentMonth(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

function isInPreviousMonth(iso: string) {
  const d = new Date(iso)
  const prev = startOfMonth(new Date())
  prev.setMonth(prev.getMonth() - 1)
  return d.getMonth() === prev.getMonth() && d.getFullYear() === prev.getFullYear()
}

export function useDashboardData(
  userId: string | undefined,
  role: Profile['role'] | undefined,
  profile?: Pick<Profile, 'municipio' | 'school_name' | 'turmas'> | null,
  contextFilters: DashboardContextFilters = EMPTY_DASHBOARD_CONTEXT_FILTERS,
) {
  const cacheKey =
    userId && role
      ? `${dashboardScopeCacheKey(userId, role, contextFilters, profile)}:trail-v3`
      : null
  const cached = cacheKey ? dashboardCache.get(cacheKey) : undefined

  const [stats, setStats] = useState<DashboardStats>(cached?.stats ?? emptyStats)
  const [charts, setCharts] = useState<DashboardCharts>(cached?.charts ?? emptyCharts)
  const [evaluations, setEvaluations] = useState<DashboardEvaluation[]>(cached?.evaluations ?? [])
  const [triByForm, setTriByForm] = useState<TriFormChartRow[]>(cached?.triByForm ?? [])
  const [trailDistribution, setTrailDistribution] = useState<TrailDistributionRow[]>(
    cached?.trailDistribution ?? [],
  )
  const [filterOptions, setFilterOptions] = useState<DashboardFilterOptions>({
    municipios: [],
    escolas: [],
    turmas: [],
    schools: [],
    schoolClasses: [],
  })
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false)
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState<string | null>(null)

  const applySnapshot = useCallback((snapshot: DashboardSnapshot) => {
    setStats(snapshot.stats)
    setCharts(snapshot.charts)
    setEvaluations(snapshot.evaluations)
    setTriByForm(snapshot.triByForm)
    setTrailDistribution(snapshot.trailDistribution)
  }, [])

  const fetchData = useCallback(async () => {
    if (!userId || !role) return

    const key = `${dashboardScopeCacheKey(userId, role, contextFilters, profile)}:trail-v3`
    const hadData = dashboardCache.has(key)
    if (!hadData) setLoading(true)
    setError(null)

    try {
      if (isRootRole(role) || isScopedAdminRole(role) || role === 'professor') {
        setFilterOptionsLoading(true)
        loadDashboardFilterOptions(profile ? { ...profile, role } : undefined)
          .then(setFilterOptions)
          .finally(() => setFilterOptionsLoading(false))
      }

      let professorLinkIds: string[] | null = null

      if (role === 'professor') {
        professorLinkIds = await getProfessorLinkIds(userId, profile)
        if (professorLinkIds.length === 0) {
          const empty: DashboardSnapshot = {
            stats: emptyStats,
            charts: emptyCharts,
            evaluations: [],
            triByForm: [],
            trailDistribution: [],
          }
          dashboardCache.set(key, empty)
          applySnapshot(empty)
          setLoading(false)
          return
        }
      }

      const scopedFormIds = await resolveScopedFormIds(userId, role)

      if (scopedFormIds !== null && scopedFormIds.length === 0) {
        const empty: DashboardSnapshot = {
          stats: emptyStats,
          charts: emptyCharts,
          evaluations: [],
          triByForm: [],
          trailDistribution: [],
        }
        dashboardCache.set(key, empty)
        applySnapshot(empty)
        setLoading(false)
        return
      }

      let formsQuery = supabase
        .from('forms')
        .select('id, title, created_at, status, expected_students')
        .order('created_at', { ascending: false })

      if (scopedFormIds) formsQuery = formsQuery.in('id', scopedFormIds)

      let linksQuery = supabase
        .from('form_links')
        .select('id, form_id, created_at, municipio, school_name, turma, professor_id')

      if (scopedFormIds) linksQuery = linksQuery.in('form_id', scopedFormIds)
      else if (role === 'professor') linksQuery = linksQuery.eq('professor_id', userId)

      if (professorLinkIds) linksQuery = linksQuery.in('id', professorLinkIds)

      let responsesQuery = supabase
        .from('form_responses')
        .select(
          `id, form_id, form_link_id, student_email, student_name, percentual_acerto, theta, nivel_proficiencia, correct_answers, total_questions, completed_at, municipio, school_name, turma,
          response_answers(is_correct, question:questions(habilidade_bncc, descritor_saeb, nivel_bloom, point_value, nivel_dificuldade))`,
        )

      if (professorLinkIds) {
        responsesQuery = responsesQuery.in('form_link_id', professorLinkIds)
      }

      if (isRootRole(role)) {
        if (contextFilters.municipio) {
          responsesQuery = responsesQuery.eq('municipio', contextFilters.municipio)
        }
        if (contextFilters.school_name) {
          responsesQuery = responsesQuery.eq('school_name', contextFilters.school_name)
        }
        if (contextFilters.turma) {
          responsesQuery = responsesQuery.eq('turma', contextFilters.turma)
        }
      } else if (isScopedAdminRole(role)) {
        const location = profileLocationFilters(profile)
        if (location.municipio) {
          responsesQuery = responsesQuery.eq('municipio', location.municipio)
        }
        if (location.school_name) {
          responsesQuery = responsesQuery.eq('school_name', location.school_name)
        }
        if (contextFilters.turma) {
          responsesQuery = responsesQuery.eq('turma', contextFilters.turma)
        }
      }

      const [{ data: forms, error: formsError }, { data: links }] = await Promise.all([
        formsQuery,
        linksQuery,
      ])
      if (formsError) throw formsError

      const formIds = (forms || []).map((f) => f.id)

      if (!professorLinkIds) {
        if (scopedFormIds && formIds.length > 0) {
          responsesQuery = responsesQuery.in('form_id', formIds)
        } else if (scopedFormIds) {
          responsesQuery = responsesQuery.in('form_id', ['00000000-0000-0000-0000-000000000000'])
        }
      } else if (formIds.length > 0) {
        responsesQuery = responsesQuery.in('form_id', formIds)
      }

      const { data: responses, error: responsesError } = await responsesQuery
      if (responsesError) throw responsesError

      let responseList = responses || []
      let linkList = links || []

      if (role === 'professor') {
        responseList = applyProfessorProfileScope(responseList, profile)
        linkList = applyProfessorProfileScope(linkList, profile)
        responseList = applyProfileTurmaScope(responseList, profile?.turmas)
        linkList = applyProfileTurmaScope(linkList, profile?.turmas)
        responseList = applyDashboardContextFilters(responseList, contextFilters)
        linkList = applyDashboardContextFilters(linkList, contextFilters)
      } else if (isScopedAdminRole(role)) {
        responseList = applyProfileLocationScope(responseList, profile)
        linkList = applyProfileLocationScope(linkList, profile)
        responseList = applyDashboardContextFilters(responseList, contextFilters)
        linkList = applyDashboardContextFilters(linkList, contextFilters)
      } else if (isRootRole(role)) {
        linkList = applyDashboardContextFilters(linkList, contextFilters)
        responseList = applyDashboardContextFilters(responseList, contextFilters)
      }

      responseList = applyDashboardDateFilters(responseList, contextFilters)

      const scopedFormIdSet = new Set(responseList.map((r) => r.form_id))
      const visibleForms = (forms || []).filter((f) => scopedFormIdSet.has(f.id))

      const avaliacoesAplicadas = linkList.length
      const avaliacoesMesAtual = linkList.filter((l) => isInCurrentMonth(l.created_at)).length

      const uniqueStudents = new Set(responseList.map((r) => r.student_email))
      const alunosAvaliados = uniqueStudents.size
      const alunosMesAtual = new Set(
        responseList.filter((r) => isInCurrentMonth(r.completed_at)).map((r) => r.student_email),
      ).size

      const scores = responseList
        .map((r) => r.percentual_acerto)
        .filter((s): s is number => s != null)
      const mediaTurma =
        scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : 0

      const prevScores = responseList
        .filter((r) => isInPreviousMonth(r.completed_at))
        .map((r) => r.percentual_acerto)
        .filter((s): s is number => s != null)
      const mediaMesAnterior =
        prevScores.length > 0
          ? Math.round((prevScores.reduce((a, b) => a + b, 0) / prevScores.length) * 10) / 10
          : 0

      let habilidadesCriticas = 0
      const byBncc = new Map<string, { total: number; correct: number }>()
      const bySaeb = new Map<string, { total: number; correct: number }>()
      const byBloom = new Map<string, { total: number; correct: number }>()
      const answerRows = flattenNestedAnswers(
        responseList as unknown as Array<{ id: string; response_answers?: NestedResponseAnswer[] | null }>,
      )

      if (answerRows.length > 0) {
        for (const a of answerRows) {
          if (a.habilidade_bncc !== EMPTY_SKILL_LABELS.bncc) {
            const hab = byBncc.get(a.habilidade_bncc) || { total: 0, correct: 0 }
            hab.total++
            if (a.is_correct) hab.correct++
            byBncc.set(a.habilidade_bncc, hab)
          }

          if (a.descritor_saeb !== EMPTY_SKILL_LABELS.saeb) {
            const saeb = bySaeb.get(a.descritor_saeb) || { total: 0, correct: 0 }
            saeb.total++
            if (a.is_correct) saeb.correct++
            bySaeb.set(a.descritor_saeb, saeb)
          }

          const bloomKey = a.bloom
          const bloom = byBloom.get(bloomKey) || { total: 0, correct: 0 }
          bloom.total++
          if (a.is_correct) bloom.correct++
          byBloom.set(bloomKey, bloom)
        }

        const criticalBncc = [...byBncc.values()].filter(
          (s) => s.total > 0 && (s.correct / s.total) * 100 < 60,
        ).length
        const criticalSaeb = [...bySaeb.values()].filter(
          (s) => s.total > 0 && (s.correct / s.total) * 100 < 60,
        ).length
        habilidadesCriticas = criticalBncc + criticalSaeb
      }

      const toSkillRows = (map: Map<string, { total: number; correct: number }>) =>
        Array.from(map.entries())
          .map(([label, s]) => ({
            label,
            total: s.total,
            correct: s.correct,
            percentage: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
          }))
          .sort((a, b) => a.percentage - b.percentage)

      const criticalBnccSkills = toSkillRows(byBncc)
        .filter((s) => s.percentage < 60)
        .slice(0, 6)
      const criticalSaebSkills = toSkillRows(bySaeb)
        .filter((s) => s.percentage < 60)
        .slice(0, 6)
      const bloomSkills = toSkillRows(byBloom).slice(0, 6)

      const byNivel: Record<NivelProficiencia, number> = {
        inicial: 0,
        intermediario: 0,
        avancado: 0,
      }
      const statusCounts = { excelente: 0, bom: 0, regular: 0, atencao: 0 }

      for (const r of responseList) {
        const n = r.nivel_proficiencia as NivelProficiencia | null
        if (n && n in byNivel) byNivel[n]++
        statusCounts[getPerformanceStatus(r.percentual_acerto)]++
      }

      const tctBuckets = buildTctBuckets(
        responseList.map((r) => ({
          ...r,
          form: null,
        })),
      )

      const formStats = new Map<
        string,
        { count: number; tct: number[]; theta: (number | null)[]; lastAt: string | null }
      >()
      for (const r of responseList) {
        const cur = formStats.get(r.form_id) || { count: 0, tct: [], theta: [], lastAt: null }
        cur.count++
        if (r.percentual_acerto != null) cur.tct.push(r.percentual_acerto)
        cur.theta.push(r.theta)
        if (!cur.lastAt || r.completed_at > cur.lastAt) cur.lastAt = r.completed_at
        formStats.set(r.form_id, cur)
      }

      const avg = (nums: number[]) =>
        nums.length > 0
          ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
          : null

      const avgTheta = (values: (number | null)[]) => {
        const nums = values.filter((v): v is number => v != null)
        if (nums.length === 0) return null
        return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100
      }

      const evalRows: DashboardEvaluation[] = visibleForms.map((f) => {
        const s = formStats.get(f.id)
        return {
          id: f.id,
          title: f.title,
          created_at: f.created_at,
          expected_students: f.expected_students,
          status: f.status as FormStatus,
          total_responses: s?.count || 0,
          average_tct: s ? avg(s.tct) : null,
          average_theta: s ? avgTheta(s.theta) : null,
          last_response_at: s?.lastAt ?? null,
        }
      })

      const latestEvaluations = evalRows
        .filter((e) => e.total_responses > 0)
        .sort((a, b) => {
          const da = a.last_response_at || a.created_at
          const db = b.last_response_at || b.created_at
          return db.localeCompare(da)
        })

      const formTctBars = latestEvaluations
        .filter((e) => e.average_tct != null)
        .map((e) => ({
          formId: e.id,
          title: e.title,
          averageTct: e.average_tct!,
          totalResponses: e.total_responses,
        }))
        .sort((a, b) => b.averageTct - a.averageTct)
        .slice(0, 8)

      const filteredFormIds = [...scopedFormIdSet]
      const [chartData, trailRows] = await Promise.all([
        loadTriByFormChart(
          isRootRole(role) && !hasDashboardContextFilters(contextFilters)
            ? null
            : filteredFormIds.length > 0
              ? filteredFormIds
              : ['00000000-0000-0000-0000-000000000000'],
        ),
        loadTrailDistribution(
          responseList.map((r) => ({
            id: r.id,
            student_email: r.student_email,
            form_id: r.form_id,
            percentual_acerto: r.percentual_acerto,
            correct_answers: r.correct_answers,
            total_questions: r.total_questions,
          })),
          { answers: answerRows },
        ),
      ])

      const snapshot: DashboardSnapshot = {
        stats: {
          avaliacoesAplicadas,
          avaliacoesMesAtual,
          alunosAvaliados,
          alunosMesAtual,
          habilidadesCriticas,
          mediaTurma,
          mediaMesAnterior,
          totalRespostas: responseList.length,
          formulariosComRespostas: evalRows.filter((e) => e.total_responses > 0).length,
        },
        charts: {
          byNivel,
          statusCounts,
          tctBuckets,
          criticalBnccSkills,
          criticalSaebSkills,
          bloomSkills,
          formTctBars,
        },
        evaluations: latestEvaluations.slice(0, 10),
        triByForm: chartData,
        trailDistribution: trailRows,
      }
      dashboardCache.set(key, snapshot)
      applySnapshot(snapshot)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard')
    } finally {
      setLoading(false)
    }
  }, [userId, role, profile, contextFilters, applySnapshot])

  useEffect(() => {
    if (!userId || !role) {
      setLoading(false)
      return
    }

    const key = `${dashboardScopeCacheKey(userId, role, contextFilters, profile)}:trail-v3`
    const hit = dashboardCache.get(key)
    if (hit) {
      applySnapshot(hit)
      setLoading(false)
      return
    }

    fetchData()
  }, [userId, role, profile, contextFilters, fetchData, applySnapshot])

  const updateFormStatus = useCallback(
    async (formId: string, status: FormStatus) => {
      const { error: updateError } = await supabase
        .from('forms')
        .update({ status })
        .eq('id', formId)

      if (updateError) throw updateError

      setEvaluations((prev) =>
        prev.map((e) => (e.id === formId ? { ...e, status } : e)),
      )
    },
    [],
  )

  return {
    stats,
    charts,
    evaluations,
    triByForm,
    trailDistribution,
    filterOptions,
    filterOptionsLoading,
    loading,
    error,
    refetch: fetchData,
    updateFormStatus,
  }
}
