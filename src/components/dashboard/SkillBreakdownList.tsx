import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { SkillBreakdownRow } from '@/lib/formAssessmentReport'

interface SkillBreakdownListProps {
  skills: SkillBreakdownRow[]
  emptyMessage?: string
}

export function SkillBreakdownList({
  skills,
  emptyMessage = 'Nenhum dado disponível.',
}: SkillBreakdownListProps) {
  if (skills.length === 0) {
    return (
      <Card>
        <p className="text-slate-400 text-center py-8 text-sm">{emptyMessage}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {skills.map((s) => (
        <Card key={s.key}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-white text-sm truncate">{s.label}</h3>
              <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full gradient-bg transition-all"
                  style={{ width: `${s.percentage}%` }}
                />
              </div>
            </div>
            <div className="text-right shrink-0">
              <Badge variant={s.percentage >= 60 ? 'success' : 'warning'}>
                {s.percentage}%
              </Badge>
              <p className="text-xs text-slate-500 mt-1">
                {s.correct}/{s.total}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
