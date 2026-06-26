import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FieldWrapper } from '@/components/ui/FieldWrapper'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value'> {
  label?: string
  error?: string
  options: SelectOption[]
  value?: string
  onChange?: (e: { target: { value: string } }) => void
  placeholder?: string
  size?: 'default' | 'sm'
  required?: boolean
}

interface MenuPosition {
  top: number
  left: number
  width: number
}

export function Select({
  label,
  error,
  options,
  className,
  id,
  value = '',
  onChange,
  disabled,
  placeholder = 'Selecione...',
  size = 'default',
  required,
  ...props
}: SelectProps) {
  const autoId = useId()
  const selectId = id || (label ? label.toLowerCase().replace(/\s/g, '-') : autoId)
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<MenuPosition>({ top: 0, left: 0, width: 0 })
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = options.find((o) => o.value === value)
  const displayLabel = selected?.label || (value ? value : placeholder)

  const updateMenuPosition = () => {
    const button = buttonRef.current
    if (!button) return
    const rect = button.getBoundingClientRect()
    setMenuPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    })
  }

  useEffect(() => {
    if (!open) return
    updateMenuPosition()

    const onScrollOrResize = () => updateMenuPosition()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)

    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target) || listRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const pick = (next: string) => {
    onChange?.({ target: { value: next } })
    setOpen(false)
  }

  const menu = open
    ? createPortal(
        <ul
          ref={listRef}
          role="listbox"
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            width: menuPos.width,
            zIndex: 9999,
          }}
          className={cn(
            'rounded-xl border border-white/10',
            'bg-slate-900/95 backdrop-blur-xl shadow-xl shadow-black/40',
            'py-1 max-h-56 overflow-y-auto scrollbar-app',
          )}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <li key={opt.value || '__empty'} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => pick(opt.value)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors',
                    isSelected
                      ? 'bg-primary-500/15 text-primary-200'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white',
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={14} className="shrink-0 text-primary-400" />}
                </button>
              </li>
            )
          })}
        </ul>,
        document.body,
      )
    : null

  return (
    <FieldWrapper label={label} error={error} id={selectId} className={className}>
      <div ref={rootRef} className="relative">
        <button
          ref={buttonRef}
          type="button"
          id={selectId}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-required={required}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={cn(
            'w-full flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 text-left',
            'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            size === 'default' && 'px-4 py-2.5 text-sm',
            size === 'sm' && 'px-3 py-1.5 text-xs',
            error && 'border-red-500',
          )}
          {...props}
        >
          <span className={cn('truncate', !selected && 'text-slate-500')}>{displayLabel}</span>
          <ChevronDown
            size={size === 'sm' ? 14 : 16}
            className={cn('shrink-0 text-slate-500 transition-transform', open && 'rotate-180')}
          />
        </button>
        {menu}
      </div>
    </FieldWrapper>
  )
}
