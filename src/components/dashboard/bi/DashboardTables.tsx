import { Badge } from '@/components/ui/Badge'
import { BiCard, BiSectionHeader } from '@/components/dashboard/bi/BiCard'
import {
  bnccSituation,
  mergeCriticalSkills,
  skillPriorityLabel,
  splitSkillLabel,
} from '@/lib/dashboardPresentation'
import type { DashboardSkillRow } from '@/hooks/useDashboardData'
import { cn } from '@/lib/utils'

interface CriticalSkillsTableProps {
  skills: ReturnType<typeof mergeCriticalSkills>
}

export function CriticalSkillsTable({ skills }: CriticalSkillsTableProps) {
  return (
    <BiCard className="h-full min-w-0">
      <BiSectionHeader
        title="Habilidades críticas"
        subtitle="BNCC e SAEB com acerto abaixo de 60%"
      />
      {skills.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">Nenhuma habilidade crítica.</p>
      ) : (
        <div className="-mx-1 overflow-x-auto scrollbar-app sm:mx-0">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[13px] text-slate-400">
                <th className="pb-3 pr-3 font-medium">Código</th>
                <th className="pb-3 pr-3 font-medium">Habilidade</th>
                <th className="pb-3 pr-3 font-medium">Desempenho</th>
                <th className="pb-3 font-medium">Prioridade</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((skill) => (
                <tr key={`${skill.kind}-${skill.label}`} className="border-b border-white/5">
                  <td className="py-3 pr-3 font-mono text-xs text-primary-300">{skill.code}</td>
                  <td className="py-3 pr-3 text-slate-300">
                    <span className="line-clamp-2">{skill.description}</span>
                  </td>
                  <td className="py-3 pr-3 font-semibold text-white tabular-nums">
                    {skill.percentage}%
                  </td>
                  <td className="py-3">
                    <Badge
                      variant={
                        skill.priority === 'alta'
                          ? 'danger'
                          : skill.priority === 'media'
                            ? 'warning'
                            : 'warning'
                      }
                      className={cn(skill.priority === 'baixa' && 'bg-yellow-500/20 text-yellow-300')}
                    >
                      {skillPriorityLabel(skill.priority)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </BiCard>
  )
}

interface BnccCompetenciesTableProps {
  skills: DashboardSkillRow[]
}

export function BnccCompetenciesTable({ skills }: BnccCompetenciesTableProps) {
  return (
    <BiCard className="h-full min-w-0">
      <BiSectionHeader
        title="Competências BNCC"
        subtitle="Habilidades com maior déficit no escopo atual"
      />
      {skills.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">Sem competências BNCC críticas.</p>
      ) : (
        <div className="-mx-1 overflow-x-auto scrollbar-app sm:mx-0">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[13px] text-slate-400">
                <th className="pb-3 pr-3 font-medium">Competência</th>
                <th className="pb-3 pr-3 font-medium">Descrição</th>
                <th className="pb-3 pr-3 font-medium">Desempenho</th>
                <th className="pb-3 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((skill) => {
                const { code, description } = splitSkillLabel(skill.label)
                const situation = bnccSituation(skill.percentage)
                return (
                  <tr key={skill.label} className="border-b border-white/5">
                    <td className="py-3 pr-3 font-mono text-xs text-primary-300">{code}</td>
                    <td className="py-3 pr-3 text-slate-300">
                      <span className="line-clamp-2">{description}</span>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-primary-500 transition-all duration-500"
                            style={{ width: `${skill.percentage}%` }}
                          />
                        </div>
                        <span className="font-semibold text-white tabular-nums">
                          {skill.percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge variant={situation.variant}>{situation.label}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </BiCard>
  )
}

interface ErrorDescriptorsTableProps {
  skills: DashboardSkillRow[]
}

export function ErrorDescriptorsTable({ skills }: ErrorDescriptorsTableProps) {
  const sorted = [...skills].sort((a, b) => a.percentage - b.percentage)

  return (
    <BiCard className="h-full min-w-0">
      <BiSectionHeader
        title="Descritores com maior índice de erro"
        subtitle="SAEB com menor percentual de acerto"
      />
      {sorted.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">Sem descritores críticos.</p>
      ) : (
        <div className="-mx-1 overflow-x-auto scrollbar-app sm:mx-0">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[13px] text-slate-400">
                <th className="pb-3 pr-3 font-medium">Descritor</th>
                <th className="pb-3 pr-3 font-medium">Conteúdo</th>
                <th className="pb-3 pr-3 font-medium">Erro</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((skill) => {
                const { code, description } = splitSkillLabel(skill.label)
                const errorRate = 100 - skill.percentage
                return (
                  <tr key={skill.label} className="border-b border-white/5">
                    <td className="py-3 pr-3 font-mono text-xs text-red-300">{code}</td>
                    <td className="py-3 pr-3 text-slate-300">
                      <span className="line-clamp-2">{description}</span>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-28 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-red-500 transition-all duration-500"
                            style={{ width: `${errorRate}%` }}
                          />
                        </div>
                        <span className="font-semibold text-red-300 tabular-nums">
                          {errorRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </BiCard>
  )
}

interface DashboardInsightsPanelProps {
  insights: string[]
}

export function DashboardInsightsPanel({ insights }: DashboardInsightsPanelProps) {
  return (
    <BiCard className="min-w-0">
      <BiSectionHeader
        title="Principais conclusões"
        subtitle="Insights gerados automaticamente a partir dos dados do escopo"
      />
      <ul className="space-y-3">
        {insights.map((insight) => (
          <li
            key={insight}
            className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-300"
          >
            <span aria-hidden className="mt-0.5 text-base">
              📌
            </span>
            <span>{insight}</span>
          </li>
        ))}
      </ul>
    </BiCard>
  )
}
