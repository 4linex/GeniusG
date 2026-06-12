import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageShellProps {
  children: ReactNode
  className?: string
  /** Largura máxima do conteúdo */
  width?: 'md' | 'lg' | 'xl' | 'full'
}

const WIDTH: Record<NonNullable<PageShellProps['width']>, string> = {
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  xl: 'max-w-7xl',
  full: 'max-w-none',
}

export function PageShell({ children, className, width = 'xl' }: PageShellProps) {
  return (
    <div className={cn('w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8', WIDTH[width], className)}>
      {children}
    </div>
  )
}
