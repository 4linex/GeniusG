import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { TabBar } from '@/components/ui/TabBar'
import { StudentTrailPreview } from '@/components/trails/StudentTrailPreview'
import {
  TRAIL_AREA_TABS,
  emptyTrailBankForm,
  formDataToTrailPayload,
  trailToFormData,
  validatePedagogicalLink,
  validateStudentTrailArea,
  type TrailAreaTab,
  type TrailBankFormData,
} from '@/lib/trailAreas'
import { NIVEL_PROFICIENCIA_OPTIONS, type LearningTrail } from '@/types/database'
import { Upload, FileText, Eye } from 'lucide-react'

interface TrailBankFormProps {
  editingTrail?: LearningTrail | null
  userId?: string
  onSaved: () => void
  onCancel: () => void
}

async function uploadTrailPdf(file: File): Promise<string> {
  const path = `trails/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  const { error } = await supabase.storage.from('trail-pdfs').upload(path, file)
  if (error) throw new Error('Erro ao enviar PDF')
  const { data: { publicUrl } } = supabase.storage.from('trail-pdfs').getPublicUrl(path)
  return publicUrl
}

function PdfUploadField({
  label,
  value,
  onChange,
  uploading,
  setUploading,
  setError,
}: {
  label: string
  value: string
  onChange: (url: string) => void
  uploading: boolean
  setUploading: (v: boolean) => void
  setError: (msg: string) => void
}) {
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Envie apenas arquivos PDF')
      return
    }
    setError('')
    setUploading(true)
    try {
      onChange(await uploadTrailPdf(file))
    } catch {
      setError('Erro ao enviar PDF')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      <div className="flex items-center gap-4 flex-wrap">
        <label className="cursor-pointer">
          <input type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10">
            <Upload size={16} />
            {uploading ? 'Enviando...' : 'Upload PDF'}
          </span>
        </label>
        {value && (
          <a href={value} target="_blank" rel="noreferrer" className="text-sm text-primary-400 flex items-center gap-1">
            <FileText size={14} />
            PDF anexado
          </a>
        )}
      </div>
    </div>
  )
}

export function TrailBankForm({ editingTrail, userId, onSaved, onCancel }: TrailBankFormProps) {
  const [tab, setTab] = useState<TrailAreaTab>('professor')
  const [form, setForm] = useState<TrailBankFormData>(
    editingTrail ? trailToFormData(editingTrail) : emptyTrailBankForm(),
  )
  const [showStudentPreview, setShowStudentPreview] = useState(false)
  const [uploadingPedagogicalPdf, setUploadingPedagogicalPdf] = useState(false)
  const [uploadingStudentPdf, setUploadingStudentPdf] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const patch = (partial: Partial<TrailBankFormData>) => setForm((prev) => ({ ...prev, ...partial }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const studentError = validateStudentTrailArea(form)
    if (studentError) {
      setFormError(studentError)
      setTab('aluno')
      return
    }

    const pedLinkError = validatePedagogicalLink(form.pedagogicalLinkUrl)
    if (pedLinkError) {
      setFormError(pedLinkError)
      setTab('professor')
      return
    }

    setSubmitting(true)
    const payload = formDataToTrailPayload(form, userId)

    if (editingTrail) {
      const { error } = await supabase.from('learning_trails').update(payload).eq('id', editingTrail.id)
      if (error) {
        setFormError(error.message)
        setSubmitting(false)
        return
      }
    } else {
      const { error } = await supabase.from('learning_trails').insert(payload)
      if (error) {
        setFormError(error.message)
        setSubmitting(false)
        return
      }
    }

    setSubmitting(false)
    onSaved()
  }

  const previewTrail = {
    title: form.title || 'Título da trilha',
    description: form.description || null,
    content: form.content || null,
    pdf_url: form.pdfUrl || null,
    link_url: form.linkUrl || null,
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
        <TabBar items={TRAIL_AREA_TABS} active={tab} onChange={setTab} />

        {tab === 'professor' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Trilha completa com orientações pedagógicas para o professor. Use o botão abaixo para
              conferir o que o aluno receberá.
            </p>

            <Select
              label="Nível de proficiência (referência pedagógica)"
              value={form.nivelProficiencia}
              onChange={(e) => patch({ nivelProficiencia: e.target.value as TrailBankFormData['nivelProficiencia'] })}
              options={[
                { value: '', label: 'Não informado' },
                ...NIVEL_PROFICIENCIA_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
              ]}
            />

            <Textarea
              label="Objetivos de aprendizagem"
              value={form.pedagogicalObjectives}
              onChange={(e) => patch({ pedagogicalObjectives: e.target.value })}
              placeholder="Ex.: Consolidar inferência textual a partir de textos narrativos..."
            />

            <RichTextEditor
              label="Área pedagógica"
              value={form.pedagogicalContent}
              onChange={(pedagogicalContent) => patch({ pedagogicalContent })}
            />

            <Textarea
              label="Orientações para mediação em sala"
              value={form.teacherNotes}
              onChange={(e) => patch({ teacherNotes: e.target.value })}
              placeholder="Sugestões de condução, tempo estimado, agrupamentos..."
            />

            <PdfUploadField
              label="PDF completo (professor)"
              value={form.pedagogicalPdfUrl}
              onChange={(pedagogicalPdfUrl) => patch({ pedagogicalPdfUrl })}
              uploading={uploadingPedagogicalPdf}
              setUploading={setUploadingPedagogicalPdf}
              setError={setFormError}
            />

            <Input
              label="Link de recursos pedagógicos (opcional)"
              type="url"
              value={form.pedagogicalLinkUrl}
              onChange={(e) => patch({ pedagogicalLinkUrl: e.target.value })}
              placeholder="https://..."
            />

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setTab('aluno')}
            >
              <Eye size={16} />
              Ir para trilha do aluno
            </Button>
          </div>
        )}

        {tab === 'aluno' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Conteúdo entregue ao aluno após responder o formulário. Deve ser objetivo e acessível.
            </p>

            <Input
              label="Título (aluno)"
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              required
            />

            <Textarea
              label="Descrição (aluno)"
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Breve apresentação do material de recomposição..."
            />

            <Textarea
              label="Conteúdo em texto (aluno)"
              value={form.content}
              onChange={(e) => patch({ content: e.target.value })}
              placeholder="Instruções ou texto que aparecerá na tela final..."
            />

            <PdfUploadField
              label="PDF do material (aluno)"
              value={form.pdfUrl}
              onChange={(pdfUrl) => patch({ pdfUrl })}
              uploading={uploadingStudentPdf}
              setUploading={setUploadingStudentPdf}
              setError={setFormError}
            />

            <Input
              label="Link da trilha (aluno)"
              type="url"
              value={form.linkUrl}
              onChange={(e) => patch({ linkUrl: e.target.value })}
              placeholder="https://..."
            />
            <p className="text-xs text-slate-500 -mt-2">
              Informe pelo menos um: PDF, link ou conteúdo em texto na área do aluno.
            </p>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowStudentPreview((v) => !v)}
            >
              <Eye size={16} />
              {showStudentPreview ? 'Ocultar pré-visualização' : 'Pré-visualizar trilha do aluno'}
            </Button>

            {showStudentPreview && <StudentTrailPreview trail={previewTrail} />}
          </div>
        )}

        {formError && <p className="text-sm text-red-400">{formError}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={submitting}>
            {editingTrail ? 'Salvar trilha' : 'Cadastrar trilha'}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
  )
}
