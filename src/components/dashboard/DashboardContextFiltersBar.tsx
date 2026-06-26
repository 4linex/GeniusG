import { useMemo } from 'react'
import { Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { getEscolasForMunicipio } from '@/lib/schools'
import type { DashboardContextFilters, DashboardFilterOptions } from '@/lib/dashboardScope'
import { EMPTY_DASHBOARD_CONTEXT_FILTERS } from '@/lib/dashboardScope'

interface DashboardContextFiltersBarProps {
  filters: DashboardContextFilters
  options: DashboardFilterOptions
  loading?: boolean
  onChange: (filters: DashboardContextFilters) => void
}

function toOptions(values: string[], allLabel: string) {
  return [{ value: '', label: allLabel }, ...values.map((v) => ({ value: v, label: v }))]
}

export function DashboardContextFiltersBar({
  filters,
  options,
  loading,
  onChange,
}: DashboardContextFiltersBarProps) {
  const escolaOptions = useMemo(
    () => getEscolasForMunicipio(options.schools, filters.municipio),
    [options.schools, filters.municipio],
  )

  const hasActiveFilters = Boolean(
    filters.municipio || filters.school_name || filters.turma,
  )

  const handleMunicipioChange = (municipio: string) => {
    const nextMunicipio = municipio || undefined
    const schoolsInMunicipio = getEscolasForMunicipio(options.schools, nextMunicipio)
    const schoolStillValid =
      !filters.school_name || schoolsInMunicipio.includes(filters.school_name)

    onChange({
      ...filters,
      municipio: nextMunicipio,
      school_name: schoolStillValid ? filters.school_name : undefined,
    })
  }

  return (
    <Card className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-primary-400" />
          <h2 className="text-sm font-semibold text-white">Filtrar visão consolidada</h2>
          {loading && <span className="text-xs text-slate-500">Carregando opções…</span>}
        </div>
        {hasActiveFilters && (
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <Select
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
        <Select
          label="Escola"
          size="sm"
          value={filters.school_name || ''}
          onChange={(e) =>
            onChange({ ...filters, school_name: e.target.value || undefined })
          }
          options={toOptions(
            escolaOptions.length > 0 ? escolaOptions : options.escolas,
            filters.municipio ? 'Todas as escolas do município' : 'Todas as escolas',
          )}
          disabled={loading && options.escolas.length === 0}
        />
        <Select
          label="Turma"
          size="sm"
          value={filters.turma || ''}
          onChange={(e) =>
            onChange({ ...filters, turma: e.target.value || undefined })
          }
          options={toOptions(options.turmas, 'Todas as turmas')}
        />
      </div>
    </Card>
  )
}

export function AdminContextFiltersBar({
  filters,
  options,
  loading,
  onChange,
}: Pick<DashboardContextFiltersBarProps, 'filters' | 'options' | 'loading' | 'onChange'>) {
  return (
    <Card className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-primary-400" />
          <h2 className="text-sm font-semibold text-white">Filtrar por turma</h2>
          {loading && <span className="text-xs text-slate-500">Carregando opções…</span>}
        </div>
        {filters.turma && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ ...filters, turma: undefined })}
          >
            <X size={14} />
            Limpar turma
          </Button>
        )}
      </div>
      <Select
        label="Turma"
        size="sm"
        value={filters.turma || ''}
        onChange={(e) => onChange({ ...filters, turma: e.target.value || undefined })}
        options={toOptions(options.turmas, 'Todas as turmas')}
      />
    </Card>
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
