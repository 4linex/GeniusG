import { Filter, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { FORM_STATUS_LABELS, TURMA_OPTIONS } from '@/types/database'

export interface ComponentFormsFiltersState {
  search: string
  turma: string
  status: string
}

export const EMPTY_COMPONENT_FORMS_FILTERS: ComponentFormsFiltersState = {
  search: '',
  turma: '',
  status: '',
}

interface ComponentFormsFiltersProps {
  filters: ComponentFormsFiltersState
  resultCount: number
  totalCount: number
  onChange: (filters: ComponentFormsFiltersState) => void
  onClear: () => void
}

export function ComponentFormsFilters({
  filters,
  resultCount,
  totalCount,
  onChange,
  onClear,
}: ComponentFormsFiltersProps) {
  const hasActiveFilters = Boolean(filters.search || filters.turma || filters.status)

  return (
    <Card className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-300">Buscar</label>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <input
              type="search"
              placeholder="Título ou descrição..."
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-500 px-3 py-1.5 pl-9 text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
            />
          </div>
        </div>
        <Select
          label="Ano/Série"
          size="sm"
          value={filters.turma}
          onChange={(e) => onChange({ ...filters, turma: e.target.value })}
          options={[{ value: '', label: 'Todos os anos' }, ...TURMA_OPTIONS]}
        />
        <Select
          label="Status"
          size="sm"
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          options={[
            { value: '', label: 'Todos os status' },
            ...Object.entries(FORM_STATUS_LABELS).map(([value, label]) => ({ value, label })),
          ]}
        />
      </div>
    </Card>
  )
}
