import { BarChart3, ClipboardList, FileText, Zap } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { formatAvgQuestionsLabel } from '@/lib/formBank'

interface FormsStatsBarProps {
  totalForms: number
  componentCount: number
  avgQuestions: number
  activeForms: number
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

export function FormsStatsBar({
  totalForms,
  componentCount,
  avgQuestions,
  activeForms,
}: FormsStatsBarProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <StatCard
        label="Total de formulários"
        value={totalForms}
        sub="Todos os formulários cadastrados"
        icon={FileText}
        iconBg="bg-violet-500/15"
        iconColor="text-violet-400"
      />
      <StatCard
        label="Componentes"
        value={componentCount}
        sub="Áreas do conhecimento"
        icon={ClipboardList}
        iconBg="bg-blue-500/15"
        iconColor="text-blue-400"
      />
      <StatCard
        label="Média de questões"
        value={avgQuestions > 0 ? formatAvgQuestionsLabel(avgQuestions) : '—'}
        sub="Questões por formulário"
        icon={BarChart3}
        iconBg="bg-emerald-500/15"
        iconColor="text-emerald-400"
      />
      <StatCard
        label="Formulários ativos"
        value={activeForms}
        sub="Disponíveis para aplicação"
        icon={Zap}
        iconBg="bg-amber-500/15"
        iconColor="text-amber-400"
      />
    </div>
  )
}
