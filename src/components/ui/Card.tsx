import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
}

export function Card({ children, className, hover }: CardProps) {
  return (
    <div className={cn('glass rounded-2xl p-4 sm:p-6', hover && 'card-hover', className)}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  belowDescription?: ReactNode
}

export function CardHeader({ title, description, action, belowDescription }: CardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
        {belowDescription && <div className="mt-4">{belowDescription}</div>}
      </div>
      {action && <div className="flex flex-wrap gap-2 shrink-0">{action}</div>}
    </div>
  )
}
