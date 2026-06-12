import { ExternalLink, FileText, GraduationCap } from 'lucide-react'
import type { StudentAssignedTrail } from '@/lib/studentForm'

interface StudentTrailResultProps {
  trail: StudentAssignedTrail
  accent?: string
}

export function StudentTrailResult({ trail, accent = '#14b8a6' }: StudentTrailResultProps) {
  const hasResource = Boolean(trail.pdf_url || trail.link_url)

  return (
    <div className="mt-6 pt-6 border-t border-white/10 text-left">
      <div className="flex items-center gap-2 mb-3">
        <GraduationCap size={20} style={{ color: accent }} />
        <h2 className="text-lg font-semibold text-white">Sua trilha de aprendizagem</h2>
      </div>
      <p className="text-sm text-slate-400 mb-4">
        Com base nas suas respostas, preparamos o seguinte caminho de recomposição para você:
      </p>
      <div className="rounded-xl bg-white/5 p-4 space-y-3">
        <h3 className="font-medium text-white">{trail.title}</h3>
        {trail.description && (
          <p className="text-sm text-slate-400">{trail.description}</p>
        )}
        {trail.content && (
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{trail.content}</p>
        )}
        {hasResource && (
          <div className="flex flex-wrap gap-3 pt-1">
            {trail.pdf_url && (
              <a
                href={trail.pdf_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: accent }}
              >
                <FileText size={16} />
                Abrir material (PDF)
              </a>
            )}
            {trail.link_url && (
              <a
                href={trail.link_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/5"
              >
                <ExternalLink size={16} />
                Acessar trilha online
              </a>
            )}
          </div>
        )}
        {!hasResource && !trail.content && (
          <p className="text-sm text-slate-500">
            Seu professor disponibilizará os materiais em breve.
          </p>
        )}
      </div>
    </div>
  )
}
