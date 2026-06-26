import { useCallback, useEffect, useState } from 'react'
import { loadSkillBankItems, loadSkillBankRelations } from '@/lib/skillBank'
import { BLOOM_LEVELS } from '@/types/database'
import type { SkillBankItem, SkillBankRelation, SkillBankType } from '@/types/database'

function fallbackBloom(): SkillBankItem[] {
  return BLOOM_LEVELS.map((label, order_index) => ({
    id: `fallback-bloom-${order_index}`,
    type: 'bloom' as const,
    code: null,
    label,
    description: null,
    order_index,
    created_at: '',
    updated_at: '',
  }))
}

export function useSkillBank(type?: SkillBankType) {
  const [items, setItems] = useState<SkillBankItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await loadSkillBankItems(type)
      if (type === 'bloom' && data.length === 0) {
        setItems(fallbackBloom())
      } else {
        setItems(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar habilidades')
      if (type === 'bloom') setItems(fallbackBloom())
      else setItems([])
    } finally {
      setLoading(false)
    }
  }, [type])

  useEffect(() => {
    reload()
  }, [reload])

  return { items, loading, error, reload }
}

export function useSkillBankAll() {
  const [items, setItems] = useState<SkillBankItem[]>([])
  const [relations, setRelations] = useState<SkillBankRelation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [data, rels] = await Promise.all([loadSkillBankItems(), loadSkillBankRelations()])
      setItems(data)
      setRelations(rels)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar habilidades')
      setItems([])
      setRelations([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const byType = (t: SkillBankType) => items.filter((i) => i.type === t)

  return {
    items,
    relations,
    saeb: byType('saeb'),
    bncc: byType('bncc'),
    bloom: byType('bloom').length > 0 ? byType('bloom') : fallbackBloom(),
    loading,
    error,
    reload,
  }
}
