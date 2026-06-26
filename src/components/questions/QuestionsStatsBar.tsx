import { BarChart3, BookOpen, FileText, Trophy } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { formatPointsLabel } from '@/lib/questionComponents'

interface QuestionsStatsBarProps {
  totalQuestions: number
  componentCount: number
  avgPoints: number
  avgDifficulty: string | null
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string
  value: string | number
  sub: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  iconBg: string
  iconColor: string
}) {
  return (
    <Card className="!p-5 h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-400">{label}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          <p className="text-xs text-slate-500 mt-1">{sub}</p>
        </div>
        <div className={cn('p-3 rounded-xl shrink-0', iconBg)}>
          <Icon size={22} className={iconColor} />
        </div>
      </div>
    </Card>
  )
}

export function QuestionsStatsBar({
  totalQuestions,
  componentCount,
  avgPoints,
  avgDifficulty,
}: QuestionsStatsBarProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <StatCard
        label="Total de questões"
        value={totalQuestions}
        sub="Todas as questões cadastradas"
        icon={FileText}
        iconBg="bg-violet-500/15"
        iconColor="text-violet-400"
      />
      <StatCard
        label="Componentes"
        value={componentCount}
        sub="Áreas do conhecimento"
        icon={BookOpen}
        iconBg="bg-blue-500/15"
        iconColor="text-blue-400"
      />
      <StatCard
        label="Média geral"
        value={avgPoints > 0 ? formatPointsLabel(avgPoints) : '—'}
        sub="Pontuação média"
        icon={BarChart3}
        iconBg="bg-emerald-500/15"
        iconColor="text-emerald-400"
      />
      <StatCard
        label="Dificuldade média"
        value={avgDifficulty ?? '—'}
        sub="Nível de dificuldade"
        icon={Trophy}
        iconBg="bg-amber-500/15"
        iconColor="text-amber-400"
      />
    </div>
  )
}
