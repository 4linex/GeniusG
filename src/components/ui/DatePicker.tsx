import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { FieldWrapper } from '@/components/ui/FieldWrapper'
import {
  PICKER_WEEKDAYS,
  formatDateDisplay,
  formatMonthYear,
  getCalendarDays,
  isSameDay,
  isToday,
  parseDateValue,
  toDateValue,
} from '@/lib/datetimePicker'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  className?: string
  size?: 'default' | 'sm'
  disabled?: boolean
}

interface MenuPosition {
  top: number
  left: number
  width: number
  maxHeight: number
}

const VIEWPORT_PADDING = 8
const PANEL_GAP = 6
const ESTIMATED_PANEL_HEIGHT = 300

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = 'dd/mm/aaaa',
  error,
  className,
  size = 'default',
  disabled,
}: DatePickerProps) {
  const autoId = useId()
  const fieldId = label ? label.toLowerCase().replace(/\s/g, '-') : autoId
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<MenuPosition>({
    top: 0,
    left: 0,
    width: 300,
    maxHeight: ESTIMATED_PANEL_HEIGHT,
  })

  const selected = parseDateValue(value) ?? new Date()
  const [viewYear, setViewYear] = useState(selected.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected.getMonth())

  const display = formatDateDisplay(value)

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current
    const panel = panelRef.current
    if (!button) return

    const rect = button.getBoundingClientRect()
    const panelWidth = Math.min(300, window.innerWidth - VIEWPORT_PADDING * 2)
    const left = Math.max(
      VIEWPORT_PADDING,
      Math.min(rect.left, window.innerWidth - panelWidth - VIEWPORT_PADDING),
    )

    const panelHeight = panel?.getBoundingClientRect().height || ESTIMATED_PANEL_HEIGHT
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING
    const spaceAbove = rect.top - VIEWPORT_PADDING
    const openBelow = spaceBelow >= panelHeight || spaceBelow >= spaceAbove
    const maxHeight = Math.max(200, (openBelow ? spaceBelow : spaceAbove) - PANEL_GAP)

    let top: number
    if (openBelow) {
      top = rect.bottom + PANEL_GAP
    } else {
      const visibleHeight = Math.min(panelHeight, maxHeight)
      top = Math.max(VIEWPORT_PADDING, rect.top - visibleHeight - PANEL_GAP)
    }

    setMenuPos({
      top,
      left,
      width: Math.max(rect.width, panelWidth),
      maxHeight,
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    const parsed = parseDateValue(value) ?? new Date()
    setViewYear(parsed.getFullYear())
    setViewMonth(parsed.getMonth())
    updateMenuPosition()
    const frame = requestAnimationFrame(updateMenuPosition)
    return () => cancelAnimationFrame(frame)
  }, [open, value, updateMenuPosition])

  useLayoutEffect(() => {
    if (!open) return
    updateMenuPosition()
  }, [open, viewYear, viewMonth, updateMenuPosition])

  useEffect(() => {
    if (!open) return
    const onScrollOrResize = () => updateMenuPosition()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open, updateMenuPosition])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return
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

  const commitDay = (day: Date) => {
    onChange(toDateValue(day))
    setOpen(false)
  }

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  const calendarDays = getCalendarDays(viewYear, viewMonth)
  const activeDate = parseDateValue(value)

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            width: menuPos.width,
            maxHeight: menuPos.maxHeight,
            zIndex: 10050,
            overflowY: 'auto',
          }}
          className={cn(
            'rounded-xl border border-white/10',
            'bg-slate-900/95 backdrop-blur-xl shadow-xl shadow-black/40',
            'p-3 scrollbar-app',
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-white capitalize">
              {formatMonthYear(viewYear, viewMonth)}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Próximo mês"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {PICKER_WEEKDAYS.map((day, i) => (
              <span
                key={`${day}-${i}`}
                className="text-center text-[10px] font-semibold text-slate-500 py-1"
              >
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              if (!day) {
                return <span key={`empty-${index}`} className="h-8" />
              }

              const selectedDay = activeDate && isSameDay(day, activeDate)
              const today = isToday(day)

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => commitDay(day)}
                  className={cn(
                    'h-8 w-full rounded-lg text-sm transition-colors',
                    selectedDay
                      ? 'bg-primary-500 text-white font-semibold'
                      : today
                        ? 'text-primary-300 bg-primary-500/15 hover:bg-primary-500/25'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white',
                  )}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => commitDay(new Date())}
              className="text-xs text-primary-300 hover:text-primary-200 transition-colors"
            >
              Hoje
            </button>
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <FieldWrapper label={label} error={error} id={fieldId} className={className}>
      <div ref={rootRef} className="relative">
        <button
          ref={buttonRef}
          type="button"
          id={fieldId}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={cn(
            'w-full flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 text-left',
            'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors',
            size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm',
            disabled && 'cursor-not-allowed opacity-50',
            error && 'border-red-500',
          )}
        >
          <span className={cn('truncate', !display && 'text-slate-500')}>
            {display || placeholder}
          </span>
          <span className="flex items-center gap-1 shrink-0 text-slate-500">
            <Calendar size={size === 'sm' ? 14 : 15} />
            <ChevronDown
              size={size === 'sm' ? 14 : 15}
              className={cn('transition-transform', open && 'rotate-180')}
            />
          </span>
        </button>
        {panel}
      </div>
    </FieldWrapper>
  )
}
