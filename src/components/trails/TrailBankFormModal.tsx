import { TrailBankForm } from '@/components/trails/TrailBankForm'
import type { LearningTrail } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { X } from 'lucide-react'

interface TrailBankFormModalProps {
  open: boolean
  editingTrail?: LearningTrail | null
  userId?: string
  onSaved: () => void
  onClose: () => void
}

export function TrailBankFormModal({
  open,
  editingTrail,
  userId,
  onSaved,
  onClose,
}: TrailBankFormModalProps) {
  if (!open) return null

  const isEditing = Boolean(editingTrail)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-white/10 bg-slate-900 shadow-2xl flex flex-col">
        <div className="flex items-start justify-between gap-4 p-5 border-b border-white/10 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white">
              {isEditing ? 'Editar trilha' : 'Nova trilha'}
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Cadastre a área pedagógica do professor e o conteúdo entregue ao aluno.
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <TrailBankForm
            key={editingTrail?.id ?? 'new'}
            editingTrail={editingTrail}
            userId={userId}
            onSaved={onSaved}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  )
}
