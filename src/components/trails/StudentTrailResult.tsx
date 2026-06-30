import { FileText, GraduationCap } from 'lucide-react'
import type { StudentAssignedTrail } from '@/lib/studentForm'
import { getStudentTrailLinkUrl, getStudentTrailPdfUrl } from '@/lib/trailAreas'

interface StudentTrailResultProps {
  trail: StudentAssignedTrail
  accent?: string
  /** Destaque visual de trilha recomendada (ex.: após responder formulário). */
  recommended?: boolean
}

export function StudentTrailResult({
  trail,
  accent = '#14b8a6',
  recommended = false,
}: StudentTrailResultProps) {
  const pdfUrl = getStudentTrailPdfUrl(trail)
  const linkUrl = getStudentTrailLinkUrl(trail)
  const openUrl = pdfUrl ?? linkUrl
  const hasTextContent = Boolean(trail.description?.trim() || trail.content?.trim())

  const trailBody = (
    <>
      <h3 className="font-medium text-white">{trail.title}</h3>
      {trail.description && <p className="text-sm text-slate-400">{trail.description}</p>}
      {trail.content && (
        <p className="text-sm text-slate-300 whitespace-pre-wrap">{trail.content}</p>
      )}
      {openUrl && (
        <p
          className="inline-flex items-center gap-1.5 text-xs font-medium pt-1"
          style={{ color: accent }}
        >
          <FileText size={14} />
          {pdfUrl ? 'Clique para abrir o PDF da trilha' : 'Clique para acessar a trilha online'}
        </p>
      )}
      {!openUrl && !hasTextContent && (
        <p className="text-sm text-slate-500">Seu professor disponibilizará os materiais em breve.</p>
      )}
    </>
  )

  const boxClassName = [
    'rounded-xl bg-white/5 p-4 space-y-3 transition-all',
    openUrl ? 'cursor-pointer hover:bg-white/10 hover:ring-1 hover:ring-white/15' : '',
    recommended ? 'border-2 border-primary-500/40 ring-1 ring-primary-500/20' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={recommended ? undefined : 'mt-6 pt-6 border-t border-white/10 text-left'}>
      <div className="flex items-center gap-2 mb-3">
        <GraduationCap size={20} style={{ color: accent }} />
        <h2 className="text-lg font-semibold text-white">
          {recommended ? 'Trilha recomendada' : 'Sua trilha de aprendizagem'}
        </h2>
      </div>
      {!recommended && (
        <p className="text-sm text-slate-400 mb-4">
          Com base nas suas respostas, preparamos o seguinte caminho de recomposição para você:
        </p>
      )}
      {openUrl ? (
        <a
          href={openUrl}
          target="_blank"
          rel="noreferrer"
          className={`${boxClassName} block`}
          aria-label={pdfUrl ? `Abrir PDF da trilha ${trail.title}` : `Abrir trilha ${trail.title}`}
        >
          {trailBody}
        </a>
      ) : (
        <div className={boxClassName}>{trailBody}</div>
      )}
    </div>
  )
}
