import { useCallback, useEffect, useState } from 'react'
import { loadDifficultyLevels } from '@/lib/difficultyLevels'
import { DIFICULDADE_LEVELS } from '@/types/database'
import type { DifficultyLevel } from '@/types/database'

function fallbackLevels(): DifficultyLevel[] {
  return DIFICULDADE_LEVELS.map((name, order_index) => ({
    id: name,
    name,
    point_value: order_index + 1,
    order_index,
    created_at: '',
    updated_at: '',
  }))
}

export function useDifficultyLevels() {
  const [levels, setLevels] = useState<DifficultyLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await loadDifficultyLevels()
      setLevels(data.length > 0 ? data : fallbackLevels())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar níveis')
      setLevels(fallbackLevels())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { levels, loading, error, reload }
}
