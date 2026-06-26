import { useEffect, useMemo, useState } from 'react'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { listSchoolClasses } from '@/lib/schoolClasses'

interface SchoolTurmaPickerProps {
  schoolId?: string | null
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
}

export function SchoolTurmaPicker({
  schoolId,
  value,
  onChange,
  disabled,
  required,
}: SchoolTurmaPickerProps) {
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

  const options = useMemo(
    () => [
      {
        value: '',
        label: loading
          ? 'Carregando turmas…'
          : classes.length === 0
            ? 'Nenhuma turma cadastrada'
            : 'Selecione a turma',
      },
      ...classes.map((name) => ({ value: name, label: name })),
    ],
    [classes, loading],
  )

  if (!schoolId) {
    return (
      <Input
        label="Turma"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Selecione a escola primeiro"
        disabled
        required={required}
      />
    )
  }

  if (classes.length > 0) {
    return (
      <div className="space-y-2">
        <Select
          label="Turma"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
          required={required}
          options={options}
        />
        <p className="text-xs text-slate-500">
          Turmas cadastradas para esta escola em Configurações → Escolas.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Input
        label="Turma"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ex.: 5º A, 5º B, 6º matutino"
        disabled={disabled || loading}
        required={required}
      />
      <p className="text-xs text-slate-500">
        Esta escola ainda não tem turmas cadastradas. Informe manualmente ou cadastre em
        Configurações → Escolas.
      </p>
    </div>
  )
}
