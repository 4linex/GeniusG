import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus'
import { loadFormsHubData } from '@/lib/formsHubData'
import type { FormWithLinks } from '@/lib/formsHubOrganize'

interface FormsHubSnapshot {
  forms: FormWithLinks[]
}

const formsHubCache = new Map<string, FormsHubSnapshot>()

function formsHubCacheKey(userId: string, role: string, canManageForms: boolean) {
  return `${userId}:${role}:${canManageForms}`
}

export function useFormsHubData() {
  const { user, profile, loading: authLoading, hasRole } = useAuth()
  const canManageForms = hasRole('root', 'admin')
  const cacheKey =
    user && profile ? formsHubCacheKey(user.id, profile.role, canManageForms) : null
  const cached = cacheKey ? formsHubCache.get(cacheKey) : undefined

  const [forms, setForms] = useState<FormWithLinks[]>(cached?.forms ?? [])
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    if (!user || !profile) return
    const key = formsHubCacheKey(user.id, profile.role, canManageForms)
    const hadData = formsHubCache.has(key)
    if (!hadData) setLoading(true)
    setError('')

    try {
      const nextForms = await loadFormsHubData(user.id, profile, canManageForms)
      formsHubCache.set(key, { forms: nextForms })
      setForms(nextForms)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar formulários')
    } finally {
      setLoading(false)
    }
  }, [user, profile, canManageForms])

  useEffect(() => {
    if (authLoading || !user || !profile) {
      if (!authLoading) setLoading(false)
      return
    }

    const key = formsHubCacheKey(user.id, profile.role, canManageForms)
    const hit = formsHubCache.get(key)
    if (hit) {
      setForms(hit.forms)
      setLoading(false)
      return
    }

    loadData()
  }, [user, profile, authLoading, canManageForms, loadData])

  useRefreshOnFocus(loadData, !authLoading && Boolean(user && profile))

  return {
    forms,
    loading,
    error,
    canManageForms,
    profile,
    user,
    reload: loadData,
    clearError: () => setError(''),
    setError,
  }
}

export function invalidateFormsHubCache() {
  formsHubCache.clear()
}
