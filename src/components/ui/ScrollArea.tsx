import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ScrollAreaProps {
  children: ReactNode
  className?: string
  axis?: 'y' | 'x' | 'both'
}

export function ScrollArea({ children, className, axis = 'y' }: ScrollAreaProps) {
  return (
    <div
      className={cn(
        'scrollbar-app',
        axis === 'y' && 'overflow-y-auto overflow-x-hidden',
        axis === 'x' && 'overflow-x-auto overflow-y-hidden',
        axis === 'both' && 'overflow-auto',
        className,
      )}
    >
      {children}
    </div>
  )
}
