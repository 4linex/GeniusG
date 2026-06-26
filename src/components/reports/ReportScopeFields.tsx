import { useMemo } from 'react'
import { Select } from '@/components/ui/Select'
import { getEscolasForMunicipio } from '@/lib/schools'
import { useSchools } from '@/hooks/useSchools'
import { reportScopeLabel, type ReportFilters, type ReportScopeType } from '@/lib/reportAnalytics'

const SCOPE_OPTIONS: { value: ReportScopeType; label: string }[] = [
  { value: 'all', label: 'Visão geral' },
  { value: 'municipio', label: 'Por município / cidade' },
  { value: 'escola', label: 'Por escola' },
]

interface ReportScopeFieldsProps {
  filters: ReportFilters
  onChange: (next: ReportFilters) => void
  disabled?: boolean
}

export function reportScopeSummary(filters: ReportFilters): string {
  const label = reportScopeLabel(filters)
  if (filters.scopeType === 'municipio') return `Município: ${label}`
  if (filters.scopeType === 'escola') return `Escola: ${label}`
  return 'Visão geral — todas as escolas'
}

export function ReportScopeFields({ filters, onChange, disabled }: ReportScopeFieldsProps) {
  const { schools, loading } = useSchools()
  const scopeType = filters.scopeType ?? 'all'

  const municipioOptions = useMemo(() => {
    const set = new Set(schools.map((s) => `${s.municipio} - ${s.state_uf}`))
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [schools])

  const escolaOptions = useMemo(
    () => getEscolasForMunicipio(schools, filters.municipio),
    [schools, filters.municipio],
  )

  const patch = (partial: Partial<ReportFilters>) => onChange({ ...filters, ...partial })

  const handleScopeChange = (nextScope: ReportScopeType) => {
    if (nextScope === 'all') {
      onChange({ ...filters, scopeType: 'all', municipio: undefined, school_name: undefined })
      return
    }
    if (nextScope === 'municipio') {
      onChange({ ...filters, scopeType: 'municipio', school_name: undefined })
      return
    }
    onChange({ ...filters, scopeType: 'escola' })
  }

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <Select
        label="Escopo do relatório"
        size="sm"
        value={scopeType}
        onChange={(e) => handleScopeChange(e.target.value as ReportScopeType)}
        disabled={disabled || loading}
        options={SCOPE_OPTIONS}
      />

      {(scopeType === 'municipio' || scopeType === 'escola') && (
        <Select
          label="Município / cidade"
          size="sm"
          value={filters.municipio ?? ''}
          onChange={(e) => {
            const municipio = e.target.value || undefined
            patch({
              municipio,
              school_name: scopeType === 'escola' ? undefined : filters.school_name,
            })
          }}
          disabled={disabled || loading || municipioOptions.length === 0}
          options={[
            {
              value: '',
              label: loading
                ? 'Carregando…'
                : municipioOptions.length === 0
                  ? 'Nenhum município cadastrado'
                  : 'Selecione o município',
            },
            ...municipioOptions.map((m) => ({ value: m, label: m })),
          ]}
        />
      )}

      {scopeType === 'escola' && (
        <Select
          label="Escola"
          size="sm"
          value={filters.school_name ?? ''}
          onChange={(e) => patch({ school_name: e.target.value || undefined })}
          disabled={disabled || loading || !filters.municipio || escolaOptions.length === 0}
          options={[
            {
              value: '',
              label: !filters.municipio
                ? 'Selecione o município primeiro'
                : escolaOptions.length === 0
                  ? 'Nenhuma escola neste município'
                  : 'Selecione a escola',
            },
            ...escolaOptions.map((name) => ({ value: name, label: name })),
          ]}
        />
      )}
    </div>
  )
}
