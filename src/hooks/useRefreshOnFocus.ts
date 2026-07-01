import { useEffect, useRef } from 'react'

const DEFAULT_STALE_MS = 5 * 60 * 1000

/** Recarrega dados quando a aba volta ao foco, respeitando tempo mínimo entre refetches. */
export function useRefreshOnFocus(
  refetch: () => void,
  enabled = true,
  staleTimeMs = DEFAULT_STALE_MS,
) {
  const refetchRef = useRef(refetch)
  const lastFetchAtRef = useRef(0)

  useEffect(() => {
    refetchRef.current = refetch
  }, [refetch])

  useEffect(() => {
    if (!enabled) return

    const maybeRefetch = () => {
      const now = Date.now()
      if (lastFetchAtRef.current > 0 && now - lastFetchAtRef.current < staleTimeMs) {
        return
      }
      lastFetchAtRef.current = now
      refetchRef.current()
    }

    const onFocus = () => maybeRefetch()
    window.addEventListener('focus', onFocus)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') onFocus()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, staleTimeMs])
}
