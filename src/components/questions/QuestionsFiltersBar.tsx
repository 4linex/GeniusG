import { Filter, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import {
  ANO_SERIE_OPTIONS,
  COMPONENTE_OPTIONS,
  DIFICULDADE_LEVELS,
} from '@/types/database'

export interface QuestionsFiltersState {
  search: string
  componente: string
  ano: string
  dificuldade: string
}

export const EMPTY_QUESTIONS_FILTERS: QuestionsFiltersState = {
  search: '',
  componente: '',
  ano: '',
  dificuldade: '',
}

interface QuestionsFiltersBarProps {
  filters: QuestionsFiltersState
  resultCount: number
  totalCount: number
  onChange: (filters: QuestionsFiltersState) => void
  onClear: () => void
}

export function QuestionsFiltersBar({
  filters,
  resultCount,
  totalCount,
  onChange,
  onClear,
}: QuestionsFiltersBarProps) {
  const hasActiveFilters = Boolean(
    filters.search || filters.componente || filters.ano || filters.dificuldade,
  )

  return (
    <Card className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={18} className="text-primary-400" />
          <h2 className="text-sm font-semibold text-white">Filtrar questões</h2>
          {hasActiveFilters && (
            <span className="text-xs text-slate-500">
              {resultCount} de {totalCount} quest{totalCount !== 1 ? 'ões' : 'ão'}
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
        <div className="space-y-1.5 sm:col-span-2 xl:col-span-1">
          <label className="block text-sm font-medium text-slate-300">Buscar</label>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <input
              type="search"
              placeholder="Título, código ou enunciado..."
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-500 px-3 py-1.5 pl-9 text-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
            />
          </div>
        </div>
        <Select
          label="Componente curricular"
          size="sm"
          value={filters.componente}
          onChange={(e) => onChange({ ...filters, componente: e.target.value })}
          options={[{ value: '', label: 'Todos os componentes' }, ...COMPONENTE_OPTIONS]}
        />
        <Select
          label="Ano/Série"
          size="sm"
          value={filters.ano}
          onChange={(e) => onChange({ ...filters, ano: e.target.value })}
          options={[{ value: '', label: 'Todos os anos' }, ...ANO_SERIE_OPTIONS]}
        />
        <Select
          label="Dificuldade"
          size="sm"
          value={filters.dificuldade}
          onChange={(e) => onChange({ ...filters, dificuldade: e.target.value })}
          options={[
            { value: '', label: 'Todas as dificuldades' },
            ...DIFICULDADE_LEVELS.map((level) => ({ value: level, label: level })),
          ]}
        />
      </div>
    </Card>
  )
}
