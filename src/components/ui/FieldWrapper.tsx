import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FieldWrapperProps {
  label?: string
  error?: string
  id?: string
  className?: string
  children: ReactNode
}

export function FieldWrapper({ label, error, id, className, children }: FieldWrapperProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
