import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn, formatDate } from '@/lib/utils'
import { type FormComponentAggregate, formatAvgQuestionsLabel } from '@/lib/formBank'
import { componentToSlug, getComponentTheme } from '@/lib/questionComponents'

interface FormsComponentsListProps {
  components: FormComponentAggregate[]
  loading?: boolean
}

function MetricCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-[5.5rem]">
      <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">{label}</p>
      {children}
    </div>
  )
}

export function FormsComponentsList({ components, loading }: FormsComponentsListProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {components.map((component) => {
        const theme = getComponentTheme(component.label)
        const Icon = theme.icon
        const href = `/formularios/componente/${componentToSlug(component.key)}`

        return (
          <Card key={component.key} hover className="!p-0 overflow-hidden">
            <div className="flex flex-col xl:flex-row xl:items-center gap-5 p-5 sm:p-6">
              <div className="flex items-center gap-4 min-w-0 xl:w-[280px] shrink-0">
                <div
                  className={cn(
                    'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0',
                    theme.bg,
                  )}
                >
                  <Icon size={26} className={theme.color} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-white leading-tight">
                    {component.label}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 leading-snug">{theme.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-8 gap-y-4 xl:flex-1 xl:justify-center">
                <MetricCell label="Formulários">
                  <p className="text-xl font-bold text-white tabular-nums">{component.count}</p>
                </MetricCell>
                <MetricCell label="Média">
                  <p className={cn('text-lg font-semibold tabular-nums', theme.color)}>
                    {component.avgQuestions > 0
                      ? formatAvgQuestionsLabel(component.avgQuestions)
                      : '—'}
                  </p>
                </MetricCell>
                <MetricCell label="Status">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-3 py-1 text-xs font-medium',
                      component.dominantStatus ? theme.badge : 'bg-white/10 text-slate-500',
                    )}
                  >
                    {component.dominantStatus ?? '—'}
                  </span>
                </MetricCell>
                <MetricCell label="Última atualização">
                  <p className="text-sm font-medium text-slate-300">
                    {component.lastUpdated ? formatDate(component.lastUpdated) : '—'}
                  </p>
                </MetricCell>
              </div>

              <Link
                to={href}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium',
                  'border transition-all shrink-0 xl:ml-auto',
                  theme.border,
                  theme.color,
                  'bg-transparent hover:bg-white/[0.04]',
                )}
              >
                Ver formulários
                <ArrowRight size={16} />
              </Link>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
