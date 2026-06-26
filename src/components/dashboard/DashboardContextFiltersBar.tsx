import { useMemo } from 'react'
import { Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { DatePicker } from '@/components/ui/DatePicker'
import { getEscolasForMunicipio } from '@/lib/schools'
import type { DashboardContextFilters, DashboardFilterOptions } from '@/lib/dashboardScope'
import { EMPTY_DASHBOARD_CONTEXT_FILTERS, getTurmasForScope } from '@/lib/dashboardScope'

interface DashboardContextFiltersBarProps {
  filters: DashboardContextFilters
  options: DashboardFilterOptions
  loading?: boolean
  onChange: (filters: DashboardContextFilters) => void
  title?: string
  showMunicipio?: boolean
  showEscola?: boolean
}

function toOptions(values: string[], allLabel: string) {
  return [{ value: '', label: allLabel }, ...values.map((v) => ({ value: v, label: v }))]
}

function ContextFiltersFields({
  filters,
  options,
  loading,
  onChange,
  showMunicipio = true,
  showEscola = true,
}: DashboardContextFiltersBarProps) {
  const escolaOptions = useMemo(
    () => getEscolasForMunicipio(options.schools, filters.municipio),
    [options.schools, filters.municipio],
  )

  const turmaOptions = useMemo(
    () => getTurmasForScope(options, filters.municipio, filters.school_name),
    [options, filters.municipio, filters.school_name],
  )

  const handleMunicipioChange = (municipio: string) => {
    const nextMunicipio = municipio || undefined
    const schoolsInMunicipio = getEscolasForMunicipio(options.schools, nextMunicipio)
    const schoolStillValid =
      !filters.school_name || schoolsInMunicipio.includes(filters.school_name)
    const nextSchool = schoolStillValid ? filters.school_name : undefined
    const turmasInScope = getTurmasForScope(options, nextMunicipio, nextSchool)
    const turmaStillValid = !filters.turma || turmasInScope.includes(filters.turma)

    onChange({
      ...filters,
      municipio: nextMunicipio,
      school_name: nextSchool,
      turma: turmaStillValid ? filters.turma : undefined,
    })
  }

  const handleEscolaChange = (schoolName: string) => {
    const nextSchool = schoolName || undefined
    const turmasInScope = getTurmasForScope(options, filters.municipio, nextSchool)
    const turmaStillValid = !filters.turma || turmasInScope.includes(filters.turma)
    onChange({
      ...filters,
      school_name: nextSchool,
      turma: turmaStillValid ? filters.turma : undefined,
    })
  }

  const fieldClass = 'min-w-0 w-full'

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(11.5rem,1fr))]">
      {showMunicipio && (
        <Select
          className={fieldClass}
          label="Município"
          size="sm"
          value={filters.municipio || ''}
          onChange={(e) => handleMunicipioChange(e.target.value)}
          options={toOptions(
            options.municipios,
            options.municipios.length === 0 ? 'Nenhum município cadastrado' : 'Todos os municípios',
          )}
          disabled={loading && options.municipios.length === 0}
        />
      )}
      {showEscola && (
        <Select
          className={fieldClass}
          label="Escola"
          size="sm"
          value={filters.school_name || ''}
          onChange={(e) => handleEscolaChange(e.target.value)}
          options={toOptions(
            escolaOptions.length > 0 ? escolaOptions : options.escolas,
            filters.municipio ? 'Todas as escolas do município' : 'Todas as escolas',
          )}
          disabled={loading && options.escolas.length === 0}
        />
      )}
      <Select
        className={fieldClass}
        label="Turma"
        size="sm"
        value={filters.turma || ''}
        onChange={(e) => onChange({ ...filters, turma: e.target.value || undefined })}
        options={toOptions(
          turmaOptions,
          filters.school_name
            ? 'Todas as turmas da escola'
            : filters.municipio
              ? 'Todas as turmas do município'
              : 'Todas as turmas',
        )}
      />
      <DatePicker
        className={fieldClass}
        label="Período (de)"
        size="sm"
        value={filters.dateFrom ?? ''}
        onChange={(v) => onChange({ ...filters, dateFrom: v || undefined })}
      />
      <DatePicker
        className={fieldClass}
        label="Período (até)"
        size="sm"
        value={filters.dateTo ?? ''}
        onChange={(v) => onChange({ ...filters, dateTo: v || undefined })}
      />
    </div>
  )
}

function hasActiveContextFilters(filters: DashboardContextFilters) {
  return Boolean(
    filters.municipio ||
      filters.school_name ||
      filters.turma ||
      filters.dateFrom ||
      filters.dateTo,
  )
}

export function DashboardContextFiltersBar({
  filters,
  options,
  loading,
  onChange,
  title = 'Filtrar visão consolidada',
}: DashboardContextFiltersBarProps) {
  return (
    <Card className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-primary-400" />
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {loading && <span className="text-xs text-slate-500">Carregando opções…</span>}
        </div>
        {hasActiveContextFilters(filters) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(EMPTY_DASHBOARD_CONTEXT_FILTERS)}
          >
            <X size={14} />
            Limpar filtros
          </Button>
        )}
      </div>
      <ContextFiltersFields
        filters={filters}
        options={options}
        loading={loading}
        onChange={onChange}
      />
    </Card>
  )
}

export function AdminContextFiltersBar(props: Pick<DashboardContextFiltersBarProps, 'filters' | 'options' | 'loading' | 'onChange'>) {
  return (
    <DashboardContextFiltersBar
      {...props}
      title="Filtrar visão do município / escola / turma"
    />
  )
}

export function ProfessorContextFiltersBar(props: Pick<DashboardContextFiltersBarProps, 'filters' | 'options' | 'loading' | 'onChange'>) {
  const showEscola = props.options.escolas.length > 1
  return (
    <DashboardContextFiltersBar
      {...props}
      title="Filtrar por escola e turma"
      showMunicipio={false}
      showEscola={showEscola}
    />
  )
}

export function ProfessorScopeBadge({
  municipio,
  schoolName,
  turmas,
}: {
  municipio?: string | null
  schoolName?: string | null
  turmas?: string[] | null
}) {
  const parts = [municipio, schoolName].filter(Boolean)
  const turmaLabel = turmas?.length ? turmas.join(', ') : null

  if (parts.length === 0 && !turmaLabel) {
    return (
      <Card className="mb-6 !py-3 !px-4 border-primary-500/20 bg-primary-500/5">
        <p className="text-sm text-slate-400">
          Visão restrita aos seus formulários e links de avaliação.
        </p>
      </Card>
    )
  }

  return (
    <Card className="mb-6 !py-3 !px-4 border-primary-500/20 bg-primary-500/5">
      <p className="text-sm text-slate-300">
        Visão restrita à sua escola:{' '}
        <span className="text-white font-medium">{parts.join(' · ')}</span>
        {turmaLabel && (
          <>
            {' '}
            · Turmas: <span className="text-white font-medium">{turmaLabel}</span>
          </>
        )}
      </p>
    </Card>
  )
}
