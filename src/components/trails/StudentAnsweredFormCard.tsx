import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { RecommendedTrailHighlight } from '@/components/trails/RecommendedTrailHighlight'
import { formatDate, formatScore } from '@/lib/utils'
import { NIVEL_PROFICIENCIA_LABELS } from '@/lib/scoring'
import { FileBarChart } from 'lucide-react'
import type { LearningTrail, NivelProficiencia } from '@/types/database'

interface StudentAnsweredFormCardProps {
  formTitle: string
  completedAt: string
  percentualAcerto: number | null
  nivelProficiencia: NivelProficiencia | null
  correctAnswers: number | null
  totalQuestions: number | null
  trail: LearningTrail | null
  percentRange: string | null
  onReport?: () => void
}

export function StudentAnsweredFormCard({
  formTitle,
  completedAt,
  percentualAcerto,
  nivelProficiencia,
  correctAnswers,
  totalQuestions,
  trail,
  percentRange,
  onReport,
}: StudentAnsweredFormCardProps) {
  const trailTitle = trail?.title || 'Trilha de recomposição'

  return (
    <Card className="!p-0 overflow-hidden border-primary-500/20">
      <div className="p-4 sm:p-5">
        {trail ? (
          <RecommendedTrailHighlight
            title={trailTitle}
            percentRange={percentRange}
            trail={trail}
            studentPercent={percentualAcerto}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-5 text-center">
            <p className="text-sm text-slate-500">
              Nenhuma trilha atribuída para esta faixa de desempenho.
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 bg-white/[0.02] px-4 py-3 sm:px-5 sm:py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Avaliação respondida
        </p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h4 className="text-sm font-medium text-slate-300">{formTitle}</h4>
          <p className="text-xs text-slate-500">{formatDate(completedAt)}</p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {percentualAcerto != null && (
            <Badge variant="info" className="text-xs">
              TCT: {formatScore(percentualAcerto)}
            </Badge>
          )}
          {nivelProficiencia && (
            <Badge
              variant={nivelProficiencia === 'avancado' ? 'success' : 'warning'}
              className="text-xs"
            >
              {NIVEL_PROFICIENCIA_LABELS[nivelProficiencia]}
            </Badge>
          )}
          {correctAnswers != null && totalQuestions != null && (
            <span className="text-xs text-slate-500">
              {correctAnswers}/{totalQuestions} acertos
            </span>
          )}
          {onReport && (
            <Button variant="ghost" size="sm" className="ml-auto !py-1 !px-2" onClick={onReport}>
              <FileBarChart size={14} />
              Relatório
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
