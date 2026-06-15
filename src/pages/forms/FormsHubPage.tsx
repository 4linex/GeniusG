import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { FormStatusSelect } from '@/components/forms/FormStatusSelect'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { Pagination, paginateSlice } from '@/components/ui/Pagination'
import { formatDate, generateSlug } from '@/lib/utils'
import {
  FORM_MODE_LABELS,
  type Form,
  type FormLink,
  type FormStatus,
} from '@/types/database'
import { Copy, Link2, Plus, Pencil, Trash2, Eye } from 'lucide-react'

const FORMS_PAGE_SIZE = 6

interface FormWithLinks extends Form {
  links: (FormLink & { professor_name?: string })[]
  question_count?: number
}

interface FormsHubSnapshot {
  forms: FormWithLinks[]
}

const formsHubCache = new Map<string, FormsHubSnapshot>()

function formsHubCacheKey(userId: string, role: string, canManageForms: boolean) {
  return `${userId}:${role}:${canManageForms}`
}

export function FormsHubPage() {
  const { user, profile, loading: authLoading, hasRole } = useAuth()
  const canManageForms = hasRole('root', 'admin')
  const cacheKey =
    user && profile ? formsHubCacheKey(user.id, profile.role, canManageForms) : null
  const cached = cacheKey ? formsHubCache.get(cacheKey) : undefined

  const [forms, setForms] = useState<FormWithLinks[]>(cached?.forms ?? [])
  const [loading, setLoading] = useState(!cached)
  const [deleteTarget, setDeleteTarget] = useState<Form | null>(null)
  const [deleteLinkTarget, setDeleteLinkTarget] = useState<(FormLink & { professor_name?: string }) | null>(
    null,
  )
  const [deleting, setDeleting] = useState(false)
  const [deletingLink, setDeletingLink] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [creatingLinkFor, setCreatingLinkFor] = useState<string | null>(null)
  const [togglingLinkId, setTogglingLinkId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const paginatedForms = useMemo(
    () => paginateSlice(forms, page, FORMS_PAGE_SIZE),
    [forms, page],
  )

  useEffect(() => {
    setPage(1)
  }, [forms.length])

  const loadData = async () => {
    if (!user || !profile) return
    const key = formsHubCacheKey(user.id, profile.role, canManageForms)
    const hadData = formsHubCache.has(key)
    if (!hadData) setLoading(true)
    setError('')

    let formsQuery = supabase.from('forms').select('*').order('created_at', { ascending: false })
    if (!canManageForms) {
      formsQuery = formsQuery.eq('is_active', true)
    }

    let linksQuery = supabase
      .from('form_links')
      .select('*, professor:profiles(full_name)')
      .order('created_at', { ascending: false })

    if (profile?.role === 'professor') {
      linksQuery = linksQuery.eq('professor_id', user.id)
    }

    const [{ data: formsData, error: formsError }, { data: linksData }] = await Promise.all([
      formsQuery,
      linksQuery,
    ])

    if (formsError) {
      setError(formsError.message)
      setLoading(false)
      return
    }

    const formIds = (formsData || []).map((f) => f.id)
    let fqData: { form_id: string }[] = []
    if (formIds.length > 0) {
      const { data: fq } = await supabase.from('form_questions').select('form_id').in('form_id', formIds)
      fqData = fq || []
    }

    const countByForm = new Map<string, number>()
    for (const row of fqData) {
      countByForm.set(row.form_id, (countByForm.get(row.form_id) || 0) + 1)
    }

    const linksByForm = new Map<string, (FormLink & { professor_name?: string })[]>()
    for (const link of linksData || []) {
      const prof = link.professor as { full_name: string } | null
      const list = linksByForm.get(link.form_id) || []
      list.push({ ...link, professor_name: prof?.full_name })
      linksByForm.set(link.form_id, list)
    }

    const nextForms = (formsData || []).map((f) => ({
      ...(f as Form),
      links: linksByForm.get(f.id) || [],
      question_count: countByForm.get(f.id) || 0,
    }))
    formsHubCache.set(key, { forms: nextForms })
    setForms(nextForms)
    setLoading(false)
  }

  useEffect(() => {
    if (authLoading || !user || !profile) {
      if (!authLoading) setLoading(false)
      return
    }

    const key = formsHubCacheKey(user.id, profile.role, canManageForms)
    const hit = formsHubCache.get(key)
    if (hit) {
      setForms(hit.forms)
      setLoading(false)
      return
    }

    loadData()
  }, [user, profile, authLoading, canManageForms])

  useRefreshOnFocus(loadData, !authLoading && Boolean(user && profile))

  const handleStatusChange = async (id: string, status: FormStatus) => {
    await supabase.from('forms').update({ status }).eq('id', id)
    loadData()
  }

  const createLink = async (formId: string) => {
    if (!user) return
    setCreatingLinkFor(formId)
    setError('')
    const slug = generateSlug(10)
    const { error: insertError } = await supabase.from('form_links').insert({
      form_id: formId,
      slug,
      professor_id: user.id,
    })
    if (insertError) setError(insertError.message)
    else loadData()
    setCreatingLinkFor(null)
  }

  const toggleLink = async (link: FormLink) => {
    setTogglingLinkId(link.id)
    const { error: updateError } = await supabase
      .from('form_links')
      .update({ is_active: !link.is_active })
      .eq('id', link.id)
    if (updateError) setError(updateError.message)
    else loadData()
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
      loadData()
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
      loadData()
    }
    setDeletingLink(false)
  }

  return (
    <div>
      <CardHeader
        title="Formulários"
        description={
          canManageForms
            ? 'Crie formulários, gerencie questões e compartilhe links com os alunos'
            : 'Visualize formulários prontos e crie links para compartilhar com seus alunos'
        }
        action={
          canManageForms ? (
            <Link to="/formularios/novo">
              <Button>
                <Plus size={16} />
                Novo Formulário
              </Button>
            </Link>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">{error}</div>
      )}

      {loading && forms.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
        </div>
      ) : forms.length === 0 ? (
        <Card>
          <p className="text-slate-400 text-center py-8">Nenhum formulário disponível.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {paginatedForms.map((form) => (
            <Card key={form.id}>
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-medium text-white text-lg">{form.title}</h3>
                    <Badge variant={form.is_active ? 'success' : 'danger'}>
                      {form.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Badge variant="info">{FORM_MODE_LABELS[form.form_mode || 'padrao']}</Badge>
                    {canManageForms && (
                      <FormStatusSelect
                        value={form.status || 'em_andamento'}
                        onChange={(s) => handleStatusChange(form.id, s)}
                      />
                    )}
                  </div>
                  {form.description && <p className="text-sm text-slate-400">{form.description}</p>}
                  <p className="text-xs text-slate-500 mt-2">
                    {form.question_count} questões · {form.turma || '5º Ano'} · {formatDate(form.created_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/formularios/${form.id}/visualizar`}>
                    <Button variant="ghost" size="sm" title="Visualizar formulário">
                      <Eye size={16} />
                      <span className="ml-1 hidden sm:inline">Visualizar</span>
                    </Button>
                  </Link>
                  {canManageForms && (
                    <>
                      <Link to={`/formularios/${form.id}`}>
                        <Button variant="ghost" size="sm">
                          <Pencil size={16} />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(form)}>
                        <Trash2 size={16} className="text-red-400" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={creatingLinkFor === form.id}
                    onClick={() => createLink(form.id)}
                  >
                    <Link2 size={14} />
                    Criar link
                  </Button>
                </div>
              </div>

              {form.links.length > 0 ? (
                <div className="border-t border-white/10 pt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Links</p>
                  {form.links.map((link) => (
                    <div
                      key={link.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-mono text-primary-300 truncate">/f/{link.slug}</p>
                        {link.professor_name && profile?.role !== 'professor' && (
                          <p className="text-xs text-slate-500">{link.professor_name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={link.is_active ? 'success' : 'danger'}>
                          {link.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          loading={togglingLinkId === link.id}
                          onClick={() => toggleLink(link)}
                        >
                          {link.is_active ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => copyLink(link.slug)}>
                          <Copy size={14} />
                          {copied === link.slug ? 'Copiado!' : 'Copiar'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Excluir link"
                          onClick={() => setDeleteLinkTarget(link)}
                        >
                          <Trash2 size={14} className="text-red-400" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 border-t border-white/10 pt-3">
                  Nenhum link criado. Clique em &quot;Criar link&quot; para gerar um link para os alunos.
                </p>
              )}
            </Card>
          ))}
          <Pagination
            page={page}
            pageSize={FORMS_PAGE_SIZE}
            total={forms.length}
            onPageChange={setPage}
          />
        </div>
      )}

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
        description="O link deixará de funcionar para os alunos. Respostas já enviadas por este link permanecem no sistema."
        itemName={deleteLinkTarget ? `/f/${deleteLinkTarget.slug}` : undefined}
        loading={deletingLink}
        onConfirm={handleConfirmDeleteLink}
        onCancel={() => setDeleteLinkTarget(null)}
      />
    </div>
  )
}
