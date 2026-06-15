import { Map } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProfessorTrailPanel } from '@/components/trails/ProfessorTrailPanel'
import type { LearningTrail } from '@/types/database'

interface RecommendedTrailSectionProps {
  title: string
  percentRange: string | null
  trail: LearningTrail | null
  studentPercent?: number | null
}

export function RecommendedTrailSection({
  title,
  percentRange,
  trail,
  studentPercent,
}: RecommendedTrailSectionProps) {
  return (
    <Card className="mb-8">
      <div className="flex items-start gap-3 mb-5">
        <div className="p-2 rounded-xl bg-primary-500/15 shrink-0">
          <Map size={20} className="text-primary-400" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-white">Trilha de recomposição recomendada</h2>
          <p className="text-sm text-slate-400 mt-1">
            Atribuída automaticamente com base nas respostas desta avaliação. Visível apenas para
            o professor.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-sm font-medium text-primary-300">{title}</span>
            {percentRange && <Badge variant="default">{percentRange}</Badge>}
            {studentPercent != null && (
              <Badge variant="info">{studentPercent.toFixed(1)}% de acerto</Badge>
            )}
          </div>
        </div>
      </div>
      {trail ? (
        <ProfessorTrailPanel trail={trail} />
      ) : (
        <p className="text-sm text-slate-500">
          A trilha foi registrada, mas o conteúdo pedagógico não está disponível.
        </p>
      )}
    </Card>
  )
}
