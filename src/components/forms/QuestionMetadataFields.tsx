import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { DurationInput } from '@/components/ui/DurationInput'
import {
  ANO_SERIE_MVP,
  AREA_OPTIONS,
  COMPONENTE_MVP,
  TURMA_OPTIONS,
} from '@/types/database'
import type { BuilderQuestionMeta } from '@/components/forms/builder/types'
import { useDifficultyLevels } from '@/hooks/useDifficultyLevels'
import { difficultyLevelSelectOptions, getPointValueForDifficulty } from '@/lib/difficultyLevels'
import { PedagogicalSkillFields } from '@/components/forms/PedagogicalSkillFields'
import { supportsTriScoring } from '@/types/questionTypes'

interface QuestionMetadataFieldsProps {
  metadata: BuilderQuestionMeta
  onChange: (metadata: BuilderQuestionMeta) => void
  questionType?: string
  onPointValueChange?: (value: number) => void
}

export function QuestionMetadataFields({
  metadata,
  onChange,
  questionType,
  onPointValueChange,
}: QuestionMetadataFieldsProps) {
  const { levels: difficultyLevels } = useDifficultyLevels()

  const set = <K extends keyof BuilderQuestionMeta>(key: K, value: BuilderQuestionMeta[K]) => {
    onChange({ ...metadata, [key]: value })
  }

  const handleDifficultyChange = (value: string) => {
    set('nivel_dificuldade', value)
    const suggested = getPointValueForDifficulty(difficultyLevels, value)
    if (
      suggested != null &&
      onPointValueChange &&
      questionType &&
      supportsTriScoring(questionType as import('@/types/questionTypes').QuestionType)
    ) {
      onPointValueChange(suggested)
    }
  }

  return (
    <div className="space-y-4 pt-2 border-t border-white/10">
      <p className="text-sm font-medium text-slate-300">Metadados pedagógicos</p>
      <p className="text-xs text-slate-500 -mt-2">
        Habilidades novas digitadas aqui são incluídas automaticamente no banco ao salvar a questão.
      </p>

      <Input
        label="Código do item"
        value={metadata.codigo_item || ''}
        onChange={(e) => set('codigo_item', e.target.value)}
        placeholder="Ex: LP5_D1_001"
      />

      <Select
        label="Componente curricular"
        value={metadata.componente_curricular || COMPONENTE_MVP}
        onChange={(e) => set('componente_curricular', e.target.value)}
        options={AREA_OPTIONS}
      />

      <Textarea
        label="Conteúdo programático"
        value={metadata.conteudo_programatico || ''}
        onChange={(e) => set('conteudo_programatico', e.target.value)}
        className="min-h-[56px] max-h-[80px]"
        rows={2}
      />

      <Select
        label="Ano/Série"
        value={metadata.ano_serie || ANO_SERIE_MVP}
        onChange={(e) => set('ano_serie', e.target.value)}
        options={TURMA_OPTIONS}
      />

      <PedagogicalSkillFields
        descritorSaeb={metadata.descritor_saeb || ''}
        habilidadeBncc={metadata.habilidade_bncc || ''}
        nivelBloom={metadata.nivel_bloom || ''}
        onDescritorSaebChange={(value) => set('descritor_saeb', value)}
        onHabilidadeBnccChange={(value) => set('habilidade_bncc', value)}
        onNivelBloomChange={(value) => set('nivel_bloom', value)}
      />

      <Select
        label="Nível de dificuldade"
        value={metadata.nivel_dificuldade || ''}
        onChange={(e) => handleDifficultyChange(e.target.value)}
        options={difficultyLevelSelectOptions(difficultyLevels)}
      />

      <DurationInput
        label="Tempo médio de resolução"
        value={metadata.tempo_medio_resolucao ?? null}
        onChange={(seconds) => set('tempo_medio_resolucao', seconds ?? undefined)}
      />

      <Input
        label="Tipo de texto-base"
        value={metadata.tipo_texto_base || ''}
        onChange={(e) => set('tipo_texto_base', e.target.value)}
        placeholder="Ex: Narrativo, Informativo, Poema..."
      />

      <Input
        label="Fonte"
        value={metadata.fonte || ''}
        onChange={(e) => set('fonte', e.target.value)}
        placeholder="Ex: Texto elaborado para este item"
      />
    </div>
  )
}

