import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Award,
  ChevronRight,
  ClipboardList,
  FilterX,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { DatePicker } from '@/components/ui/DatePicker'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Pagination, paginateSlice } from '@/components/ui/Pagination'
import { formatDate, formatScore } from '@/lib/utils'
import { PERFORMANCE_STATUS_LABELS,
  getInitials,
  getPerformanceStatus,
  groupResponsesByStudent,
  studentDetailPath,
  type PerformanceStatus,
  type StudentSummary,
} from '@/hooks/useScopedResponses'
import { useReportDataContext } from '@/contexts/ReportDataContext'
import { CHART_COLORS, DonutChart, VerticalBarChart } from '@/components/reports/ReportCharts'
import { buildTctBuckets, uniqueForms } from '@/lib/reportAnalytics'
import type { FormResponse } from '@/types/database'

const PAGE_SIZE = 12

type ResponseRow = FormResponse & {
  form?: { title: string; turma?: string | null } | null
}

const STATUS_BADGE: Record<PerformanceStatus, 'success' | 'info' | 'warning' | 'danger'> = {
  excelente: 'success',
  bom: 'success',
  regular: 'warning',
  atencao: 'danger',
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-primary-500/15 text-primary-300 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
        </div>
      </div>
    </Card>
  )
}

function StudentCard({ student }: { student: StudentSummary }) {
  const status = getPerformanceStatus(student.avgTct)
  const displayScore = student.avgTct ?? student.bestTct

  return (
    <Link
      to={studentDetailPath(student.student_email)}
      className="group block rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-primary-500/40 hover:bg-white/[0.04] transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-11 h-11 rounded-full bg-primary-500/20 text-primary-200 flex items-center justify-center text-sm font-bold shrink-0">
            {getInitials(student.student_name)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white truncate group-hover:text-primary-300 transition-colors">
              {student.student_name}
            </p>
            <p className="text-xs text-slate-500 truncate mt-0.5">{student.student_email}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          {displayScore != null ? (
            <p className="text-xl font-bold text-white">{formatScore(displayScore)}</p>
          ) : (
            <p className="text-xl font-bold text-slate-500">—</p>
          )}
          <Badge variant={STATUS_BADGE[status]} className="mt-1">
            {PERFORMANCE_STATUS_LABELS[status]}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <Badge variant="default">
          {student.responseCount} formulário{student.responseCount !== 1 ? 's' : ''}
        </Badge>
        {student.turma && <Badge variant="info">{student.turma}</Badge>}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
        <p className="text-xs text-slate-500">
          Última resposta: {formatDate(student.lastCompletedAt)}
        </p>
        <ChevronRight
          size={18}
          className="text-slate-600 group-hover:text-primary-400 transition-colors"
        />
      </div>
    </Link>
  )
}

export function ResponsesPage() {
  const { responses, loading } = useReportDataContext()

  const [search, setSearch] = useState('')
  const [formFilter, setFormFilter] = useState('')
  const [municipioFilter, setMunicipioFilter] = useState('')
  const [escolaFilter, setEscolaFilter] = useState('')
  const [turmaFilter, setTurmaFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const allResponses = responses as ResponseRow[]

  const forms = useMemo(() => uniqueForms(allResponses), [allResponses])

  const municipios = useMemo(() => {
    const set = new Set<string>()
    for (const r of allResponses) {
      const m = r.municipio?.trim()
      if (m) set.add(m)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [allResponses])

  const escolas = useMemo(() => {
    const set = new Set<string>()
    for (const r of allResponses) {
      if (municipioFilter && (r.municipio?.trim() || '') !== municipioFilter) continue
      const s = r.school_name?.trim()
      if (s) set.add(s)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [allResponses, municipioFilter])

  const turmas = useMemo(() => {
    const set = new Set<string>()
    for (const r of allResponses) {
      if (municipioFilter && (r.municipio?.trim() || '') !== municipioFilter) continue
      if (escolaFilter && (r.school_name?.trim() || '') !== escolaFilter) continue
      const t = r.turma?.trim()
      if (t) set.add(t)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [allResponses, municipioFilter, escolaFilter])

  // Respostas dentro do recorte de localização/formulário/período (nível de resposta).
  const scopedResponses = useMemo(() => {
    return allResponses.filter((r) => {
      if (formFilter && r.form_id !== formFilter) return false
      if (municipioFilter && (r.municipio?.trim() || '') !== municipioFilter) return false
      if (escolaFilter && (r.school_name?.trim() || '') !== escolaFilter) return false
      if (turmaFilter && (r.turma?.trim() || '') !== turmaFilter) return false
      const date = new Date(r.completed_at)
      if (dateFrom && date < new Date(`${dateFrom}T00:00:00`)) return false
      if (dateTo && date > new Date(`${dateTo}T23:59:59`)) return false
      return true
    })
  }, [allResponses, formFilter, municipioFilter, escolaFilter, turmaFilter, dateFrom, dateTo])

  const students = useMemo(() => groupResponsesByStudent(scopedResponses), [scopedResponses])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    return students.filter((s) => {
      if (q) {
        const haystack = `${s.student_name} ${s.student_email} ${s.turma ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (statusFilter && getPerformanceStatus(s.avgTct) !== statusFilter) return false
      return true
    })
  }, [students, search, statusFilter])

  const handleMunicipioChange = (value: string) => {
    setMunicipioFilter(value)
    setEscolaFilter('')
    setTurmaFilter('')
    setPage(1)
  }

  const handleEscolaChange = (value: string) => {
    setEscolaFilter(value)
    setTurmaFilter('')
    setPage(1)
  }

  const chartData = useMemo(() => {
    const emails = new Set(filtered.map((s) => s.student_email))
    const scoped = scopedResponses.filter((r) => emails.has(r.student_email))
    const statusCounts = { excelente: 0, bom: 0, regular: 0, atencao: 0 }
    for (const s of filtered) {
      statusCounts[getPerformanceStatus(s.avgTct)]++
    }
    return { scoped, statusCounts, tctBuckets: buildTctBuckets(scoped) }
  }, [filtered, scopedResponses])

  const stats = useMemo(() => {
    const emails = new Set(filtered.map((s) => s.student_email))
    const scoped = scopedResponses.filter((r) => emails.has(r.student_email))

    const tctValues = scoped
      .map((r) => r.percentual_acerto)
      .filter((v): v is number => v != null)

    const avg =
      tctValues.length > 0
        ? tctValues.reduce((a, b) => a + b, 0) / tctValues.length
        : null

    const maxTct = tctValues.length > 0 ? Math.max(...tctValues) : null
    const atMax =
      maxTct != null
        ? filtered.filter((s) => s.bestTct != null && Math.abs(s.bestTct - maxTct) < 0.05).length
        : 0

    return {
      totalStudents: filtered.length,
      totalResponses: scopedResponses.length,
      avgTct: avg,
      maxTct,
      atMax,
    }
  }, [responses, filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStudents = useMemo(
    () => paginateSlice(filtered, currentPage, PAGE_SIZE),
    [filtered, currentPage],
  )

  const clearFilters = () => {
    setSearch('')
    setFormFilter('')
    setMunicipioFilter('')
    setEscolaFilter('')
    setTurmaFilter('')
    setStatusFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const hasFilters =
    search ||
    formFilter ||
    municipioFilter ||
    escolaFilter ||
    turmaFilter ||
    statusFilter ||
    dateFrom ||
    dateTo

  if (loading && responses.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
      </div>
    )
  }

  if (responses.length === 0) {
    return (
      <Card>
        <p className="text-slate-400 text-center py-8">Nenhuma resposta recebida ainda.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card className="p-4 sm:p-5 overflow-visible">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="relative sm:col-span-2 xl:col-span-2">
            <Search
              size={16}
              className="absolute left-3 top-[2.125rem] text-slate-500 pointer-events-none z-10"
            />
            <Input
              label="Buscar"
              size="sm"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Nome, e-mail ou turma..."
              className="pl-9"
            />
          </div>
          <Select
            label="Formulário"
            size="sm"
            value={formFilter}
            onChange={(e) => {
              setFormFilter(e.target.value)
              setPage(1)
            }}
            options={[
              { value: '', label: 'Todos' },
              ...forms.map((f) => ({ value: f.id, label: f.title })),
            ]}
            className="min-w-[140px]"
          />
          {municipios.length > 0 && (
            <Select
              label="Município"
              size="sm"
              value={municipioFilter}
              onChange={(e) => handleMunicipioChange(e.target.value)}
              options={[
                { value: '', label: 'Todos' },
                ...municipios.map((m) => ({ value: m, label: m })),
              ]}
              className="min-w-[140px]"
            />
          )}
          <Select
            label="Escola"
            size="sm"
            value={escolaFilter}
            onChange={(e) => handleEscolaChange(e.target.value)}
            options={[
              { value: '', label: municipioFilter ? 'Todas do município' : 'Todas' },
              ...escolas.map((s) => ({ value: s, label: s })),
            ]}
            className="min-w-[140px]"
          />
          <Select
            label="Turma"
            size="sm"
            value={turmaFilter}
            onChange={(e) => {
              setTurmaFilter(e.target.value)
              setPage(1)
            }}
            options={[
              {
                value: '',
                label: escolaFilter ? 'Todas da escola' : 'Todas',
              },
              ...turmas.map((t) => ({ value: t, label: t })),
            ]}
            className="min-w-[140px]"
          />
          <Select
            label="Status"
            size="sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            options={[
              { value: '', label: 'Todos' },
              { value: 'excelente', label: 'Excelente' },
              { value: 'bom', label: 'Bom' },
              { value: 'regular', label: 'Regular' },
              { value: 'atencao', label: 'Atenção' },
            ]}
            className="min-w-[140px]"
          />
          <DatePicker
            label="Período (de)"
            size="sm"
            value={dateFrom}
            onChange={(v) => {
              setDateFrom(v)
              setPage(1)
            }}
          />
          <DatePicker
            label="Período (até)"
            size="sm"
            value={dateTo}
            onChange={(v) => {
              setDateTo(v)
              setPage(1)
            }}
          />
        </div>
        {hasFilters && (
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <FilterX size={16} />
              Limpar filtros
            </Button>
          </div>
        )}
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Users size={20} />}
          label="Total de alunos"
          value={String(stats.totalStudents)}
          hint="Alunos únicos"
        />
        <StatCard
          icon={<ClipboardList size={20} />}
          label="Formulários respondidos"
          value={String(stats.totalResponses)}
          hint={`${students.length > 0 ? Math.round((stats.totalResponses / students.length) * 10) / 10 : 0} por aluno em média`}
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Média geral de desempenho"
          value={stats.avgTct != null ? formatScore(stats.avgTct) : '—'}
          hint="TCT médio geral"
        />
        <StatCard
          icon={<Award size={20} />}
          label="Desempenho máximo"
          value={stats.maxTct != null ? formatScore(stats.maxTct) : '—'}
          hint={stats.atMax > 0 ? `${stats.atMax} aluno${stats.atMax !== 1 ? 's' : ''}` : undefined}
        />
      </div>

      {filtered.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="!p-5">
            <DonutChart
              title="Distribuição por status"
              subtitle="Classificação de desempenho dos alunos filtrados"
              centerLabel={String(filtered.length)}
              centerSubLabel="Alunos"
              segments={(
                ['excelente', 'bom', 'regular', 'atencao'] as PerformanceStatus[]
              )
                .filter((k) => chartData.statusCounts[k] > 0)
                .map((k) => ({
                  label: PERFORMANCE_STATUS_LABELS[k],
                  value: chartData.statusCounts[k],
                  color: CHART_COLORS[k],
                }))}
            />
          </Card>
          <Card className="!p-5">
            <VerticalBarChart
              title="Faixas de desempenho (TCT)"
              subtitle="Quantidade de respostas por faixa de acerto"
              items={chartData.tctBuckets.map((b) => ({
                label: b.label,
                value: b.count,
                color: CHART_COLORS.primary,
              }))}
            />
          </Card>
        </div>
      )}

      {/* Grid de alunos */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Alunos ({filtered.length})
          </h2>
        </div>

        {filtered.length === 0 ? (
          <Card>
            <p className="text-slate-400 text-center py-8">
              Nenhum aluno encontrado com os filtros selecionados.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pageStudents.map((s) => (
              <StudentCard key={s.student_email} student={s} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination
            page={currentPage}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  )
}
