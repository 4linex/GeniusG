import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardHeader } from '@/components/ui/Card'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { TrailCard } from '@/components/trails/TrailCard'
import type { LearningTrail } from '@/types/database'
import { Plus, Pencil, Trash2, Upload, FileText } from 'lucide-react'

export function AdminTrailsPage() {
  const { user } = useAuth()
  const [trails, setTrails] = useState<LearningTrail[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pdfUrl, setPdfUrl] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<LearningTrail | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  const loadTrails = async () => {
    const { data } = await supabase
      .from('learning_trails')
      .select('*')
      .order('title')

    if (data) setTrails(data as LearningTrail[])
    setLoading(false)
  }

  useEffect(() => {
    loadTrails()
  }, [])

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setPdfUrl('')
    setLinkUrl('')
    setEditingId(null)
    setShowForm(false)
    setFormError('')
  }

  const handleEdit = (trail: LearningTrail) => {
    setEditingId(trail.id)
    setTitle(trail.title)
    setDescription(trail.description || '')
    setPdfUrl(trail.pdf_url || '')
    setLinkUrl(trail.link_url || '')
    setShowForm(true)
  }

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      setFormError('Envie apenas arquivos PDF')
      return
    }

    setFormError('')
    setUploading(true)
    const path = `trails/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

    const { error: uploadError } = await supabase.storage.from('trail-pdfs').upload(path, file)
    if (uploadError) {
      setFormError('Erro ao enviar PDF')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('trail-pdfs').getPublicUrl(path)
    setPdfUrl(publicUrl)
    setUploading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!pdfUrl.trim() && !linkUrl.trim()) {
      setFormError('Informe um PDF ou um link para a trilha')
      return
    }
    if (linkUrl.trim() && !/^https?:\/\//i.test(linkUrl.trim())) {
      setFormError('O link deve começar com http:// ou https://')
      return
    }

    setSubmitting(true)

    const trailData = {
      title: title.trim(),
      description: description.trim() || null,
      pdf_url: pdfUrl.trim() || null,
      link_url: linkUrl.trim() || null,
      created_by: user?.id,
    }

    if (editingId) {
      await supabase.from('learning_trails').update(trailData).eq('id', editingId)
    } else {
      await supabase.from('learning_trails').insert(trailData)
    }

    resetForm()
    loadTrails()
    setSubmitting(false)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError('')
    const { error: deleteError } = await supabase.from('learning_trails').delete().eq('id', deleteTarget.id)
    if (deleteError) {
      setError(deleteError.message)
      setDeleting(false)
      return
    }
    setDeleteTarget(null)
    setDeleting(false)
    loadTrails()
  }

  return (
    <div>
      <CardHeader
        title="Banco de Trilhas"
        description="Cadastre trilhas de aprendizagem aqui. Ao criar um formulário, escolha quais trilhas usar e defina a faixa de % de acerto de cada uma."
        action={
          <Button onClick={() => { resetForm(); setShowForm(true) }}>
            <Plus size={16} />
            Nova Trilha
          </Button>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">{error}</div>
      )}

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Título da trilha" value={title} onChange={(e) => setTitle(e.target.value)} required />

            <Textarea
              label="Descrição (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Material de recomposição em leitura e interpretação..."
            />

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">PDF da trilha (opcional)</label>
              <div className="flex items-center gap-4 flex-wrap">
                <label className="cursor-pointer">
                  <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10">
                    <Upload size={16} />
                    {uploading ? 'Enviando...' : 'Upload PDF'}
                  </span>
                </label>
                {pdfUrl && (
                  <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-sm text-primary-400 flex items-center gap-1">
                    <FileText size={14} />
                    PDF anexado
                  </a>
                )}
              </div>
            </div>

            <Input
              label="Link da trilha (opcional)"
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
            />
            <p className="text-xs text-slate-500 -mt-2">Informe pelo menos um: PDF ou link externo.</p>

            {formError && <p className="text-sm text-red-400">{formError}</p>}
            <div className="flex gap-3">
              <Button type="submit" loading={submitting}>
                {editingId ? 'Salvar' : 'Cadastrar Trilha'}
              </Button>
              <Button type="button" variant="secondary" onClick={resetForm}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
        </div>
      ) : trails.length === 0 ? (
        <Card>
          <p className="text-slate-400 text-center py-8">
            Nenhuma trilha cadastrada. Adicione trilhas ao banco para usá-las nos formulários.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {trails.map((trail) => (
            <TrailCard
              key={trail.id}
              trail={trail}
              actions={
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(trail)}>
                    <Pencil size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(trail)}>
                    <Trash2 size={16} className="text-red-400" />
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      )}

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Excluir trilha"
        description="Esta ação remove permanentemente a trilha do banco."
        itemName={deleteTarget?.title}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
