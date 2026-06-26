import { useMemo } from 'react'
import { Select } from '@/components/ui/Select'
import { DatePicker } from '@/components/ui/DatePicker'
import { formatSchoolMunicipio, getEscolasForMunicipio } from '@/lib/schools'
import { useAllSchoolClasses, useSchools } from '@/hooks/useSchools'
import { isRootRole, isScopedAdminRole } from '@/lib/dashboardScope'
import { schoolMatchesProfile } from '@/lib/profileLocations'
import { reportScopeLabel, type ReportFilters, type ReportScopeType } from '@/lib/reportAnalytics'
import type { Profile, School } from '@/types/database'

type ScopeProfile = Pick<
  Profile,
  'role' | 'municipio' | 'school_name' | 'municipios' | 'school_names' | 'school_ids' | 'turmas'
>

const ALL_SCOPE_OPTIONS: { value: ReportScopeType; label: string }[] = [
  { value: 'all', label: 'Visão geral' },
  { value: 'municipio', label: 'Por município / cidade' },
  { value: 'escola', label: 'Por escola' },
  { value: 'turma', label: 'Por turma' },
]

interface ReportScopeFieldsProps {
  filters: ReportFilters
  onChange: (next: ReportFilters) => void
  disabled?: boolean
  profile?: ScopeProfile | null
}

export function reportScopeSummary(filters: ReportFilters): string {
  const label = reportScopeLabel(filters)
  if (filters.scopeType === 'turma') return `Turma: ${label}`
  if (filters.scopeType === 'municipio') return `Município: ${label}`
  if (filters.scopeType === 'escola') return `Escola: ${label}`
  return 'Visão geral — todas as escolas'
}

function scopeOptionsForRole(profile?: ScopeProfile | null) {
  if (!profile || isRootRole(profile.role)) return ALL_SCOPE_OPTIONS
  if (isScopedAdminRole(profile.role)) {
    // Admin: restrito ao(s) seu(s) município(s)/escola(s) — sem recorte por município.
    return ALL_SCOPE_OPTIONS.filter((o) => o.value !== 'municipio')
  }
  // Professor: apenas geral, por escola e por turma.
  return ALL_SCOPE_OPTIONS.filter((o) => o.value === 'all' || o.value === 'escola' || o.value === 'turma')
}

function norm(value: string | null | undefined): string {
  return value?.trim() || ''
}

/** Restringe a lista de escolas conforme o perfil (admin/professor). */
function scopeSchoolsByProfile(schools: School[], profile?: ScopeProfile | null): School[] {
  if (!profile || isRootRole(profile.role)) return schools
  return schools.filter((school) => schoolMatchesProfile(school, profile))
}

export function ReportScopeFields({ filters, onChange, disabled, profile }: ReportScopeFieldsProps) {
  const { schools: allSchools, loading } = useSchools()
  const { classes } = useAllSchoolClasses()
  const scopeType = filters.scopeType ?? 'all'

  const scopeOptions = useMemo(() => scopeOptionsForRole(profile), [profile])
  const schools = useMemo(() => scopeSchoolsByProfile(allSchools, profile), [allSchools, profile])

  const municipioOptions = useMemo(() => {
    const set = new Set(schools.map((s) => formatSchoolMunicipio(s)))
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [schools])

  const escolaOptions = useMemo(
    () => getEscolasForMunicipio(schools, filters.municipio),
    [schools, filters.municipio],
  )

  const turmaOptions = useMemo(() => {
    const matchingSchoolIds = new Set(
      schools
        .filter((school) => {
          if (filters.municipio && formatSchoolMunicipio(school) !== filters.municipio) return false
          if (filters.school_name && school.name !== filters.school_name) return false
          return true
        })
        .map((school) => school.id),
    )
    const set = new Set<string>()
    for (const cls of classes) {
      if (matchingSchoolIds.has(cls.school_id)) set.add(cls.name)
    }
    let list = [...set]
    // Professor: restringe às turmas do cadastro quando informadas.
    if (profile && !isRootRole(profile.role) && !isScopedAdminRole(profile.role) && profile.turmas?.length) {
      const allowed = new Set(profile.turmas.map((t) => norm(t)))
      list = list.filter((t) => allowed.has(t))
    }
    return list.sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [schools, classes, filters.municipio, filters.school_name, profile])

  const patch = (partial: Partial<ReportFilters>) => onChange({ ...filters, ...partial })

  const handleScopeChange = (nextScope: ReportScopeType) => {
    if (nextScope === 'all') {
      onChange({ ...filters, scopeType: 'all', municipio: undefined, school_name: undefined, turma: undefined })
      return
    }
    if (nextScope === 'municipio') {
      onChange({ ...filters, scopeType: 'municipio', school_name: undefined, turma: undefined })
      return
    }
    if (nextScope === 'turma') {
      onChange({ ...filters, scopeType: 'turma' })
      return
    }
    onChange({ ...filters, scopeType: 'escola', turma: undefined })
  }

  const showMunicipio =
    (scopeType === 'municipio' || scopeType === 'escola' || scopeType === 'turma') &&
    scopeOptions.some((o) => o.value === 'municipio')

  return (
    <div className="space-y-3">
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Select
          label="Escopo do relatório"
          size="sm"
          value={scopeType}
          onChange={(e) => handleScopeChange(e.target.value as ReportScopeType)}
          disabled={disabled || loading}
          options={scopeOptions}
        />

        {showMunicipio && (
          <Select
            label="Município / cidade"
            size="sm"
            value={filters.municipio ?? ''}
            onChange={(e) => {
              const municipio = e.target.value || undefined
              patch({
                municipio,
                school_name: scopeType === 'escola' || scopeType === 'turma' ? undefined : filters.school_name,
                turma: undefined,
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

        {(scopeType === 'escola' || scopeType === 'turma') && (
          <Select
            label="Escola"
            size="sm"
            value={filters.school_name ?? ''}
            onChange={(e) => patch({ school_name: e.target.value || undefined, turma: undefined })}
            disabled={disabled || loading || (showMunicipio && !filters.municipio) || escolaOptions.length === 0}
            options={[
              {
                value: '',
                label:
                  showMunicipio && !filters.municipio
                    ? 'Selecione o município primeiro'
                    : escolaOptions.length === 0
                      ? 'Nenhuma escola disponível'
                      : 'Selecione a escola',
              },
              ...escolaOptions.map((name) => ({ value: name, label: name })),
            ]}
          />
        )}

        {scopeType === 'turma' && (
          <Select
            label="Turma"
            size="sm"
            value={filters.turma ?? ''}
            onChange={(e) => patch({ turma: e.target.value || undefined })}
            disabled={disabled || turmaOptions.length === 0}
            options={[
              { value: '', label: turmaOptions.length === 0 ? 'Nenhuma turma disponível' : 'Selecione a turma' },
              ...turmaOptions.map((t) => ({ value: t, label: t })),
            ]}
          />
        )}
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        <DatePicker
          label="Período do relatório (de)"
          size="sm"
          value={filters.dateFrom ?? ''}
          onChange={(v) => patch({ dateFrom: v || undefined })}
          disabled={disabled}
        />
        <DatePicker
          label="Período do relatório (até)"
          size="sm"
          value={filters.dateTo ?? ''}
          onChange={(v) => patch({ dateTo: v || undefined })}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
