import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

const STORAGE_KEY = 'rda-sidebar-collapsed'

interface SidebarContextValue {
  collapsed: boolean
  setCollapsed: (value: boolean) => void
  toggle: () => void
  mobileOpen: boolean
  setMobileOpen: (value: boolean) => void
  closeMobile: () => void
  widthClass: string
  offsetClass: string
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved !== 'false'
  })
  const [mobileOpen, setMobileOpenState] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [collapsed])

  const setCollapsed = (value: boolean) => setCollapsedState(value)
  const toggle = () => setCollapsedState((prev) => !prev)
  const setMobileOpen = (value: boolean) => setMobileOpenState(value)
  const closeMobile = () => setMobileOpenState(false)

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        setCollapsed,
        toggle,
        mobileOpen,
        setMobileOpen,
        closeMobile,
        widthClass: collapsed ? 'w-[4.25rem]' : 'w-64',
        offsetClass: collapsed ? 'left-[4.25rem]' : 'left-64',
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar deve ser usado dentro de SidebarProvider')
  return ctx
}
