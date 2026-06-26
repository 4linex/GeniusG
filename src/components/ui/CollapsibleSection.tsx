import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  className?: string
  contentClassName?: string
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  className,
  contentClassName,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={cn('border-b border-white/10 last:border-b-0', className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
        aria-expanded={open}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <ChevronDown
          size={16}
          className={cn('shrink-0 text-slate-500 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && <div className={cn('px-4 pb-4', contentClassName)}>{children}</div>}
    </div>
  )
}
