import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { FieldWrapper } from '@/components/ui/FieldWrapper'
import {
  PICKER_HOURS,
  PICKER_MINUTES,
  PICKER_WEEKDAYS,
  formatMonthYear,
  formatPickerDisplay,
  getCalendarDays,
  isSameDay,
  isToday,
  pad2,
  parsePickerValue,
  toPickerValue,
} from '@/lib/datetimePicker'
import { cn } from '@/lib/utils'

interface DateTimePickerProps {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  className?: string
}

interface MenuPosition {
  top: number
  left: number
  width: number
  maxHeight: number
}

const VIEWPORT_PADDING = 8
const PANEL_GAP = 6
const ESTIMATED_PANEL_HEIGHT = 320

function mergeDateTime(base: Date, next: Date): string {
  const merged = new Date(
    next.getFullYear(),
    next.getMonth(),
    next.getDate(),
    base.getHours(),
    base.getMinutes(),
    0,
    0,
  )
  return toPickerValue(merged)
}

export function DateTimePicker({
  label,
  value,
  onChange,
  placeholder = 'dd/mm/aaaa --:--',
  error,
  className,
}: DateTimePickerProps) {
  const autoId = useId()
  const fieldId = label ? label.toLowerCase().replace(/\s/g, '-') : autoId
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const hourListRef = useRef<HTMLDivElement>(null)
  const minuteListRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<MenuPosition>({
    top: 0,
    left: 0,
    width: 340,
    maxHeight: ESTIMATED_PANEL_HEIGHT,
  })

  const selected = parsePickerValue(value) ?? new Date()
  const [viewYear, setViewYear] = useState(selected.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected.getMonth())

  const display = formatPickerDisplay(value)

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current
    const panel = panelRef.current
    if (!button) return

    const rect = button.getBoundingClientRect()
    const panelWidth = Math.min(360, window.innerWidth - VIEWPORT_PADDING * 2)
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
    const parsed = parsePickerValue(value) ?? new Date()
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

  useEffect(() => {
    if (!open) return
    const hour = selected.getHours()
    const minute = selected.getMinutes()
    hourListRef.current
      ?.querySelector(`[data-hour="${hour}"]`)
      ?.scrollIntoView({ block: 'center' })
    minuteListRef.current
      ?.querySelector(`[data-minute="${minute}"]`)
      ?.scrollIntoView({ block: 'center' })
  }, [open, selected])

  const commitTime = (hour: number, minute: number) => {
    const base = parsePickerValue(value) ?? new Date()
    const next = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour, minute, 0, 0)
    onChange(toPickerValue(next))
  }

  const commitDay = (day: Date) => {
    const base = parsePickerValue(value) ?? new Date()
    onChange(mergeDateTime(base, day))
  }

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  const calendarDays = getCalendarDays(viewYear, viewMonth)
  const activeDate = parsePickerValue(value)

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
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-0">
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
                  onClick={() => onChange('')}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={() => onChange(toPickerValue(new Date()))}
                  className="text-xs text-primary-300 hover:text-primary-200 transition-colors"
                >
                  Hoje
                </button>
              </div>
            </div>

            <div className="sm:w-[108px] shrink-0 border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2 text-center">
                Horário
              </p>
              <div className="flex gap-1.5">
                <div
                  ref={hourListRef}
                  className="flex-1 max-h-40 overflow-y-auto scrollbar-app rounded-lg bg-white/[0.03] border border-white/5"
                >
                  {PICKER_HOURS.map((hour) => {
                    const isActive = activeDate?.getHours() === hour
                    return (
                      <button
                        key={hour}
                        type="button"
                        data-hour={hour}
                        onClick={() => commitTime(hour, activeDate?.getMinutes() ?? 0)}
                        className={cn(
                          'w-full py-1.5 text-sm font-mono transition-colors',
                          isActive
                            ? 'bg-primary-500/25 text-primary-200 font-semibold'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white',
                        )}
                      >
                        {pad2(hour)}
                      </button>
                    )
                  })}
                </div>
                <div
                  ref={minuteListRef}
                  className="flex-1 max-h-40 overflow-y-auto scrollbar-app rounded-lg bg-white/[0.03] border border-white/5"
                >
                  {PICKER_MINUTES.map((minute) => {
                    const isActive = activeDate?.getMinutes() === minute
                    return (
                      <button
                        key={minute}
                        type="button"
                        data-minute={minute}
                        onClick={() => commitTime(activeDate?.getHours() ?? 0, minute)}
                        className={cn(
                          'w-full py-1.5 text-sm font-mono transition-colors',
                          isActive
                            ? 'bg-primary-500/25 text-primary-200 font-semibold'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white',
                        )}
                      >
                        {pad2(minute)}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
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
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'w-full flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 text-left',
            'px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors',
            error && 'border-red-500',
          )}
        >
          <span className={cn('truncate', !display && 'text-slate-500')}>
            {display || placeholder}
          </span>
          <span className="flex items-center gap-1 shrink-0 text-slate-500">
            <Calendar size={15} />
            <ChevronDown
              size={15}
              className={cn('transition-transform', open && 'rotate-180')}
            />
          </span>
        </button>
        {panel}
      </div>
    </FieldWrapper>
  )
}
