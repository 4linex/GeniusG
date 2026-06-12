import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'
import type { LearningTrail } from '@/types/database'
import { ExternalLink, FileText, GraduationCap } from 'lucide-react'

interface TrailCardProps {
  trail: LearningTrail
  readOnly?: boolean
  actions?: ReactNode
}

export function TrailCard({ trail, readOnly = false, actions }: TrailCardProps) {
  return (
    <Card hover={!readOnly}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <div className="p-3 rounded-xl bg-primary-500/20 text-primary-300 shrink-0">
            <GraduationCap size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-white mb-1">{trail.title}</h3>
            {trail.description && (
              <p className="text-sm text-slate-400">{trail.description}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-3">
              {trail.pdf_url && (
                <a
                  href={trail.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300"
                >
                  <FileText size={14} />
                  Abrir PDF
                </a>
              )}
              {trail.link_url && (
                <a
                  href={trail.link_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300"
                >
                  <ExternalLink size={14} />
                  Abrir link
                </a>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">{formatDate(trail.created_at)}</p>
          </div>
        </div>
        {actions}
      </div>
    </Card>
  )
}
