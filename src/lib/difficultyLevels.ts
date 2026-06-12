import { supabase } from '@/lib/supabase'
import type { DifficultyLevel } from '@/types/database'
import { supportsTriScoring, type QuestionType } from '@/types/questionTypes'
import { clampPointValue } from '@/lib/scoreBounds'

export const DIFFICULTY_POINT_MIN = 1
export const DIFFICULTY_POINT_MAX = 100

export const DIFFICULTY_POINT_HINT =
  'A nota deve ser maior ou igual a 1 e menor ou igual a 100.'

export function validateDifficultyPointValue(value: number): string | null {
  if (!Number.isFinite(value)) return DIFFICULTY_POINT_HINT
  if (value < DIFFICULTY_POINT_MIN || value > DIFFICULTY_POINT_MAX) return DIFFICULTY_POINT_HINT
  return null
}

export async function loadDifficultyLevels(): Promise<DifficultyLevel[]> {
  const { data, error } = await supabase
    .from('difficulty_levels')
    .select('*')
    .order('order_index')

  if (error) throw error
  return (data as DifficultyLevel[]) || []
}

export async function createDifficultyLevel(
  name: string,
  pointValue: number,
  orderIndex?: number,
): Promise<void> {
  const { error } = await supabase.from('difficulty_levels').insert({
    name: name.trim(),
    point_value: pointValue,
    order_index: orderIndex ?? 0,
  })
  if (error) throw error
}

export async function updateDifficultyLevel(
  id: string,
  patch: { name?: string; point_value?: number; order_index?: number },
): Promise<void> {
  const { error } = await supabase
    .from('difficulty_levels')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteDifficultyLevel(id: string): Promise<void> {
  const { error } = await supabase.from('difficulty_levels').delete().eq('id', id)
  if (error) throw error
}

export function getPointValueForDifficulty(
  levels: DifficultyLevel[],
  name: string | null | undefined,
): number | null {
  if (!name) return null
  const match = levels.find((l) => l.name === name)
  return match ? Number(match.point_value) : null
}

/** Pontuação da questão vem do nível de dificuldade configurado em Configurações Gerais. */
export function resolveQuestionPointValue(
  questionType: QuestionType | string,
  nivelDificuldade: string | null | undefined,
  levels: DifficultyLevel[],
): number {
  if (!supportsTriScoring(questionType as QuestionType)) return 0
  const fromLevel = getPointValueForDifficulty(levels, nivelDificuldade)
  return clampPointValue(fromLevel ?? 1)
}

export function difficultyLevelSelectOptions(levels: DifficultyLevel[]) {
  return [
    { value: '', label: 'Selecione...' },
    ...levels.map((l) => ({
      value: l.name,
      label: `${l.name} (${l.point_value} ${l.point_value === 1 ? 'pt' : 'pts'})`,
    })),
  ]
}
