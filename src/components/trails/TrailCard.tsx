import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { hasPedagogicalContent, hasStudentContent } from '@/lib/trailAreas'
import type { TrailAreaTab } from '@/lib/trailAreas'
import type { LearningTrail } from '@/types/database'
import { ExternalLink, FileText, GraduationCap, Eye } from 'lucide-react'

interface TrailCardProps {
  trail: LearningTrail
  areaView?: TrailAreaTab
  readOnly?: boolean
  onOpen?: () => void
  actions?: ReactNode
}

export function TrailCard({
  trail,
  areaView = 'professor',
  readOnly = false,
  onOpen,
  actions,
}: TrailCardProps) {
  const isProfessor = areaView === 'professor'
  const pdfUrl = isProfessor ? trail.pedagogical_pdf_url : trail.pdf_url
  const linkUrl = isProfessor ? trail.pedagogical_link_url : trail.link_url
  const hasContent = isProfessor ? hasPedagogicalContent(trail) : hasStudentContent(trail)

  const content = (
    <Card hover={Boolean(onOpen) && !readOnly} className={onOpen ? 'cursor-pointer' : undefined}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <div className="p-3 rounded-xl bg-primary-500/20 text-primary-300 shrink-0">
            <GraduationCap size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-medium text-white">{trail.title}</h3>
              <Badge variant={isProfessor ? 'info' : 'success'}>
                {isProfessor ? 'Professor' : 'Aluno'}
              </Badge>
            </div>
            {trail.description && (
              <p className="text-sm text-slate-400 line-clamp-2">{trail.description}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-3">
              {pdfUrl && (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300"
                >
                  <FileText size={14} />
                  Abrir PDF
                </a>
              )}
              {linkUrl && (
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300"
                >
                  <ExternalLink size={14} />
                  Abrir link
                </a>
              )}
              {onOpen && hasContent && (
                <span className="inline-flex items-center gap-1 text-sm text-slate-500">
                  <Eye size={14} />
                  Clique para ver detalhes
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">{formatDate(trail.created_at)}</p>
          </div>
        </div>
        {actions && <div onClick={(e) => e.stopPropagation()}>{actions}</div>}
      </div>
    </Card>
  )

  if (!onOpen) return content

  const openResourceUrl = !isProfessor ? pdfUrl ?? linkUrl : null
  if (openResourceUrl) {
    return (
      <a
        href={openResourceUrl}
        target="_blank"
        rel="noreferrer"
        className="block w-full text-left"
        aria-label={pdfUrl ? `Abrir PDF da trilha ${trail.title}` : `Abrir trilha ${trail.title}`}
      >
        {content}
      </a>
    )
  }

  return (
    <button type="button" className="w-full text-left" onClick={onOpen}>
      {content}
    </button>
  )
}
