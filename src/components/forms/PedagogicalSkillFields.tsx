import { useMemo } from 'react'
import { SkillBankCombobox } from '@/components/forms/SkillBankCombobox'
import { useSkillBankAll } from '@/hooks/useSkillBank'
import {
  formatSkillBankValue,
  getBloomHintForSaeb,
  getRelatedBnccForSaeb,
} from '@/lib/skillBank'

interface PedagogicalSkillFieldsProps {
  descritorSaeb: string
  habilidadeBncc: string
  nivelBloom: string
  onDescritorSaebChange: (value: string) => void
  onHabilidadeBnccChange: (value: string) => void
  onNivelBloomChange: (value: string) => void
  bnccRequired?: boolean
  bloomRequired?: boolean
}

export function PedagogicalSkillFields({
  descritorSaeb,
  habilidadeBncc,
  nivelBloom,
  onDescritorSaebChange,
  onHabilidadeBnccChange,
  onNivelBloomChange,
  bnccRequired,
  bloomRequired,
}: PedagogicalSkillFieldsProps) {
  const { saeb, bncc, bloom, relations } = useSkillBankAll()

  const bnccOptions = useMemo(
    () => getRelatedBnccForSaeb(descritorSaeb, saeb, bncc, relations),
    [descritorSaeb, saeb, bncc, relations],
  )

  const bloomHint = useMemo(
    () => getBloomHintForSaeb(descritorSaeb, saeb),
    [descritorSaeb, saeb],
  )

  const handleSaebChange = (value: string) => {
    onDescritorSaebChange(value)
    const hint = getBloomHintForSaeb(value, saeb)
    if (hint && !nivelBloom.trim()) {
      const primaryBloom = hint.split('/')[0].trim().replace('Memorizar', 'Lembrar')
      const match = bloom.find(
        (b) => b.label.toLowerCase() === primaryBloom.toLowerCase(),
      )
      if (match) onNivelBloomChange(formatSkillBankValue(match))
      else onNivelBloomChange(primaryBloom)
    }
  }

  return (
    <div className="space-y-4">
      <SkillBankCombobox
        label="Descritor SAEB"
        value={descritorSaeb}
        onChange={handleSaebChange}
        items={saeb}
        placeholder="Ex: D3 – Inferir o sentido de palavra ou expressão"
        hint="Descritores da Matriz SAEB (código D1, D3, D11…)"
      />

      {descritorSaeb && bnccOptions.length < bncc.length && (
        <p className="text-xs text-primary-300 -mt-2">
          Habilidades BNCC relacionadas a este descritor SAEB (matriz pedagógica).
        </p>
      )}

      <SkillBankCombobox
        label="Habilidade BNCC"
        value={habilidadeBncc}
        onChange={onHabilidadeBnccChange}
        items={bnccOptions}
        placeholder="Ex: EF35LP05 – Inferir o sentido de palavras no contexto"
        required={bnccRequired}
        hint="Habilidades da BNCC (código EF15LP03, EF35LP04…)"
      />

      <SkillBankCombobox
        label="Nível de Bloom"
        value={nivelBloom}
        onChange={onNivelBloomChange}
        items={bloom}
        placeholder="Ex: Compreender"
        required={bloomRequired}
        hint={bloomHint ? `Sugerido para este descritor SAEB: ${bloomHint}` : 'Taxonomia de Bloom revisada'}
      />
    </div>
  )
}
