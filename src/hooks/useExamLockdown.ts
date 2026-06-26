import { useCallback, useEffect, useState } from 'react'

export async function requestExamFullscreen(): Promise<boolean> {
  try {
    if (document.fullscreenElement) return true
    await document.documentElement.requestFullscreen()
    return Boolean(document.fullscreenElement)
  } catch {
    return false
  }
}

export function useExamLockdown(active: boolean) {
  const [obscured, setObscured] = useState(false)
  const [needsFullscreen, setNeedsFullscreen] = useState(false)

  const checkFullscreen = useCallback(() => {
    const inFullscreen = Boolean(document.fullscreenElement)
    setNeedsFullscreen(!inFullscreen)
    if (!inFullscreen && active) {
      setObscured(true)
    }
    return inFullscreen
  }, [active])

  const enterFullscreen = useCallback(async () => {
    const ok = await requestExamFullscreen()
    if (ok) {
      setNeedsFullscreen(false)
      if (!document.hidden) setObscured(false)
    }
    return ok
  }, [])

  useEffect(() => {
    if (!active) return

    const handleVisibility = () => {
      if (document.hidden) {
        setObscured(true)
      } else if (document.fullscreenElement) {
        setObscured(false)
      } else {
        setObscured(true)
        setNeedsFullscreen(true)
      }
    }

    const handleFullscreen = () => {
      if (!document.fullscreenElement) {
        setObscured(true)
        setNeedsFullscreen(true)
      } else if (!document.hidden) {
        setObscured(false)
        setNeedsFullscreen(false)
      }
    }

    const preventClipboard = (e: ClipboardEvent) => e.preventDefault()
    const preventContextMenu = (e: Event) => e.preventDefault()

    document.addEventListener('visibilitychange', handleVisibility)
    document.addEventListener('fullscreenchange', handleFullscreen)
    document.addEventListener('copy', preventClipboard)
    document.addEventListener('cut', preventClipboard)
    document.addEventListener('paste', preventClipboard)
    document.addEventListener('contextmenu', preventContextMenu)

    checkFullscreen()
    void enterFullscreen()

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      document.removeEventListener('fullscreenchange', handleFullscreen)
      document.removeEventListener('copy', preventClipboard)
      document.removeEventListener('cut', preventClipboard)
      document.removeEventListener('paste', preventClipboard)
      document.removeEventListener('contextmenu', preventContextMenu)

      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {})
      }
    }
  }, [active, checkFullscreen, enterFullscreen])

  return { obscured, needsFullscreen, enterFullscreen }
}
