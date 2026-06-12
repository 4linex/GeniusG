import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { FormTrailConfig, LearningTrail } from '@/types/database'
import {
  createFormTrailAssignment,
  enrichFormTrailConfig,
  formatPercentRange,
} from '@/lib/formTrails'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Plus, Trash2, ExternalLink, FileText } from 'lucide-react'

interface FormTrailsPanelProps {
  trails: FormTrailConfig[]
  onChange: (trails: FormTrailConfig[]) => void
}

export function FormTrailsPanel({ trails, onChange }: FormTrailsPanelProps) {
  const [bankTrails, setBankTrails] = useState<LearningTrail[]>([])
  const [loadingBank, setLoadingBank] = useState(true)

  useEffect(() => {
    supabase
      .from('learning_trails')
      .select('id, title, description, pdf_url, link_url')
      .order('title')
      .then(({ data }) => {
        setBankTrails((data as LearningTrail[]) || [])
        setLoadingBank(false)
      })
  }, [])

  const bankMap = new Map(bankTrails.map((t) => [t.id, t]))
  const usedIds = new Set(trails.map((t) => t.learningTrailId).filter(Boolean))

  const patchTrail = (localId: string, partial: Partial<FormTrailConfig>) => {
    onChange(
      trails.map((t) => {
        if (t.localId !== localId) return t
        const next = { ...t, ...partial }
        if (partial.learningTrailId) {
          return enrichFormTrailConfig(next, bankMap.get(partial.learningTrailId))
        }
        return next
      }),
    )
  }

  const removeTrail = (localId: string) => {
    onChange(trails.filter((t) => t.localId !== localId))
  }

  const addTrail = () => {
    const available = bankTrails.find((t) => !usedIds.has(t.id))
    if (!available) return
    onChange([...trails, enrichFormTrailConfig(createFormTrailAssignment(available.id), available)])
  }

  const trailOptions = bankTrails.map((t) => ({
    value: t.id,
    label: t.title,
  }))

  return (
    <ScrollArea className="flex-1 p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white mb-2">Trilhas do formulário</h2>
          <p className="text-sm text-slate-400 max-w-xl">
            Escolha trilhas do{' '}
            <strong className="text-slate-300">banco de trilhas</strong> e defina a faixa de{' '}
            <strong className="text-slate-300">% de acerto</strong> em que cada uma será entregue
            ao aluno.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={addTrail}
          disabled={loadingBank || bankTrails.length === 0 || usedIds.size >= bankTrails.length}
        >
          <Plus size={16} />
          Adicionar trilha
        </Button>
      </div>

      {loadingBank ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
        </div>
      ) : trails.length > 0 ? (
        <div className="space-y-6">
          {trails.map((trail, index) => (
            <section
              key={trail.localId}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Regra {index + 1}
                  </span>
                  {trail.title && (
                    <Badge variant="info">{trail.title}</Badge>
                  )}
                  <Badge variant="warning">
                    {formatPercentRange(trail.minPercent, trail.maxPercent)}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-400">
                    <input
                      type="checkbox"
                      checked={trail.enabled}
                      onChange={(e) => patchTrail(trail.localId, { enabled: e.target.checked })}
                      className="accent-teal-500"
                    />
                    Ativa
                  </label>
                  <button
                    type="button"
                    onClick={() => removeTrail(trail.localId)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                    title="Remover"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <Select
                label="Trilha do banco"
                value={trail.learningTrailId}
                onChange={(e) => patchTrail(trail.localId, { learningTrailId: e.target.value })}
                options={trailOptions.filter(
                  (o) => o.value === trail.learningTrailId || !usedIds.has(o.value),
                )}
                disabled={!trail.enabled}
              />

              {trail.description && (
                <p className="text-sm text-slate-400">{trail.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Percentual mínimo de acerto (%)"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={String(trail.minPercent)}
                  onChange={(e) =>
                    patchTrail(trail.localId, { minPercent: parseFloat(e.target.value) || 0 })
                  }
                  disabled={!trail.enabled}
                />
                <Input
                  label="Percentual máximo de acerto (%)"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={String(trail.maxPercent)}
                  onChange={(e) =>
                    patchTrail(trail.localId, { maxPercent: parseFloat(e.target.value) || 0 })
                  }
                  disabled={!trail.enabled}
                />
              </div>

              {(trail.pdfUrl || trail.linkUrl) && (
                <div className="flex flex-wrap gap-3">
                  {trail.pdfUrl && (
                    <a
                      href={trail.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-teal-400 hover:text-teal-300"
                    >
                      <FileText size={14} />
                      Ver PDF
                    </a>
                  )}
                  {trail.linkUrl && (
                    <a
                      href={trail.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-teal-400 hover:text-teal-300"
                    >
                      <ExternalLink size={14} />
                      Ver link
                    </a>
                  )}
                </div>
              )}
            </section>
          ))}
        </div>
      ) : null}
    </ScrollArea>
  )
}
