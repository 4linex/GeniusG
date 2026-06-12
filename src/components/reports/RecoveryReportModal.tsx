import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { RecoveryReportDocument } from '@/components/reports/RecoveryReportDocument'
import { exportRecoveryReportFromData } from '@/lib/exportRecoveryPdf'
import { recoveryReportFilename, type RecoveryReportData } from '@/lib/recoveryReport'

interface RecoveryReportModalProps {
  open: boolean
  onClose: () => void
  data: RecoveryReportData | null
  loading?: boolean
}

export function RecoveryReportModal({ open, onClose, data, loading }: RecoveryReportModalProps) {
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setExportError(null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleExport = async () => {
    if (!data) return
    setExporting(true)
    setExportError(null)
    try {
      await exportRecoveryReportFromData(data, recoveryReportFilename(data))
    } catch (err) {
      console.error('Erro ao exportar PDF:', err)
      setExportError(
        err instanceof Error
          ? err.message
          : 'Não foi possível gerar o PDF. Tente novamente.',
      )
    } finally {
      setExporting(false)
    }
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-white">Prévia do relatório</h2>
            <p className="text-sm text-slate-400">
              {data?.kind === 'dashboard'
                ? 'Relatório geral consolidado do dashboard'
                : 'Layout de Recomposição de Aprendizagem'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              loading={exporting}
              disabled={!data || loading}
            >
              <Download size={16} />
              Baixar PDF
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        {exportError && (
          <p className="px-5 py-2 text-sm text-red-400 bg-red-500/10 border-b border-red-500/20">
            {exportError}
          </p>
        )}

        <div className="overflow-auto flex-1 p-4 bg-slate-800/50">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
            </div>
          ) : data ? (
            <div className="mx-auto shadow-xl">
              <RecoveryReportDocument data={data} />
            </div>
          ) : (
            <p className="text-slate-400 text-center py-16">Não foi possível gerar o relatório.</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
