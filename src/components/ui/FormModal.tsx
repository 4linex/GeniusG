import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function FormModal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: FormModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Fechar"
      />
      <div
        className={cn(
          'relative w-full max-w-md glass rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto',
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-modal-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        <div className="mb-5 pr-8">
          <h3 id="form-modal-title" className="text-lg font-semibold text-white">
            {title}
          </h3>
          {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
        </div>

        {children}
      </div>
    </div>
  )
}
