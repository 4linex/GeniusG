import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus'
import {
  getReportDataCache,
  loadReportData,
  setReportDataCache,
} from '@/lib/reportDataLoader'
import type { RawAnswerRow, ResponseWithForm } from '@/lib/reportAnalytics'

/** Fora de ReportDataProvider — usa o mesmo cache compartilhado. */
export function useReportData() {
  const { user, profile } = useAuth()
  const cached =
    user && profile ? getReportDataCache(user.id, profile.role, profile) : null

  const [responses, setResponses] = useState<ResponseWithForm[]>(cached?.responses ?? [])
  const [answers, setAnswers] = useState<RawAnswerRow[]>(cached?.answers ?? [])
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!user || !profile) return

    const hadData = Boolean(getReportDataCache(user.id, profile.role, profile))
    if (!hadData) setLoading(true)
    setError(null)

    try {
      const snapshot = await loadReportData(user.id, profile.role, profile)
      setReportDataCache(user.id, profile.role, snapshot, profile)
      setResponses(snapshot.responses)
      setAnswers(snapshot.answers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar relatórios')
      if (!hadData) {
        setResponses([])
        setAnswers([])
      }
    } finally {
      setLoading(false)
    }
  }, [user, profile])

  useEffect(() => {
    if (!user || !profile) {
      setLoading(false)
      return
    }

    const snapshot = getReportDataCache(user.id, profile.role, profile)
    if (snapshot) {
      setResponses(snapshot.responses)
      setAnswers(snapshot.answers)
      setLoading(false)
      return
    }

    let cancelled = false

    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const next = await loadReportData(user.id, profile.role)
        if (cancelled) return
        setReportDataCache(user.id, profile.role, next)
        setResponses(next.responses)
        setAnswers(next.answers)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Erro ao carregar relatórios')
        setResponses([])
        setAnswers([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user, profile])

  useRefreshOnFocus(refetch, Boolean(user && profile))

  return { responses, answers, loading, error, refetch }
}
