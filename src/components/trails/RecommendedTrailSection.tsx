import { Card } from '@/components/ui/Card'
import { ProfessorTrailPanel } from '@/components/trails/ProfessorTrailPanel'
import { RecommendedTrailHighlight } from '@/components/trails/RecommendedTrailHighlight'
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
    <Card className="mb-8 !p-0 overflow-hidden border-primary-500/25">
      <div className="p-4 sm:p-6">
        <RecommendedTrailHighlight
          title={title}
          percentRange={percentRange}
          trail={trail}
          studentPercent={studentPercent}
        />
        <p className="mt-4 text-sm text-slate-400">
          Atribuída automaticamente com base nas respostas desta avaliação. Visível apenas para o
          professor.
        </p>
      </div>
      {trail ? (
        <div className="border-t border-white/10 bg-white/[0.02] p-4 sm:p-6">
          <ProfessorTrailPanel trail={trail} />
        </div>
      ) : (
        <p className="border-t border-white/10 px-4 pb-4 text-sm text-slate-500 sm:px-6 sm:pb-6">
          A trilha foi registrada, mas o conteúdo pedagógico não está disponível.
        </p>
      )}
    </Card>
  )
}
