import { FilterX, Search } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { ReportFilters } from '@/lib/reportAnalytics'

interface ReportFiltersBarProps {
  filters: ReportFilters
  onChange: (next: ReportFilters) => void
  forms?: { id: string; title: string }[]
  students?: { email: string; name: string }[]
  showForm?: boolean
  showStudent?: boolean
  showSearch?: boolean
  showDates?: boolean
  searchPlaceholder?: string
}

export function ReportFiltersBar({
  filters,
  onChange,
  forms = [],
  students = [],
  showForm = true,
  showStudent = true,
  showSearch = true,
  showDates = true,
  searchPlaceholder = 'Buscar...',
}: ReportFiltersBarProps) {
  const patch = (partial: Partial<ReportFilters>) => onChange({ ...filters, ...partial })

  const hasFilters = Boolean(
    filters.formId ||
      filters.studentEmail ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.search,
  )

  return (
    <Card className="p-4 sm:p-5 overflow-visible">
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[1.4fr_repeat(4,minmax(140px,1fr))] xl:items-end">
        {showSearch && (
          <div className="relative xl:col-span-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <input
              type="search"
              value={filters.search ?? ''}
              onChange={(e) => patch({ search: e.target.value })}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        )}

        {showForm && (
          <Select
            label="Formulário"
            size="sm"
            value={filters.formId ?? ''}
            onChange={(e) => patch({ formId: e.target.value || undefined })}
            options={[
              { value: '', label: 'Todos' },
              ...forms.map((f) => ({ value: f.id, label: f.title })),
            ]}
          />
        )}

        {showStudent && (
          <Select
            label="Aluno"
            size="sm"
            value={filters.studentEmail ?? ''}
            onChange={(e) => patch({ studentEmail: e.target.value || undefined })}
            options={[
              { value: '', label: 'Todos' },
              ...students.map((s) => ({ value: s.email, label: s.name })),
            ]}
          />
        )}

        {showDates && (
          <>
            <Input
              label="Período (de)"
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(e) => patch({ dateFrom: e.target.value || undefined })}
            />
            <Input
              label="Período (até)"
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(e) => patch({ dateTo: e.target.value || undefined })}
            />
          </>
        )}
      </div>

      {hasFilters && (
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => onChange({})}>
            <FilterX size={16} />
            Limpar filtros
          </Button>
        </div>
      )}
    </Card>
  )
}
