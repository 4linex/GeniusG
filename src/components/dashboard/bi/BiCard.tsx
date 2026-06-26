import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface BiCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
}

export function BiCard({ children, className, hover = false }: BiCardProps) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-lg shadow-black/20 sm:p-5',
        hover && 'transition-all duration-300 hover:border-white/20 hover:shadow-xl hover:shadow-primary-500/5',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface BiSectionHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function BiSectionHeader({ title, subtitle, action }: BiSectionHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-[13px] leading-relaxed text-slate-400">{subtitle}</p>}
      </div>
      {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
    </div>
  )
}
