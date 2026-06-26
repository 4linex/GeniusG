import { useEffect, useState } from 'react'
import { listSchoolClasses } from '@/lib/schoolClasses'
import { Users } from 'lucide-react'

interface SchoolTurmasMultiPickerProps {
  schoolId?: string | null
  value: string[]
  onChange: (turmas: string[]) => void
  disabled?: boolean
  required?: boolean
}

export function SchoolTurmasMultiPicker({
  schoolId,
  value,
  onChange,
  disabled,
  required,
}: SchoolTurmasMultiPickerProps) {
  const [classes, setClasses] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!schoolId) {
      setClasses([])
      return
    }

    let cancelled = false
    setLoading(true)
    listSchoolClasses(schoolId)
      .then((rows) => {
        if (!cancelled) setClasses(rows.map((row) => row.name))
      })
      .catch(() => {
        if (!cancelled) setClasses([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [schoolId])

  const toggleTurma = (name: string) => {
    if (value.includes(name)) {
      onChange(value.filter((item) => item !== name))
    } else {
      onChange([...value, name])
    }
  }

  if (!schoolId) {
    return (
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Users size={15} className="text-primary-400" />
          Turmas
        </label>
        <p className="text-xs text-slate-500 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          Selecione a escola para escolher as turmas.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Users size={15} className="text-primary-400" />
          Turmas
        </label>
        <p className="text-xs text-slate-500">Carregando turmas…</p>
      </div>
    )
  }

  if (classes.length === 0) {
    return (
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Users size={15} className="text-primary-400" />
          Turmas
        </label>
        <p className="text-xs text-slate-500 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-amber-200/80">
          Esta escola ainda não tem turmas cadastradas. Cadastre em Configurações → Escolas antes
          de vincular o professor.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
        <Users size={15} className="text-primary-400" />
        Turmas {required && <span className="text-red-400">*</span>}
      </label>
      <p className="text-xs text-slate-500">
        Selecione uma ou mais turmas em que o professor atua nesta escola.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {classes.map((name) => {
          const checked = value.includes(name)
          return (
            <label
              key={name}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer transition-colors ${
                checked
                  ? 'border-primary-500/50 bg-primary-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="checkbox"
                className="rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500/40"
                checked={checked}
                disabled={disabled}
                onChange={() => toggleTurma(name)}
              />
              <span className="text-sm text-white truncate">{name}</span>
            </label>
          )
        })}
      </div>
      {required && value.length === 0 && (
        <p className="text-xs text-slate-500">Selecione ao menos uma turma.</p>
      )}
    </div>
  )
}
