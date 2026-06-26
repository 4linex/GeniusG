import { FilterX, Search } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { DatePicker } from '@/components/ui/DatePicker'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { ReportScopeFields } from '@/components/reports/ReportScopeFields'
import type { ReportFilters } from '@/lib/reportAnalytics'
import type { Profile } from '@/types/database'

interface ReportFiltersBarProps {
  filters: ReportFilters
  onChange: (next: ReportFilters) => void
  forms?: { id: string; title: string }[]
  students?: { email: string; name: string }[]
  showForm?: boolean
  showStudent?: boolean
  showSearch?: boolean
  showDates?: boolean
  showScope?: boolean
  scopeProfile?: Pick<Profile, 'role' | 'municipio' | 'school_name' | 'turmas'> | null
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
  showScope = false,
  scopeProfile,
  searchPlaceholder = 'Buscar...',
}: ReportFiltersBarProps) {
  const patch = (partial: Partial<ReportFilters>) => onChange({ ...filters, ...partial })
  const effectiveShowDates = showDates && !showScope

  const hasFilters = Boolean(
    filters.formId ||
      filters.studentEmail ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.search ||
      filters.turma ||
      (filters.scopeType && filters.scopeType !== 'all') ||
      filters.municipio ||
      filters.school_name,
  )

  const fieldCount =
    (showSearch ? 1 : 0) +
    (showForm ? 1 : 0) +
    (showStudent ? 1 : 0) +
    (effectiveShowDates ? 2 : 0)

  const gridCols =
    fieldCount >= 5
      ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
      : fieldCount >= 4
        ? 'sm:grid-cols-2 lg:grid-cols-4'
        : fieldCount >= 3
          ? 'sm:grid-cols-2 lg:grid-cols-3'
          : fieldCount >= 2
            ? 'sm:grid-cols-2'
            : 'grid-cols-1'

  return (
    <Card className="p-4 sm:p-5 overflow-visible space-y-4">
      {showScope && (
        <ReportScopeFields filters={filters} onChange={onChange} profile={scopeProfile} />
      )}

      <div className={`grid gap-3 grid-cols-1 ${gridCols}`}>
        {showSearch && (
          <div className="relative min-w-0">
            <Search
              size={16}
              className="absolute left-3 top-[2.125rem] text-slate-500 pointer-events-none z-10"
            />
            <Input
              label="Buscar"
              size="sm"
              type="search"
              value={filters.search ?? ''}
              onChange={(e) => patch({ search: e.target.value })}
              placeholder={searchPlaceholder}
              className="pl-9"
            />
          </div>
        )}

        {showForm && (
          <div className="min-w-0">
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
          </div>
        )}

        {showStudent && (
          <div className="min-w-0">
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
          </div>
        )}

        {effectiveShowDates && (
          <>
            <div className="min-w-0">
              <DatePicker
                label="Período (de)"
                size="sm"
                value={filters.dateFrom ?? ''}
                onChange={(v) => patch({ dateFrom: v || undefined })}
              />
            </div>
            <div className="min-w-0">
              <DatePicker
                label="Período (até)"
                size="sm"
                value={filters.dateTo ?? ''}
                onChange={(v) => patch({ dateTo: v || undefined })}
              />
            </div>
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
