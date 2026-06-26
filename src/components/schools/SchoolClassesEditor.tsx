import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Plus, Trash2, Users } from 'lucide-react'

interface SchoolClassesEditorProps {
  value: string[]
  onChange: (names: string[]) => void
  disabled?: boolean
}

export function SchoolClassesEditor({ value, onChange, disabled }: SchoolClassesEditorProps) {
  const [draft, setDraft] = useState('')

  const addClass = () => {
    const name = draft.trim()
    if (!name || value.includes(name)) {
      setDraft('')
      return
    }
    onChange([...value, name])
    setDraft('')
  }

  const removeClass = (name: string) => {
    onChange(value.filter((item) => item !== name))
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Users size={15} className="text-primary-400" />
          Turmas da escola
        </label>
        <p className="text-xs text-slate-500 mt-1">
          Cadastre as turmas desta unidade (ex.: 5º A, 5º B, 6º matutino). Opcional, mas recomendado
          para padronizar links e filtros.
        </p>
      </div>

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((name) => (
            <li
              key={name}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            >
              <span className="flex-1 text-sm text-white">{name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => removeClass(name)}
                aria-label={`Remover turma ${name}`}
              >
                <Trash2 size={15} className="text-red-400" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Input
            label="Nova turma"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ex.: 5º A"
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addClass()
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || !draft.trim()}
          onClick={addClass}
          className="shrink-0 mb-0.5"
        >
          <Plus size={16} />
          Adicionar
        </Button>
      </div>
    </div>
  )
}
