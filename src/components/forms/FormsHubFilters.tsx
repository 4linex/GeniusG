import { Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'

export interface FormsHubFiltersState {
  area: string
  turma: string
  escola: string
  local: string
}

export const EMPTY_FORMS_HUB_FILTERS: FormsHubFiltersState = {
  area: '',
  turma: '',
  escola: '',
  local: '',
}

interface FormsHubFiltersProps {
  filters: FormsHubFiltersState
  options: {
    areas: string[]
    turmas: string[]
    escolas: string[]
    locais: string[]
  }
  resultCount: number
  totalCount: number
  onChange: (filters: FormsHubFiltersState) => void
  onClear: () => void
}

function toOptions(values: string[], allLabel: string) {
  return [{ value: '', label: allLabel }, ...values.map((v) => ({ value: v, label: v }))]
}

export function FormsHubFiltersBar({
  filters,
  options,
  resultCount,
  totalCount,
  onChange,
  onClear,
}: FormsHubFiltersProps) {
  const hasActiveFilters = Boolean(filters.area || filters.turma || filters.escola || filters.local)

  return (
    <Card className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-primary-400" />
          <h2 className="text-sm font-semibold text-white">Filtrar formulários</h2>
          {hasActiveFilters && (
            <span className="text-xs text-slate-500">
              {resultCount} de {totalCount} formulário{totalCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            <X size={14} />
            Limpar filtros
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Select
          label="Área do conhecimento"
          size="sm"
          value={filters.area}
          onChange={(e) => onChange({ ...filters, area: e.target.value })}
          options={toOptions(options.areas, 'Todas as áreas')}
        />
        <Select
          label="Turma"
          size="sm"
          value={filters.turma}
          onChange={(e) => onChange({ ...filters, turma: e.target.value })}
          options={toOptions(options.turmas, 'Todas as turmas')}
        />
        <Select
          label="Escola"
          size="sm"
          value={filters.escola}
          onChange={(e) => onChange({ ...filters, escola: e.target.value })}
          options={toOptions(options.escolas, 'Todas as escolas')}
        />
        <Select
          label="Local / município"
          size="sm"
          value={filters.local}
          onChange={(e) => onChange({ ...filters, local: e.target.value })}
          options={toOptions(options.locais, 'Todos os locais')}
        />
      </div>
    </Card>
  )
}
