import { ExternalLink, FileText, Target, StickyNote } from 'lucide-react'
import { RichTextContent } from '@/components/ui/RichTextContent'
import { Badge } from '@/components/ui/Badge'
import type { LearningTrail } from '@/types/database'
import { NIVEL_PROFICIENCIA_OPTIONS } from '@/types/database'

interface ProfessorTrailPanelProps {
  trail: LearningTrail
  onViewStudent?: () => void
}

export function ProfessorTrailPanel({ trail, onViewStudent }: ProfessorTrailPanelProps) {
  const nivelLabel = NIVEL_PROFICIENCIA_OPTIONS.find((o) => o.value === trail.nivel_proficiencia)?.label

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="info">Trilha completa</Badge>
          {nivelLabel && <Badge variant="warning">{nivelLabel}</Badge>}
        </div>
        {onViewStudent && (
          <button
            type="button"
            onClick={onViewStudent}
            className="text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors"
          >
            Ver trilha do aluno →
          </button>
        )}
      </div>

      {trail.pedagogical_objectives && (
        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} className="text-primary-400" />
            <h4 className="text-sm font-semibold text-white">Objetivos de aprendizagem</h4>
          </div>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{trail.pedagogical_objectives}</p>
        </section>
      )}

      {trail.pedagogical_content && (
        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h4 className="text-sm font-semibold text-white mb-3">Área pedagógica</h4>
          <RichTextContent html={trail.pedagogical_content} className="text-sm text-slate-300" />
        </section>
      )}

      {trail.teacher_notes && (
        <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <StickyNote size={16} className="text-amber-400" />
            <h4 className="text-sm font-semibold text-white">Orientações para mediação</h4>
          </div>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{trail.teacher_notes}</p>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        {trail.pedagogical_pdf_url && (
          <a
            href={trail.pedagogical_pdf_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-primary-500/20 text-primary-300 hover:bg-primary-500/30"
          >
            <FileText size={16} />
            PDF completo (professor)
          </a>
        )}
        {trail.pedagogical_link_url && (
          <a
            href={trail.pedagogical_link_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/5"
          >
            <ExternalLink size={16} />
            Recursos pedagógicos
          </a>
        )}
      </div>

      {!trail.pedagogical_content
        && !trail.pedagogical_objectives
        && !trail.teacher_notes
        && !trail.pedagogical_pdf_url
        && !trail.pedagogical_link_url && (
        <p className="text-sm text-slate-500 text-center py-6">
          Nenhum conteúdo pedagógico cadastrado para esta trilha.
        </p>
      )}
    </div>
  )
}
