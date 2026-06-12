import { useState, useEffect } from 'react'
import { TabBar } from '@/components/ui/TabBar'
import { Button } from '@/components/ui/Button'
import { ProfessorTrailPanel } from '@/components/trails/ProfessorTrailPanel'
import { StudentTrailPreview } from '@/components/trails/StudentTrailPreview'
import type { LearningTrail } from '@/types/database'
import { TRAIL_AREA_TABS, type TrailAreaTab } from '@/lib/trailAreas'
import { X } from 'lucide-react'

interface TrailBankDetailProps {
  trail: LearningTrail
  open: boolean
  onClose: () => void
  initialTab?: TrailAreaTab
}

export function TrailBankDetail({ trail, open, onClose, initialTab = 'professor' }: TrailBankDetailProps) {
  const [tab, setTab] = useState<TrailAreaTab>(initialTab)

  useEffect(() => {
    if (open) setTab(initialTab)
  }, [open, initialTab, trail.id])

  if (!open) return null

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
            <h2 className="text-lg font-semibold text-white truncate">{trail.title}</h2>
            <p className="text-sm text-slate-400 mt-0.5">Banco de trilhas</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </Button>
        </div>

        <div className="px-5 pt-4 shrink-0">
          <TabBar items={TRAIL_AREA_TABS} active={tab} onChange={setTab} />
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'professor' ? (
            <ProfessorTrailPanel trail={trail} onViewStudent={() => setTab('aluno')} />
          ) : (
            <StudentTrailPreview trail={trail} />
          )}
        </div>
      </div>
    </div>
  )
}
