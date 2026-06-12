import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ConfirmDeleteModalProps {
  open: boolean
  title: string
  description: string
  itemName?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDeleteModal({
  open,
  title,
  description,
  itemName,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-md glass rounded-2xl p-6 shadow-xl">
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4 mb-5">
          <div className="p-3 rounded-xl bg-red-500/15 text-red-400">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-slate-400 mt-1">{description}</p>
            {itemName && (
              <p className="text-sm font-medium text-white mt-2">{itemName}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            Excluir
          </Button>
        </div>
      </div>
    </div>
  )
}
