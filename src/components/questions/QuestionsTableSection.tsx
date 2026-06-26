import { Link } from 'react-router-dom'
import { Eye, FileText, Pencil, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Pagination, paginateSlice } from '@/components/ui/Pagination'
import { QuestionTypeBadge } from '@/components/forms/QuestionTypePicker'
import { formatDate, cn } from '@/lib/utils'
import { getComponentTheme } from '@/lib/questionComponents'
import type { Question } from '@/types/database'
import type { QuestionType } from '@/types/questionTypes'

const PAGE_SIZE = 10

interface QuestionsTableSectionProps {
  questions: Question[]
  loading: boolean
  activeComponent: string
  page: number
  onPageChange: (page: number) => void
  onPreview: (question: Question) => void
  onDelete: (question: Question) => void
  sectionRef?: React.RefObject<HTMLDivElement | null>
  returnPathForEdit?: string
}

export function QuestionsTableSection({
  questions,
  loading,
  activeComponent,
  page,
  onPageChange,
  onPreview,
  onDelete,
  sectionRef,
  returnPathForEdit,
}: QuestionsTableSectionProps) {
  const paginated = paginateSlice(questions, page, PAGE_SIZE)

  return (
    <div ref={sectionRef}>
      <Card className="!p-0 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Questões recentes</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Últimas questões cadastradas no banco
            {activeComponent ? ` · ${activeComponent}` : ''}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
          </div>
        ) : questions.length === 0 ? (
          <p className="text-slate-400 text-center py-16 text-sm px-6">
            Nenhuma questão encontrada com os filtros atuais.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="text-left py-3 px-5 font-medium">Questão</th>
                    <th className="text-left py-3 px-4 font-medium hidden md:table-cell">
                      Componente
                    </th>
                    <th className="text-left py-3 px-4 font-medium hidden sm:table-cell">
                      Ano/Série
                    </th>
                    <th className="text-left py-3 px-4 font-medium hidden lg:table-cell">
                      Dificuldade
                    </th>
                    <th className="text-left py-3 px-4 font-medium">Pontuação</th>
                    <th className="text-right py-3 px-5 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((q) => {
                    const theme = getComponentTheme(q.componente_curricular)
                    const points = q.point_value ?? 1

                    return (
                      <tr
                        key={q.id}
                        className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="py-4 px-5 min-w-[220px]">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                              <FileText size={16} className="text-slate-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate">{q.title}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                {q.codigo_item && <>Cód: {q.codigo_item} · </>}
                                {formatDate(q.created_at)}
                              </p>
                              <div className="flex flex-wrap gap-1.5 mt-2 md:hidden">
                                <span
                                  className={cn(
                                    'inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium',
                                    theme.badge,
                                  )}
                                >
                                  {q.componente_curricular}
                                </span>
                                <QuestionTypeBadge
                                  type={(q.question_type || 'multipla_escolha') as QuestionType}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 hidden md:table-cell">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                              theme.badge,
                            )}
                          >
                            {q.componente_curricular}
                          </span>
                        </td>
                        <td className="py-4 px-4 hidden sm:table-cell">
                          <span className="inline-flex rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">
                            {q.ano_serie}
                          </span>
                        </td>
                        <td className="py-4 px-4 hidden lg:table-cell">
                          {q.nivel_dificuldade ? (
                            <span className="inline-flex rounded-full bg-primary-500/15 px-2.5 py-1 text-xs text-primary-300">
                              {q.nivel_dificuldade}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-300">
                            {points} {points === 1 ? 'pt' : 'pts'}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onPreview(q)}
                              title="Visualizar"
                            >
                              <Eye size={16} />
                            </Button>
                            <Link
                              to={`/admin/questoes/${q.id}`}
                              state={returnPathForEdit ? { returnPath: returnPathForEdit } : undefined}
                            >
                              <Button variant="ghost" size="sm" title="Editar">
                                <Pencil size={16} />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(q)}
                              title="Excluir"
                            >
                              <Trash2 size={16} className="text-red-400" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-5 sm:px-6 pb-5">
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={questions.length}
                onPageChange={onPageChange}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
