import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { FileBarChart, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import type { ReportFilters } from '@/lib/reportAnalytics'

interface StudentReportPickerModalProps {
  open: boolean
  onClose: () => void
  onGenerate: (filters: Pick<ReportFilters, 'dateFrom' | 'dateTo'>) => void
  generating?: boolean
  studentName?: string
}

export function StudentReportPickerModal({
  open,
  onClose,
  onGenerate,
  generating,
  studentName,
}: StudentReportPickerModalProps) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    if (!open) return
    setDateFrom('')
    setDateTo('')
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 overscroll-contain">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className="relative flex w-full max-w-md max-h-[min(90dvh,calc(100vh-2rem))] flex-col rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Relatório geral do aluno</h2>
              <p className="text-sm text-slate-400">
                {studentName ? `${studentName} — ` : ''}
                déficits, destaques, ranking por formulário e trilhas
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5 scrollbar-app">
            <p className="text-xs text-slate-500">
              Opcional: limite o período das avaliações incluídas no relatório.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <DatePicker
                label="Período (de)"
                size="sm"
                value={dateFrom}
                onChange={setDateFrom}
              />
              <DatePicker
                label="Período (até)"
                size="sm"
                value={dateTo}
                onChange={setDateTo}
              />
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-white/10 px-5 py-4">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() =>
                onGenerate({
                  dateFrom: dateFrom || undefined,
                  dateTo: dateTo || undefined,
                })
              }
              loading={generating}
            >
              <FileBarChart size={16} />
              Gerar relatório
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
