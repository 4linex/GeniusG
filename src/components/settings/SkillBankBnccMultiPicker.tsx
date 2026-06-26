import { formatSkillBankValue } from '@/lib/skillBank'
import type { SkillBankItem } from '@/types/database'
import { BookMarked } from 'lucide-react'

interface SkillBankBnccMultiPickerProps {
  bnccItems: SkillBankItem[]
  value: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
  loading?: boolean
}

export function SkillBankBnccMultiPicker({
  bnccItems,
  value,
  onChange,
  disabled,
  loading,
}: SkillBankBnccMultiPickerProps) {
  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id))
    } else {
      onChange([...value, id])
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <BookMarked size={15} className="text-primary-400" />
          Habilidades BNCC correlacionadas
        </label>
        <p className="text-xs text-slate-500 mt-1">
          Marque uma ou mais habilidades BNCC relacionadas a este descritor SAEB.
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-slate-500">Carregando habilidades BNCC…</p>
      ) : bnccItems.length === 0 ? (
        <p className="text-xs text-slate-500 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-amber-200/80">
          Nenhuma habilidade BNCC cadastrada. Cadastre na aba BNCC ou execute o seed da matriz
          pedagógica.
        </p>
      ) : (
        <div className="max-h-48 overflow-y-auto space-y-2 rounded-xl border border-white/10 p-2">
          {bnccItems.map((item) => {
            const checked = value.includes(item.id)
            return (
              <label
                key={item.id}
                className={`flex items-start gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                  checked
                    ? 'border-primary-500/50 bg-primary-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500/40"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(item.id)}
                />
                <span className="text-sm text-white leading-snug">{formatSkillBankValue(item)}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
