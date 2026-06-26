import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { CreateFormLinkModal, type FormLinkContext } from '@/components/forms/CreateFormLinkModal'
import {
  ComponentFormsFilters,
  EMPTY_COMPONENT_FORMS_FILTERS,
} from '@/components/forms/ComponentFormsFilters'
import { FormsListSection } from '@/components/forms/FormsListSection'
import { applyComponentFormsFilters } from '@/lib/formFilters'
import {
  componentToSlug,
  getComponentTheme,
  isKnownComponent,
  slugToComponent,
} from '@/lib/questionComponents'
import { generateSlug } from '@/lib/utils'
import { useFormsHubData } from '@/hooks/useFormsHubData'
import type { Form, FormLink, FormStatus } from '@/types/database'
import type { FormWithLinks } from '@/lib/formsHubOrganize'
import { cn } from '@/lib/utils'
import { ArrowLeft, Plus } from 'lucide-react'

export function ComponentFormsPage() {
  const { componentSlug = '' } = useParams()
  const componentLabel = slugToComponent(componentSlug)
  const theme = getComponentTheme(componentLabel)
  const Icon = theme.icon
  const componentPath = `/formularios/componente/${componentToSlug(componentLabel)}`

  const {
    forms: allForms,
    loading,
    error,
    canManageForms,
    profile,
    user,
    reload,
    setError,
  } = useFormsHubData()

  const [filters, setFilters] = useState(EMPTY_COMPONENT_FORMS_FILTERS)
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Form | null>(null)
  const [deleteLinkTarget, setDeleteLinkTarget] = useState<(FormLink & { professor_name?: string }) | null>(
    null,
  )
  const [deleting, setDeleting] = useState(false)
  const [deletingLink, setDeletingLink] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [creatingLinkFor, setCreatingLinkFor] = useState<string | null>(null)
  const [linkModalForm, setLinkModalForm] = useState<FormWithLinks | null>(null)
  const [togglingLinkId, setTogglingLinkId] = useState<string | null>(null)

  const componentForms = useMemo(
    () => allForms.filter((f) => f.componente_curricular === componentLabel),
    [allForms, componentLabel],
  )

  const filtered = useMemo(
    () => applyComponentFormsFilters(componentForms, filters),
    [componentForms, filters],
  )

  useEffect(() => {
    setPage(1)
  }, [filters])

  if (!isKnownComponent(componentLabel)) {
    return <Navigate to="/formularios" replace />
  }

  const handleStatusChange = async (id: string, status: FormStatus) => {
    await supabase.from('forms').update({ status }).eq('id', id)
    reload()
  }

  const createLink = async (formId: string, context: FormLinkContext) => {
    if (!user) return
    setCreatingLinkFor(formId)
    setError('')
    const slug = generateSlug(10)
    const { error: insertError } = await supabase.from('form_links').insert({
      form_id: formId,
      slug,
      professor_id: user.id,
      municipio: context.municipio,
      school_name: context.schoolName,
      turma: context.turma,
    })
    if (insertError) setError(insertError.message)
    else {
      setLinkModalForm(null)
      reload()
    }
    setCreatingLinkFor(null)
  }

  const toggleLink = async (link: FormLink) => {
    setTogglingLinkId(link.id)
    const { error: updateError } = await supabase
      .from('form_links')
      .update({ is_active: !link.is_active })
      .eq('id', link.id)
    if (updateError) setError(updateError.message)
    else reload()
    setTogglingLinkId(null)
  }

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/f/${slug}`)
    setCopied(slug)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const { error: deleteError } = await supabase.from('forms').delete().eq('id', deleteTarget.id)
    if (deleteError) setError(deleteError.message)
    else {
      setDeleteTarget(null)
      reload()
    }
    setDeleting(false)
  }

  const handleConfirmDeleteLink = async () => {
    if (!deleteLinkTarget) return
    setDeletingLink(true)
    const { error: deleteError } = await supabase
      .from('form_links')
      .delete()
      .eq('id', deleteLinkTarget.id)
    if (deleteError) setError(deleteError.message)
    else {
      setDeleteLinkTarget(null)
      reload()
    }
    setDeletingLink(false)
  }

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div className="flex items-start gap-4 min-w-0">
          <Link
            to="/formularios"
            className="mt-1 inline-flex items-center justify-center w-9 h-9 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
            title="Voltar aos componentes"
          >
            <ArrowLeft size={18} />
          </Link>
          <div
            className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0',
              theme.bg,
            )}
          >
            <Icon size={28} className={theme.color} />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white">{componentLabel}</h1>
            <p className="text-slate-400 mt-1">{theme.description}</p>
            <p className="text-sm text-slate-500 mt-1">
              {componentForms.length}{' '}
              {componentForms.length === 1 ? 'formulário' : 'formulários'} neste componente
            </p>
          </div>
        </div>

        {canManageForms && (
          <Link
            to="/formularios/novo"
            state={{ fixedComponente: componentLabel, returnPath: componentPath }}
          >
            <Button>
              <Plus size={16} />
              Novo formulário
            </Button>
          </Link>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <ComponentFormsFilters
        filters={filters}
        resultCount={filtered.length}
        totalCount={componentForms.length}
        onChange={setFilters}
        onClear={() => setFilters(EMPTY_COMPONENT_FORMS_FILTERS)}
      />

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Formulários recentes</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Últimos formulários cadastrados em {componentLabel}
        </p>
      </div>

      <FormsListSection
        forms={filtered}
        loading={loading}
        page={page}
        canManageForms={canManageForms}
        showProfessorOnLinks={profile?.role !== 'professor'}
        copiedSlug={copied}
        creatingLinkFor={creatingLinkFor}
        togglingLinkId={togglingLinkId}
        onPageChange={setPage}
        onStatusChange={handleStatusChange}
        onDelete={setDeleteTarget}
        onCreateLink={setLinkModalForm}
        onToggleLink={toggleLink}
        onCopyLink={copyLink}
        onDeleteLink={setDeleteLinkTarget}
      />

      <CreateFormLinkModal
        open={Boolean(linkModalForm)}
        formTitle={linkModalForm?.title}
        defaultMunicipio={profile?.municipio}
        defaultSchoolName={linkModalForm?.school_name ?? profile?.school_name}
        loading={Boolean(linkModalForm && creatingLinkFor === linkModalForm.id)}
        onConfirm={(context) => {
          if (linkModalForm) void createLink(linkModalForm.id, context)
        }}
        onCancel={() => setLinkModalForm(null)}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Excluir formulário"
        description="Esta ação remove permanentemente o formulário, questões exclusivas e links."
        itemName={deleteTarget?.title}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteLinkTarget)}
        title="Excluir link"
        description="O link deixará de funcionar para os alunos. Respostas já enviadas permanecem no sistema."
        itemName={deleteLinkTarget ? `/f/${deleteLinkTarget.slug}` : undefined}
        loading={deletingLink}
        onConfirm={handleConfirmDeleteLink}
        onCancel={() => setDeleteLinkTarget(null)}
      />
    </div>
  )
}
