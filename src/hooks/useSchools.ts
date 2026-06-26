import { useCallback, useEffect, useState } from 'react'
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus'
import { listSchools } from '@/lib/schools'
import type { School } from '@/types/database'

let schoolsCache: School[] | null = null
let schoolsCachePromise: Promise<School[]> | null = null

async function loadSchoolsCached(): Promise<School[]> {
  if (schoolsCache) return schoolsCache
  if (!schoolsCachePromise) {
    schoolsCachePromise = listSchools()
      .then((data) => {
        schoolsCache = data
        return data
      })
      .finally(() => {
        schoolsCachePromise = null
      })
  }
  return schoolsCachePromise
}

export function invalidateSchoolsCache() {
  schoolsCache = null
}

export function useSchools() {
  const [schools, setSchools] = useState<School[]>(schoolsCache || [])
  const [loading, setLoading] = useState(!schoolsCache)
  const [error, setError] = useState('')

  const reload = useCallback(async (force = true) => {
    if (force) invalidateSchoolsCache()
    setLoading(true)
    setError('')
    try {
      const data = await loadSchoolsCached()
      setSchools(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar escolas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!schoolsCache) void reload(false)
  }, [reload])

  useRefreshOnFocus(() => reload(true), true)

  return { schools, loading, error, reload }
}
