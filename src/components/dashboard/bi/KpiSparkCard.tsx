import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { BiCard } from '@/components/dashboard/bi/BiCard'
import { cn } from '@/lib/utils'

interface KpiSparkCardProps {
  title: string
  value: string
  sub: string
  icon: LucideIcon
  iconClassName: string
  sparkColor?: string
  sparkData?: number[]
  to?: string
}

export function KpiSparkCard({
  title,
  value,
  sub,
  icon: Icon,
  iconClassName,
  to,
}: KpiSparkCardProps) {
  const content = (
    <BiCard className={cn('h-full min-w-0', to && 'cursor-pointer')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 sm:text-[13px]">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">{value}</p>
          <p className="mt-1 line-clamp-2 text-[12px] text-slate-500 sm:text-[13px]">{sub}</p>
        </div>
        <div className={cn('shrink-0 rounded-2xl p-2.5 sm:p-3', iconClassName)}>
          <Icon size={20} className="sm:hidden" />
          <Icon size={22} className="hidden sm:block" />
        </div>
      </div>
    </BiCard>
  )

  if (to) {
    return (
      <Link to={to} className="block h-full min-w-0">
        {content}
      </Link>
    )
  }

  return content
}
