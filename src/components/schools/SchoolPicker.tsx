import { useMemo, useState } from 'react'
import { Select } from '@/components/ui/Select'
import { formatSchoolMunicipio, formatSchoolLabel } from '@/lib/schools'
import type { School } from '@/types/database'

export interface SchoolSelection {
  schoolId: string
  municipio: string
  schoolName: string
}

interface SchoolPickerProps {
  schools: School[]
  value: SchoolSelection | null
  onChange: (value: SchoolSelection | null) => void
  loading?: boolean
  required?: boolean
  disabled?: boolean
  label?: string
}

export function SchoolPicker({
  schools,
  value,
  onChange,
  loading,
  required,
  disabled,
  label = 'Escola',
}: SchoolPickerProps) {
  const municipioOptions = useMemo(() => {
    const set = new Set(schools.map((s) => formatSchoolMunicipio(s)))
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [schools])

  const [municipioFilter, setMunicipioFilter] = useState('')

  const activeMunicipio = municipioFilter || value?.municipio || ''

  const filteredSchools = useMemo(() => {
    if (!activeMunicipio || municipioOptions.length <= 1) return schools
    return schools.filter((s) => formatSchoolMunicipio(s) === activeMunicipio)
  }, [schools, activeMunicipio, municipioOptions.length])

  const selectSchool = (schoolId: string) => {
    const school = schools.find((s) => s.id === schoolId)
    if (!school) {
      onChange(null)
      return
    }
    onChange({
      schoolId: school.id,
      municipio: formatSchoolMunicipio(school),
      schoolName: school.name,
    })
  }

  return (
    <div className="space-y-4">
      {municipioOptions.length > 1 && (
        <Select
          label="Município / local"
          value={activeMunicipio}
          onChange={(e) => {
            const municipio = e.target.value
            setMunicipioFilter(municipio)
            if (!municipio) {
              onChange(null)
              return
            }
            const inMunicipio = schools.filter((s) => formatSchoolMunicipio(s) === municipio)
            if (inMunicipio.length === 1) {
              selectSchool(inMunicipio[0].id)
            } else if (value && value.municipio !== municipio) {
              onChange(null)
            }
          }}
          disabled={disabled || loading}
          options={[
            { value: '', label: 'Selecione o município' },
            ...municipioOptions.map((m) => ({ value: m, label: m })),
          ]}
        />
      )}

      <Select
        label={label}
        value={value?.schoolId || ''}
        onChange={(e) => selectSchool(e.target.value)}
        disabled={
          disabled ||
          loading ||
          schools.length === 0 ||
          (municipioOptions.length > 1 && !activeMunicipio)
        }
        required={required}
        options={[
          {
            value: '',
            label: loading
              ? 'Carregando escolas…'
              : schools.length === 0
                ? 'Nenhuma escola cadastrada'
                : municipioOptions.length > 1 && !activeMunicipio
                  ? 'Selecione o município primeiro'
                  : 'Selecione a escola',
          },
          ...filteredSchools.map((school) => ({
            value: school.id,
            label: formatSchoolLabel(school),
          })),
        ]}
      />

      {!loading && schools.length === 0 && (
        <p className="text-xs text-slate-500">
          Cadastre escolas em Configurações → Escolas antes de continuar.
        </p>
      )}
    </div>
  )
}
