import { useEffect, useRef } from 'react'

/** Recarrega dados quando a aba volta ao foco ou ao montar novamente */
export function useRefreshOnFocus(refetch: () => void, enabled = true) {
  const refetchRef = useRef(refetch)

  useEffect(() => {
    refetchRef.current = refetch
  }, [refetch])

  useEffect(() => {
    if (!enabled) return

    const onFocus = () => refetchRef.current()
    window.addEventListener('focus', onFocus)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') onFocus()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled])
}
