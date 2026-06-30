import { useState } from 'react'
import { FileText, Map } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { TrailPdfPreviewModal } from '@/components/trails/TrailPdfPreviewModal'
import {
  getProfessorTrailLinkUrl,
  getProfessorTrailPdfUrl,
  getStudentTrailLinkUrl,
  getStudentTrailPdfUrl,
} from '@/lib/trailAreas'
import type { LearningTrail } from '@/types/database'

interface RecommendedTrailHighlightProps {
  title: string
  percentRange: string | null
  trail: LearningTrail | null
  professorPdfUrl?: string | null
  studentPdfUrl?: string | null
  /** @deprecated use professorPdfUrl */
  pdfUrl?: string | null
  /** Abre modal com PDFs do aluno e do professor */
  enablePdfPreview?: boolean
  studentPercent?: number | null
  matchPercent?: number | null
  classificationLabel?: string | null
  weightedScoreLabel?: string | null
  safetyRuleApplied?: boolean
}

export function RecommendedTrailHighlight({
  title,
  percentRange,
  trail,
  professorPdfUrl: professorPdfProp,
  studentPdfUrl: studentPdfProp,
  pdfUrl: legacyPdfUrl,
  enablePdfPreview = false,
  studentPercent,
  matchPercent,
  classificationLabel,
  weightedScoreLabel,
  safetyRuleApplied,
}: RecommendedTrailHighlightProps) {
  const [previewOpen, setPreviewOpen] = useState(false)

  const professorPdf =
    professorPdfProp ?? legacyPdfUrl ?? getProfessorTrailPdfUrl(trail)
  const studentPdf =
    studentPdfProp ?? getStudentTrailPdfUrl(trail)
  const professorLink = getProfessorTrailLinkUrl(trail)
  const studentLink = getStudentTrailLinkUrl(trail)

  const hasPreviewMaterial = Boolean(
    professorPdf || studentPdf || professorLink || studentLink,
  )
  const openUrl = professorPdf ?? studentPdf ?? professorLink ?? studentLink

  const inner = (
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-500/40 ring-1 ring-primary-300/30">
        <Map size={22} className="text-primary-100" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-widest text-primary-200">
          Trilha recomendada
        </p>
        <h3 className="mt-1.5 text-xl font-bold leading-snug text-white sm:text-2xl">{title}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {classificationLabel && <Badge variant="warning">{classificationLabel}</Badge>}
          {weightedScoreLabel && <Badge variant="default">{weightedScoreLabel}</Badge>}
          {percentRange && <Badge variant="default">{percentRange}</Badge>}
          {studentPercent != null && (
            <Badge variant="info">{studentPercent.toFixed(1)}% TCT simples</Badge>
          )}
          {matchPercent != null &&
            (studentPercent == null || Math.abs(matchPercent - studentPercent) >= 0.5) && (
              <Badge variant="info">Pontuação ponderada: {matchPercent.toFixed(1)}%</Badge>
            )}
          {safetyRuleApplied && (
            <Badge variant="warning">Regra de segurança (itens fáceis)</Badge>
          )}
        </div>
        {enablePdfPreview && hasPreviewMaterial && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary-200/90">
            <FileText size={14} />
            Clique para ver o PDF (aluno ou professor)
          </p>
        )}
        {!enablePdfPreview && openUrl && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary-200/90">
            <FileText size={14} />
            Clique para abrir o PDF da trilha
          </p>
        )}
      </div>
    </div>
  )

  const cardClassName =
    'rounded-2xl border-2 border-primary-500/45 bg-gradient-to-br from-primary-500/30 via-primary-600/15 to-primary-900/10 p-5 ring-2 ring-primary-500/25 shadow-lg shadow-primary-500/10 transition-all'

  const interactiveClass = `${cardClassName} block w-full text-left cursor-pointer hover:border-primary-400/70 hover:shadow-primary-500/20 hover:ring-primary-400/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400`

  const modal = (
    <TrailPdfPreviewModal
      open={previewOpen}
      onClose={() => setPreviewOpen(false)}
      title={title}
      trail={trail}
      professorPdfUrl={professorPdf}
      studentPdfUrl={studentPdf}
    />
  )

  if (enablePdfPreview && hasPreviewMaterial) {
    return (
      <>
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className={interactiveClass}
          aria-label={`Ver PDFs da trilha ${title}`}
        >
          {inner}
        </button>
        {modal}
      </>
    )
  }

  if (openUrl) {
    return (
      <a
        href={openUrl}
        target="_blank"
        rel="noreferrer"
        className={interactiveClass}
        aria-label={`Abrir trilha ${title}`}
      >
        {inner}
      </a>
    )
  }

  return <div className={cardClassName}>{inner}</div>
}
