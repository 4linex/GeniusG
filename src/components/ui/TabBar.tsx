import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/ScrollArea'

export interface TabBarItem<T extends string = string> {
  id: T
  label: string
  icon?: React.ReactNode
}

interface TabBarProps<T extends string = string> {
  items: TabBarItem<T>[]
  active: T
  onChange: (id: T) => void
  className?: string
  variant?: 'pill' | 'underline'
}

export function TabBar<T extends string>({
  items,
  active,
  onChange,
  className,
  variant = 'pill',
}: TabBarProps<T>) {
  return (
    <ScrollArea axis="x" className={cn('-mx-1 px-1', className)}>
      <div className="flex gap-2 min-w-max pb-0.5">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap text-sm transition-colors shrink-0',
              variant === 'pill' &&
                cn(
                  'px-4 py-2 rounded-xl',
                  active === item.id
                    ? 'bg-primary-500/20 text-primary-300 font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-white/5',
                ),
              variant === 'underline' &&
                cn(
                  'px-3 py-2 rounded-lg border-b-2 -mb-px',
                  active === item.id
                    ? 'border-primary-400 text-white font-medium'
                    : 'border-transparent text-slate-400 hover:text-white',
                ),
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </ScrollArea>
  )
}
