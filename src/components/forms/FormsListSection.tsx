import { Link } from 'react-router-dom'
import { Copy, Eye, Link2, MapPin, Pencil, School, Trash2, Users } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FormStatusSelect } from '@/components/forms/FormStatusSelect'
import { Pagination, paginateSlice } from '@/components/ui/Pagination'
import { formatDate } from '@/lib/utils'
import { getComponentTheme } from '@/lib/questionComponents'
import {
  FORM_MODE_LABELS,
  FORM_STATUS_LABELS,
  type Form,
  type FormLink,
  type FormStatus,
} from '@/types/database'
import type { FormWithLinks } from '@/lib/formsHubOrganize'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 8

function LinkContextBadges({ link }: { link: FormLink }) {
  const hasContext = link.municipio || link.school_name || link.turma
  if (!hasContext) {
    return <span className="text-xs text-amber-400/90">Sem local definido</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {link.municipio && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-xs text-slate-300">
          <MapPin size={11} className="text-slate-500" />
          {link.municipio}
        </span>
      )}
      {link.school_name && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-xs text-slate-300">
          <School size={11} className="text-slate-500" />
          {link.school_name}
        </span>
      )}
      {link.turma && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-500/10 text-xs text-primary-200">
          <Users size={11} className="text-primary-400" />
          {link.turma}
        </span>
      )}
    </div>
  )
}

interface FormHubCardProps {
  form: FormWithLinks
  canManageForms: boolean
  showProfessorOnLinks: boolean
  copiedSlug: string | null
  creatingLink: boolean
  togglingLinkId: string | null
  onStatusChange: (id: string, status: FormStatus) => void
  onDelete: (form: Form) => void
  onCreateLink: (form: FormWithLinks) => void
  onToggleLink: (link: FormLink) => void
  onCopyLink: (slug: string) => void
  onDeleteLink: (link: FormLink & { professor_name?: string }) => void
}

function FormHubCard({
  form,
  canManageForms,
  showProfessorOnLinks,
  copiedSlug,
  creatingLink,
  togglingLinkId,
  onStatusChange,
  onDelete,
  onCreateLink,
  onToggleLink,
  onCopyLink,
  onDeleteLink,
}: FormHubCardProps) {
  const theme = getComponentTheme(form.componente_curricular || '')

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-white/5">
              <td className="py-4 px-5 min-w-[220px]">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                      theme.bg,
                    )}
                  >
                    <span className={cn('text-xs font-bold', theme.color)}>F</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-white">{form.title}</p>
                    {form.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{form.description}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">{formatDate(form.created_at)}</p>
                  </div>
                </div>
              </td>
              <td className="py-4 px-4 hidden sm:table-cell">
                <span className="inline-flex rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">
                  {form.turma}
                </span>
              </td>
              <td className="py-4 px-4 hidden md:table-cell">
                <span className="inline-flex rounded-full bg-primary-500/15 px-2.5 py-1 text-xs text-primary-300">
                  {FORM_STATUS_LABELS[form.status || 'em_andamento']}
                </span>
              </td>
              <td className="py-4 px-4 hidden lg:table-cell text-slate-300">
                {form.question_count ?? 0}
              </td>
              <td className="py-4 px-4 hidden lg:table-cell text-slate-300">{form.links.length}</td>
              <td className="py-4 px-5">
                <div className="flex items-center justify-end gap-1 flex-wrap">
                  <Link to={`/formularios/${form.id}/visualizar`}>
                    <Button variant="ghost" size="sm" title="Visualizar">
                      <Eye size={16} />
                    </Button>
                  </Link>
                  {canManageForms && (
                    <>
                      <Link to={`/formularios/${form.id}`}>
                        <Button variant="ghost" size="sm" title="Editar">
                          <Pencil size={16} />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(form)} title="Excluir">
                        <Trash2 size={16} className="text-red-400" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={creatingLink}
                    onClick={() => onCreateLink(form)}
                  >
                    <Link2 size={14} />
                    <span className="hidden sm:inline">Link</span>
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="px-5 pb-4 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
        <Badge variant={form.is_active ? 'success' : 'danger'}>
          {form.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
        <Badge variant="info">{FORM_MODE_LABELS[form.form_mode || 'padrao']}</Badge>
        {canManageForms && (
          <FormStatusSelect
            value={form.status || 'em_andamento'}
            onChange={(s) => onStatusChange(form.id, s)}
          />
        )}
      </div>

      {form.links.length > 0 ? (
        <div className="border-t border-white/10 px-5 py-4 bg-white/[0.02]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Links ({form.links.length})
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {form.links.map((link) => (
              <div
                key={link.id}
                className="flex flex-col gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-mono text-primary-300 truncate">/f/{link.slug}</p>
                  <LinkContextBadges link={link} />
                  {link.professor_name && showProfessorOnLinks && (
                    <p className="text-xs text-slate-500 mt-2">{link.professor_name}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={link.is_active ? 'success' : 'danger'}>
                    {link.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    loading={togglingLinkId === link.id}
                    onClick={() => onToggleLink(link)}
                  >
                    {link.is_active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => onCopyLink(link.slug)}>
                    <Copy size={14} />
                    {copiedSlug === link.slug ? 'Copiado!' : 'Copiar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Excluir link"
                    onClick={() => onDeleteLink(link)}
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500 border-t border-white/10 px-5 py-3">
          Nenhum link criado. Use o botão Link para compartilhar com os alunos.
        </p>
      )}
    </Card>
  )
}

interface FormsListSectionProps {
  forms: FormWithLinks[]
  loading: boolean
  page: number
  canManageForms: boolean
  showProfessorOnLinks: boolean
  copiedSlug: string | null
  creatingLinkFor: string | null
  togglingLinkId: string | null
  onPageChange: (page: number) => void
  onStatusChange: (id: string, status: FormStatus) => void
  onDelete: (form: Form) => void
  onCreateLink: (form: FormWithLinks) => void
  onToggleLink: (link: FormLink) => void
  onCopyLink: (slug: string) => void
  onDeleteLink: (link: FormLink & { professor_name?: string }) => void
}

export function FormsListSection({
  forms,
  loading,
  page,
  canManageForms,
  showProfessorOnLinks,
  copiedSlug,
  creatingLinkFor,
  togglingLinkId,
  onPageChange,
  onStatusChange,
  onDelete,
  onCreateLink,
  onToggleLink,
  onCopyLink,
  onDeleteLink,
}: FormsListSectionProps) {
  const paginated = paginateSlice(forms, page, PAGE_SIZE)

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
      </div>
    )
  }

  if (forms.length === 0) {
    return (
      <p className="text-slate-400 text-center py-16 text-sm">
        Nenhum formulário encontrado com os filtros atuais.
      </p>
    )
  }

  return (
    <div>
      <Card className="!p-0 overflow-hidden mb-4 hidden md:block">
        <div className="overflow-x-auto border-b border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400">
                <th className="text-left py-3 px-5 font-medium">Formulário</th>
                <th className="text-left py-3 px-4 font-medium">Ano/Série</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-left py-3 px-4 font-medium">Questões</th>
                <th className="text-left py-3 px-4 font-medium">Links</th>
                <th className="text-right py-3 px-5 font-medium">Ações</th>
              </tr>
            </thead>
          </table>
        </div>
      </Card>

      <div className="space-y-4">
        {paginated.map((form) => (
          <FormHubCard
            key={form.id}
            form={form}
            canManageForms={canManageForms}
            showProfessorOnLinks={showProfessorOnLinks}
            copiedSlug={copiedSlug}
            creatingLink={creatingLinkFor === form.id}
            togglingLinkId={togglingLinkId}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            onCreateLink={onCreateLink}
            onToggleLink={onToggleLink}
            onCopyLink={onCopyLink}
            onDeleteLink={onDeleteLink}
          />
        ))}
      </div>

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={forms.length}
        onPageChange={onPageChange}
        className="mt-6"
      />
    </div>
  )
}
