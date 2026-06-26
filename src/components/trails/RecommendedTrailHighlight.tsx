import { ExternalLink, FileText, Map } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { LearningTrail } from '@/types/database'

interface RecommendedTrailHighlightProps {
  title: string
  percentRange: string | null
  trail: LearningTrail | null
  studentPercent?: number | null
}

export function RecommendedTrailHighlight({
  title,
  percentRange,
  trail,
  studentPercent,
}: RecommendedTrailHighlightProps) {
  return (
    <div className="rounded-2xl border-2 border-primary-500/45 bg-gradient-to-br from-primary-500/30 via-primary-600/15 to-primary-900/10 p-5 ring-2 ring-primary-500/25 shadow-lg shadow-primary-500/10">
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
            {percentRange && <Badge variant="default">{percentRange}</Badge>}
            {studentPercent != null && (
              <Badge variant="info">{studentPercent.toFixed(1)}% de acerto do aluno</Badge>
            )}
          </div>
          {(trail?.pedagogical_pdf_url || trail?.pedagogical_link_url) && (
            <div className="mt-4 flex flex-wrap gap-3">
              {trail.pedagogical_pdf_url && (
                <a
                  href={trail.pedagogical_pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-500/30 transition-colors hover:bg-primary-400"
                >
                  <FileText size={16} />
                  PDF pedagógico
                </a>
              )}
              {trail.pedagogical_link_url && (
                <a
                  href={trail.pedagogical_link_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                >
                  <ExternalLink size={16} />
                  Recursos pedagógicos
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
