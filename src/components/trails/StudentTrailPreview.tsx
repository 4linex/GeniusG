import { StudentTrailResult } from '@/components/trails/StudentTrailResult'
import type { LearningTrail } from '@/types/database'
import { trailToStudentView } from '@/lib/trailAreas'

interface StudentTrailPreviewProps {
  trail: Pick<LearningTrail, 'title' | 'description' | 'content' | 'pdf_url' | 'link_url'>
  accent?: string
}

export function StudentTrailPreview({ trail, accent }: StudentTrailPreviewProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500 mb-4">
        Pré-visualização — visão do aluno após responder o formulário
      </p>
      <StudentTrailResult trail={trailToStudentView(trail)} accent={accent} />
    </div>
  )
}
