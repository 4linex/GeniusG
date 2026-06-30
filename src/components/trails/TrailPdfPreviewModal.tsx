import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, ExternalLink, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { TrailAreaToggle } from '@/components/trails/TrailAreaToggle'
import type { TrailAreaTab } from '@/lib/trailAreas'
import {
  getProfessorTrailLinkUrl,
  getProfessorTrailPdfUrl,
  getStudentTrailLinkUrl,
  getStudentTrailPdfUrl,
} from '@/lib/trailAreas'
import type { LearningTrail } from '@/types/database'

interface TrailPdfPreviewModalProps {
  open: boolean
  onClose: () => void
  title: string
  trail?: LearningTrail | null
  professorPdfUrl?: string | null
  studentPdfUrl?: string | null
}

function fileNameFromUrl(url: string, title: string, suffix: string): string {
  try {
    const path = new URL(url).pathname
    const base = path.split('/').pop()
    if (base?.toLowerCase().endsWith('.pdf')) return base
  } catch {
    // URL relativa ou inválida — usa título
  }
  const safe = title.replace(/[^\w\s-áàâãéêíóôõúç]/gi, '').trim().slice(0, 48)
  return `${safe || 'trilha'}-${suffix}.pdf`
}

export function TrailPdfPreviewModal({
  open,
  onClose,
  title,
  trail,
  professorPdfUrl,
  studentPdfUrl,
}: TrailPdfPreviewModalProps) {
  const professorPdf = professorPdfUrl ?? getProfessorTrailPdfUrl(trail)
  const studentPdf = studentPdfUrl ?? getStudentTrailPdfUrl(trail)
  const professorLink = getProfessorTrailLinkUrl(trail)
  const studentLink = getStudentTrailLinkUrl(trail)

  const defaultTab = useMemo((): TrailAreaTab => {
    if (professorPdf || professorLink) return 'professor'
    return 'aluno'
  }, [professorPdf, professorLink])

  const [tab, setTab] = useState<TrailAreaTab>(defaultTab)

  useEffect(() => {
    if (open) setTab(defaultTab)
  }, [open, defaultTab])

  useEffect(() => {
    if (!open) return
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

  const isProfessor = tab === 'professor'
  const activePdf = isProfessor ? professorPdf : studentPdf
  const activeLink = isProfessor ? professorLink : studentLink
  const hasProfessor = Boolean(professorPdf || professorLink)
  const hasStudent = Boolean(studentPdf || studentLink)

  const downloadName = activePdf
    ? fileNameFromUrl(activePdf, title, isProfessor ? 'professor' : 'aluno')
    : undefined

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        className="relative flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-slate-900 shadow-2xl sm:rounded-2xl sm:h-[88vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trail-pdf-modal-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5">
          <div className="min-w-0 pr-8">
            <h2 id="trail-pdf-modal-title" className="text-lg font-semibold text-white truncate">
              {title}
            </h2>
            <p className="mt-0.5 text-sm text-slate-400">Pré-visualização do material da trilha</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="shrink-0 border-b border-white/10 px-4 py-3 sm:px-5">
          <TrailAreaToggle value={tab} onChange={setTab} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {activePdf ? (
            <iframe
              title={`PDF ${isProfessor ? 'professor' : 'aluno'} — ${title}`}
              src={`${activePdf}#toolbar=1`}
              className="min-h-0 flex-1 w-full bg-slate-950"
            />
          ) : activeLink ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="text-sm text-slate-400">
                Esta trilha usa um link online em vez de PDF na área do{' '}
                {isProfessor ? 'professor' : 'aluno'}.
              </p>
              <a
                href={activeLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-400"
              >
                <ExternalLink size={16} />
                Abrir recurso
              </a>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center">
              <p className="text-sm text-slate-500">
                Nenhum PDF cadastrado para a área do {isProfessor ? 'professor' : 'aluno'} nesta
                trilha. Edite o banco de trilhas para adicionar o material.
              </p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-slate-900/95 px-4 py-3 sm:px-5">
          <p className="text-xs text-slate-500">
            {!hasProfessor && !hasStudent
              ? 'Sem materiais disponíveis'
              : tab === 'professor'
                ? hasProfessor
                  ? 'Material pedagógico para o professor'
                  : 'PDF do professor não cadastrado'
                : hasStudent
                  ? 'Material para o aluno'
                  : 'PDF do aluno não cadastrado'}
          </p>
          <div className="flex flex-wrap gap-2">
            {activePdf && (
              <>
                <a
                  href={activePdf}
                  download={downloadName}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex"
                >
                  <Button variant="secondary" size="sm" type="button">
                    <Download size={14} />
                    Baixar PDF
                  </Button>
                </a>
                <a href={activePdf} target="_blank" rel="noreferrer" className="inline-flex">
                  <Button variant="ghost" size="sm" type="button">
                    <ExternalLink size={14} />
                    Abrir em nova aba
                  </Button>
                </a>
              </>
            )}
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
