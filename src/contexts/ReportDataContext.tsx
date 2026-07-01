import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus'
import {
  getReportDataCache,
  loadReportData,
  setReportDataCache,
  type ReportDataSnapshot,
} from '@/lib/reportDataLoader'
import { profileLocationCacheKey } from '@/lib/profileLocations'
import { isReportDataRoute } from '@/lib/reportRoutes'
import type { RawAnswerRow, ResponseWithForm } from '@/lib/reportAnalytics'

interface ReportDataContextValue {
  responses: ResponseWithForm[]
  answers: RawAnswerRow[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const ReportDataContext = createContext<ReportDataContextValue | undefined>(undefined)

export function ReportDataProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const location = useLocation()
  const enabled = isReportDataRoute(location.pathname)
  const profileScopeKey = profile ? profileLocationCacheKey(profile) : ''
  const cached =
    user && profile ? getReportDataCache(user.id, profile.role, profile) : null

  const [responses, setResponses] = useState<ResponseWithForm[]>(cached?.responses ?? [])
  const [answers, setAnswers] = useState<RawAnswerRow[]>(cached?.answers ?? [])
  const [loading, setLoading] = useState(enabled && !cached)
  const [error, setError] = useState<string | null>(null)

  const applySnapshot = useCallback((snapshot: ReportDataSnapshot) => {
    setResponses(snapshot.responses)
    setAnswers(snapshot.answers)
  }, [])

  const refetch = useCallback(async () => {
    if (!enabled || !user || !profile) return

    const hadData = Boolean(getReportDataCache(user.id, profile.role, profile))
    if (!hadData) setLoading(true)
    setError(null)

    try {
      const snapshot = await loadReportData(user.id, profile.role, profile)
      setReportDataCache(user.id, profile.role, snapshot, profile)
      applySnapshot(snapshot)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar relatórios')
      if (!hadData) {
        setResponses([])
        setAnswers([])
      }
    } finally {
      setLoading(false)
    }
  }, [enabled, user, profile, applySnapshot])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    if (!user || !profile) {
      setLoading(false)
      return
    }

    const snapshot = getReportDataCache(user.id, profile.role, profile)
    if (snapshot) {
      applySnapshot(snapshot)
      setLoading(false)
      return
    }

    let cancelled = false

    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const next = await loadReportData(user.id, profile.role, profile)
        if (cancelled) return
        setReportDataCache(user.id, profile.role, next, profile)
        applySnapshot(next)
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
  }, [enabled, user?.id, profile?.role, profileScopeKey, applySnapshot])

  useRefreshOnFocus(refetch, enabled && Boolean(user && profile))

  const value = useMemo(
    () => ({
      responses,
      answers,
      loading: enabled ? loading : false,
      error,
      refetch,
    }),
    [responses, answers, loading, error, refetch, enabled],
  )

  return <ReportDataContext.Provider value={value}>{children}</ReportDataContext.Provider>
}

export function useReportDataContext() {
  const ctx = useContext(ReportDataContext)
  if (!ctx) {
    throw new Error('useReportDataContext deve ser usado dentro de ReportDataProvider')
  }
  return ctx
}
