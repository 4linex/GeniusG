import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Building2, FileBarChart, GraduationCap, MapPin, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { Select } from '@/components/ui/Select'
import { getEscolasForMunicipio } from '@/lib/schools'
import {
  getTurmasForScope,
  isRootRole,
  isScopedAdminRole,
  type DashboardFilterOptions,
} from '@/lib/dashboardScope'
import type { ReportFilters, ReportScopeType } from '@/lib/reportAnalytics'
import type { Profile } from '@/types/database'

export type DashboardReportPickerType = 'all' | 'municipio' | 'escola' | 'turma'

interface DashboardReportPickerModalProps {
  open: boolean
  onClose: () => void
  onGenerate: (scope: ReportFilters) => void
  generating?: boolean
  filterOptions: DashboardFilterOptions
  contextFilters: Pick<ReportFilters, 'municipio' | 'school_name' | 'turma' | 'dateFrom' | 'dateTo'>
  profile?: Pick<Profile, 'role' | 'municipio' | 'school_name'> | null
}

const REPORT_TYPES: {
  id: DashboardReportPickerType
  label: string
  description: string
  icon: typeof FileBarChart
}[] = [
  {
    id: 'all',
    label: 'Visão geral',
    description: 'Todos os dados consolidados do recorte atual',
    icon: FileBarChart,
  },
  {
    id: 'municipio',
    label: 'Município',
    description: 'Desempenho geral das escolas do município',
    icon: MapPin,
  },
  {
    id: 'escola',
    label: 'Escola',
    description: 'Desempenho das turmas, trilhas e TRI da escola',
    icon: Building2,
  },
  {
    id: 'turma',
    label: 'Turma',
    description: 'Média da turma, alunos em trilhas e habilidades prioritárias',
    icon: GraduationCap,
  },
]

function toOptions(values: string[], allLabel: string) {
  return [{ value: '', label: allLabel }, ...values.map((v) => ({ value: v, label: v }))]
}

export function DashboardReportPickerModal({
  open,
  onClose,
  onGenerate,
  generating,
  filterOptions,
  contextFilters,
  profile,
}: DashboardReportPickerModalProps) {
  const [reportType, setReportType] = useState<DashboardReportPickerType>('all')
  const [municipio, setMunicipio] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [turma, setTurma] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const isRoot = isRootRole(profile?.role)
  const isAdmin = isScopedAdminRole(profile?.role)

  const availableTypes = useMemo(() => {
    if (isRoot) return REPORT_TYPES
    if (isAdmin) return REPORT_TYPES.filter((t) => t.id !== 'municipio' || Boolean(profile?.municipio))
    return REPORT_TYPES.filter((t) => t.id === 'escola' || t.id === 'turma')
  }, [isRoot, isAdmin, profile?.municipio])

  useEffect(() => {
    if (!open) return
    setReportType(
      contextFilters.turma
        ? 'turma'
        : contextFilters.school_name
          ? 'escola'
          : contextFilters.municipio
            ? 'municipio'
            : 'all',
    )
    setMunicipio(contextFilters.municipio ?? profile?.municipio ?? '')
    setSchoolName(contextFilters.school_name ?? profile?.school_name ?? '')
    setTurma(contextFilters.turma ?? '')
    setDateFrom(contextFilters.dateFrom ?? '')
    setDateTo(contextFilters.dateTo ?? '')
  }, [open, contextFilters, profile])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const escolaOptions = useMemo(
    () => getEscolasForMunicipio(filterOptions.schools, municipio || undefined),
    [filterOptions.schools, municipio],
  )

  const turmaOptions = useMemo(
    () =>
      getTurmasForScope(filterOptions, municipio || undefined, schoolName || undefined),
    [filterOptions, municipio, schoolName],
  )

  const handleTypeChange = (type: DashboardReportPickerType) => {
    setReportType(type)
    if (type === 'all') {
      setMunicipio('')
      setSchoolName('')
      setTurma('')
    } else if (type === 'municipio') {
      setSchoolName('')
      setTurma('')
      if (!municipio && filterOptions.municipios.length === 1) {
        setMunicipio(filterOptions.municipios[0])
      }
    } else if (type === 'escola') {
      setTurma('')
      if (!municipio && profile?.municipio) setMunicipio(profile.municipio)
      if (!schoolName && profile?.school_name) setSchoolName(profile.school_name)
    } else if (type === 'turma') {
      if (!municipio && profile?.municipio) setMunicipio(profile.municipio)
      if (!schoolName && profile?.school_name) setSchoolName(profile.school_name)
    }
  }

  const canGenerate = () => {
    if (reportType === 'municipio' && !municipio && !profile?.municipio) return false
    if (reportType === 'escola' && !schoolName) return false
    if (reportType === 'turma' && !turma) return false
    return true
  }

  const handleGenerate = () => {
    const scopeType: ReportScopeType = reportType
    onGenerate({
      scopeType,
      municipio: municipio || profile?.municipio || undefined,
      school_name: schoolName || profile?.school_name || undefined,
      turma: reportType === 'turma' ? turma || undefined : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
  }

  if (!open) return null

  const showMunicipio = reportType === 'municipio' || reportType === 'escola' || reportType === 'turma'
  const showEscola = reportType === 'escola' || reportType === 'turma'
  const showTurma = reportType === 'turma'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="relative flex w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Gerar relatório</h2>
            <p className="text-sm text-slate-400">Escolha o tipo e o período dos dados</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 overflow-auto p-5">
          <div className="grid grid-cols-2 gap-2">
            {availableTypes.map((type) => {
              const Icon = type.icon
              const active = reportType === type.id
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleTypeChange(type.id)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    active
                      ? 'border-primary-500/50 bg-primary-500/10'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <Icon size={18} className={active ? 'text-primary-400' : 'text-slate-500'} />
                  <p className={`mt-2 text-sm font-semibold ${active ? 'text-white' : 'text-slate-300'}`}>
                    {type.label}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{type.description}</p>
                </button>
              )
            })}
          </div>

          {(showMunicipio || showEscola || showTurma) && (
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recorte</p>
              {showMunicipio && (
                <Select
                  label="Município"
                  size="sm"
                  value={municipio}
                  onChange={(e) => {
                    setMunicipio(e.target.value)
                    setSchoolName('')
                    setTurma('')
                  }}
                  disabled={isAdmin && Boolean(profile?.municipio) && reportType === 'municipio'}
                  options={toOptions(
                    filterOptions.municipios,
                    'Selecione o município',
                  )}
                />
              )}
              {showEscola && (
                <Select
                  label="Escola"
                  size="sm"
                  value={schoolName}
                  onChange={(e) => {
                    setSchoolName(e.target.value)
                    setTurma('')
                  }}
                  disabled={isAdmin && Boolean(profile?.school_name) && reportType === 'turma'}
                  options={toOptions(
                    escolaOptions.length > 0 ? escolaOptions : filterOptions.escolas,
                    municipio ? 'Selecione a escola' : 'Selecione a escola',
                  )}
                />
              )}
              {showTurma && (
                <Select
                  label="Turma"
                  size="sm"
                  value={turma}
                  onChange={(e) => setTurma(e.target.value)}
                  options={toOptions(turmaOptions, 'Selecione a turma')}
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <DatePicker
              label="Período (de)"
              size="sm"
              value={dateFrom}
              onChange={setDateFrom}
            />
            <DatePicker
              label="Período (até)"
              size="sm"
              value={dateTo}
              onChange={setDateTo}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleGenerate}
            loading={generating}
            disabled={!canGenerate()}
          >
            <FileBarChart size={16} />
            Gerar relatório
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
