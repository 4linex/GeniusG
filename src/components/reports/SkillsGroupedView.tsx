import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { CHART_COLORS } from '@/components/reports/ReportCharts'
import { parseSkillLabel } from '@/lib/skillBank'
import type { SkillBreakdownRow } from '@/lib/formAssessmentReport'

interface SkillsGroupedViewProps {
  skills: SkillBreakdownRow[]
  emptyMessage?: string
  adequateEmptyMessage?: string
}

function groupStats(skills: SkillBreakdownRow[]) {
  const totalAttempts = skills.reduce((sum, row) => sum + row.total, 0)
  const totalCorrect = skills.reduce((sum, row) => sum + row.correct, 0)
  const avgPct = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0
  return {
    count: skills.length,
    avgPct,
    totalCorrect,
    totalAttempts,
  }
}

interface SkillGroupSectionProps {
  title: string
  skills: SkillBreakdownRow[]
  variant: 'deficit' | 'adequate'
  defaultOpen?: boolean
}

function SkillGroupSection({
  title,
  skills,
  variant,
  defaultOpen = true,
}: SkillGroupSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const stats = groupStats(skills)
  const barColor = variant === 'deficit' ? CHART_COLORS.atencao : CHART_COLORS.avancado

  return (
    <Card
      className={cn(
        '!p-0 overflow-hidden',
        variant === 'deficit' ? 'border-red-500/20' : 'border-emerald-500/20',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors',
          variant === 'deficit' ? 'hover:bg-red-500/5' : 'hover:bg-emerald-500/5',
        )}
      >
        <div className="min-w-0">
          <h3
            className={cn(
              'text-sm font-semibold',
              variant === 'deficit' ? 'text-red-300' : 'text-emerald-300',
            )}
          >
            {title}
            <span className="text-slate-400 font-normal ml-2">({stats.count})</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Média do grupo: {stats.avgPct}% · Total de acertos: {stats.totalCorrect}/
            {stats.totalAttempts}
          </p>
        </div>
        <ChevronDown
          size={18}
          className={cn(
            'shrink-0 text-slate-400 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="border-t border-white/10">
          <div className="hidden sm:grid sm:grid-cols-[110px_minmax(0,1fr)_150px_72px] gap-4 px-5 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
            <span>Código</span>
            <span>Descrição</span>
            <span>Desempenho</span>
            <span className="text-right">Acertos</span>
          </div>
          <ul className="divide-y divide-white/5">
            {skills.map((skill) => {
              const { code, description } = parseSkillLabel(skill.label)
              return (
                <li
                  key={skill.key}
                  className="px-5 py-3.5 grid gap-2 sm:gap-4 sm:grid-cols-[110px_minmax(0,1fr)_150px_72px] sm:items-center"
                >
                  <span className="text-sm font-mono font-medium text-primary-300 shrink-0">
                    {code}
                  </span>
                  <span
                    className="text-sm text-slate-300 min-w-0"
                    title={description || undefined}
                  >
                    {description || '—'}
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${skill.percentage}%`, backgroundColor: barColor }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-white w-9 text-right shrink-0">
                      {skill.percentage}%
                    </span>
                  </div>
                  <span className="text-sm text-slate-400 sm:text-right">
                    {skill.correct}/{skill.total}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Card>
  )
}

export function SkillsGroupedView({
  skills,
  emptyMessage = 'Nenhuma competência utilizada no período selecionado.',
  adequateEmptyMessage = 'Nenhuma competência adequada no período selecionado.',
}: SkillsGroupedViewProps) {
  const deficit = skills.filter((s) => s.percentage < 60)
  const adequate = skills.filter((s) => s.percentage >= 60)

  if (skills.length === 0) {
    return (
      <Card>
        <p className="text-slate-400 text-center py-10 text-sm">{emptyMessage}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {deficit.length > 0 && (
        <SkillGroupSection
          title="Com déficit (<60%)"
          skills={deficit}
          variant="deficit"
          defaultOpen
        />
      )}

      {adequate.length > 0 ? (
        <SkillGroupSection
          title="Adequadas (≥60%)"
          skills={adequate}
          variant="adequate"
          defaultOpen={deficit.length === 0}
        />
      ) : (
        <Card className="!py-6">
          <p className="text-slate-500 text-center text-sm">{adequateEmptyMessage}</p>
        </Card>
      )}
    </div>
  )
}
