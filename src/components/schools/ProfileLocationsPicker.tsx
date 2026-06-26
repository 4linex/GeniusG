import { useEffect, useMemo, useState } from 'react'
import { Building2, MapPin, Users } from 'lucide-react'
import { formatSchoolMunicipio, formatSchoolLabel } from '@/lib/schools'
import { listAllSchoolClasses } from '@/lib/schoolClasses'
import type { School } from '@/types/database'

export interface ProfileLocationsValue {
  municipios: string[]
  schoolIds: string[]
  turmas: string[]
}

interface ProfileLocationsPickerProps {
  schools: School[]
  loading?: boolean
  value: ProfileLocationsValue
  onChange: (value: ProfileLocationsValue) => void
  disabled?: boolean
  showTurmas?: boolean
  requireTurmas?: boolean
}

function toggleItem(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

export function ProfileLocationsPicker({
  schools,
  loading,
  value,
  onChange,
  disabled,
  showTurmas = true,
  requireTurmas = false,
}: ProfileLocationsPickerProps) {
  const [allClasses, setAllClasses] = useState<{ school_id: string; name: string }[]>([])
  const [classesLoading, setClassesLoading] = useState(false)

  const municipioOptions = useMemo(() => {
    const set = new Set(schools.map((s) => formatSchoolMunicipio(s)))
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [schools])

  const visibleSchools = useMemo(() => {
    if (value.municipios.length === 0) return schools
    return schools.filter((s) => value.municipios.includes(formatSchoolMunicipio(s)))
  }, [schools, value.municipios])

  const selectedSchools = useMemo(
    () => schools.filter((s) => value.schoolIds.includes(s.id)),
    [schools, value.schoolIds],
  )

  useEffect(() => {
    if (!showTurmas || value.schoolIds.length === 0) {
      setAllClasses([])
      return
    }

    let cancelled = false
    setClassesLoading(true)
    listAllSchoolClasses()
      .then((rows) => {
        if (cancelled) return
        const ids = new Set(value.schoolIds)
        setAllClasses(rows.filter((r) => ids.has(r.school_id)).map((r) => ({
          school_id: r.school_id,
          name: r.name,
        })))
      })
      .catch(() => {
        if (!cancelled) setAllClasses([])
      })
      .finally(() => {
        if (!cancelled) setClassesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [showTurmas, value.schoolIds])

  const turmaOptions = useMemo(() => {
    const set = new Set<string>()
    for (const row of allClasses) set.add(row.name)
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [allClasses])

  const handleMunicipiosChange = (municipios: string[]) => {
    const allowedSchoolIds = schools
      .filter((s) => municipios.length === 0 || municipios.includes(formatSchoolMunicipio(s)))
      .map((s) => s.id)
    const schoolIds = value.schoolIds.filter((id) => allowedSchoolIds.includes(id))
    onChange({ ...value, municipios, schoolIds, turmas: value.turmas })
  }

  const handleSchoolsChange = (schoolIds: string[]) => {
    const municipiosFromSchools = [
      ...new Set(
        schools
          .filter((s) => schoolIds.includes(s.id))
          .map((s) => formatSchoolMunicipio(s)),
      ),
    ]
    const municipios =
      value.municipios.length > 0
        ? value.municipios
        : municipiosFromSchools
    onChange({ municipios, schoolIds, turmas: value.turmas })
  }

  const checkboxClass = (checked: boolean) =>
    `flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer transition-colors ${
      checked
        ? 'border-primary-500/50 bg-primary-500/10'
        : 'border-white/10 bg-white/5 hover:border-white/20'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`

  if (loading) {
    return <p className="text-xs text-slate-500">Carregando escolas…</p>
  }

  if (schools.length === 0) {
    return (
      <p className="text-xs text-slate-500 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
        Cadastre escolas em Configurações → Escolas antes de continuar.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {municipioOptions.length > 1 && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <MapPin size={15} className="text-primary-400" />
            Municípios
          </label>
          <p className="text-xs text-slate-500">Selecione um ou mais municípios de atuação.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto scrollbar-app pr-1">
            {municipioOptions.map((municipio) => {
              const checked = value.municipios.includes(municipio)
              return (
                <label key={municipio} className={checkboxClass(checked)}>
                  <input
                    type="checkbox"
                    className="rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500/40"
                    checked={checked}
                    disabled={disabled}
                    onChange={() =>
                      handleMunicipiosChange(toggleItem(value.municipios, municipio))
                    }
                  />
                  <span className="text-sm text-white truncate">{municipio}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Building2 size={15} className="text-primary-400" />
          Escolas <span className="text-red-400">*</span>
        </label>
        <p className="text-xs text-slate-500">Selecione uma ou mais escolas vinculadas ao usuário.</p>
        <div className="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto scrollbar-app pr-1">
          {visibleSchools.map((school) => {
            const checked = value.schoolIds.includes(school.id)
            return (
              <label key={school.id} className={checkboxClass(checked)}>
                <input
                  type="checkbox"
                  className="rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500/40 shrink-0"
                  checked={checked}
                  disabled={disabled}
                  onChange={() =>
                    handleSchoolsChange(toggleItem(value.schoolIds, school.id))
                  }
                />
                <span className="text-sm text-white">{formatSchoolLabel(school)}</span>
              </label>
            )
          })}
        </div>
        {selectedSchools.length > 0 && (
          <p className="text-xs text-slate-500">
            {selectedSchools.length} escola{selectedSchools.length !== 1 ? 's' : ''} selecionada
            {selectedSchools.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {showTurmas && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <Users size={15} className="text-primary-400" />
            Turmas {requireTurmas && <span className="text-red-400">*</span>}
          </label>
          {value.schoolIds.length === 0 ? (
            <p className="text-xs text-slate-500 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              Selecione ao menos uma escola para escolher as turmas.
            </p>
          ) : classesLoading ? (
            <p className="text-xs text-slate-500">Carregando turmas…</p>
          ) : turmaOptions.length === 0 ? (
            <p className="text-xs text-amber-200/80 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              As escolas selecionadas ainda não têm turmas cadastradas.
            </p>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                Turmas das escolas selecionadas — marque todas em que o professor atua.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto scrollbar-app pr-1">
                {turmaOptions.map((name) => {
                  const checked = value.turmas.includes(name)
                  return (
                    <label key={name} className={checkboxClass(checked)}>
                      <input
                        type="checkbox"
                        className="rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500/40"
                        checked={checked}
                        disabled={disabled}
                        onChange={() =>
                          onChange({ ...value, turmas: toggleItem(value.turmas, name) })
                        }
                      />
                      <span className="text-sm text-white truncate">{name}</span>
                    </label>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
