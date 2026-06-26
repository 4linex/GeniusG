import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Eye, Pencil, Save } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useSidebar } from '@/contexts/SidebarContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import {
  FORM_STATUS_LABELS,
  TURMA_OPTIONS,
  AREA_OPTIONS,
  COMPONENTE_MVP,
  type FormMode,
  type FormStatus,
  type Question,
  type UserRole,
} from '@/types/database'
import { QuestionBankSidebar } from '@/components/forms/builder/QuestionBankSidebar'
import { FormCanvas } from '@/components/forms/builder/FormCanvas'
import { QuestionInspector } from '@/components/forms/builder/QuestionInspector'
import {
  createEmptyInlineQuestion,
  type BuilderQuestion,
  type BuilderTab,
} from '@/components/forms/builder/types'
import { loadBankQuestions, loadFormForBuilder, saveForm, saveBuilderQuestion, getErrorMessage } from '@/lib/formBuilder'
import { needsAlternatives } from '@/types/questionTypes'
import type { QuestionType } from '@/types/questionTypes'
import { FormPreviewModal } from '@/components/forms/FormPreviewModal'
import { FormModeToggle } from '@/components/forms/FormModeToggle'
import { FormTrailsPanel } from '@/components/forms/builder/FormTrailsPanel'
import { SchoolPicker, type SchoolSelection } from '@/components/schools/SchoolPicker'
import { findSchoolByName, findSchoolByProfileFields, formatSchoolMunicipio } from '@/lib/schools'
import { useSchools } from '@/hooks/useSchools'
import { validateFormTrails } from '@/lib/formTrails'
import type { FormTrailConfig } from '@/types/database'
import { cn } from '@/lib/utils'

function canViewCreatorNotes(q: BuilderQuestion, userId?: string, role?: UserRole) {
  return !q.createdBy || userId === q.createdBy || role === 'admin' || role === 'root'
}

function applyCreatorNotesAccess(
  questions: BuilderQuestion[],
  userId?: string,
  role?: UserRole,
): BuilderQuestion[] {
  return questions.map((q) => {
    if (canViewCreatorNotes(q, userId, role)) return q
    const { creatorNotes: _notes, ...rest } = q
    return rest
  })
}

const TABS: { id: BuilderTab; label: string }[] = [
  { id: 'editor', label: 'Editor' },
  { id: 'fluxo', label: 'Fluxo' },
  { id: 'configuracao', label: 'Configuração' },
  { id: 'trilhas', label: 'Trilhas' },
]

export function FormBuilderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile } = useAuth()
  const { collapsed } = useSidebar()
  const isEditing = Boolean(id)
  const presetComponente = (location.state as { fixedComponente?: string } | null)?.fixedComponente
  const resolvedReturnPath = (location.state as { returnPath?: string } | null)?.returnPath

  const { schools, loading: schoolsLoading } = useSchools()

  const [activeTab, setActiveTab] = useState<BuilderTab>('editor')
  const [title, setTitle] = useState('Meu Novo Formulário')
  const [description, setDescription] = useState('')
  const [schoolSelection, setSchoolSelection] = useState<SchoolSelection | null>(null)
  const [pendingSchoolName, setPendingSchoolName] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(true)
  const [status, setStatus] = useState<FormStatus>('em_andamento')
  const [expectedStudents, setExpectedStudents] = useState('')
  const [formMode, setFormMode] = useState<FormMode>('padrao')
  const [turma, setTurma] = useState('5º Ano')
  const [componenteCurricular, setComponenteCurricular] = useState(COMPONENTE_MVP)
  const [designAccent, setDesignAccent] = useState('#14b8a6')
  const [finalScreenTitle, setFinalScreenTitle] = useState('Obrigado!')
  const [finalScreenMessage, setFinalScreenMessage] = useState(
    'Suas respostas foram registradas com sucesso. Seu professor receberá o diagnóstico completo.',
  )
  const [bankQuestions, setBankQuestions] = useState<Question[]>([])
  const [questions, setQuestions] = useState<BuilderQuestion[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEditing)
  const [error, setError] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [trails, setTrails] = useState<FormTrailConfig[]>([])

  useEffect(() => {
    if (presetComponente && !isEditing) {
      setComponenteCurricular(presetComponente)
    }
  }, [presetComponente, isEditing])

  useEffect(() => {
    if (isEditing || schools.length === 0) return
    const fromProfile = findSchoolByProfileFields(
      schools,
      profile?.municipio,
      profile?.school_name,
    )
    if (fromProfile) {
      setSchoolSelection({
        schoolId: fromProfile.id,
        municipio: formatSchoolMunicipio(fromProfile),
        schoolName: fromProfile.name,
      })
    }
  }, [isEditing, schools, profile?.municipio, profile?.school_name])

  useEffect(() => {
    if (!pendingSchoolName || schools.length === 0) return
    const match = findSchoolByName(schools, pendingSchoolName)
    if (match) {
      setSchoolSelection({
        schoolId: match.id,
        municipio: formatSchoolMunicipio(match),
        schoolName: match.name,
      })
      setPendingSchoolName(null)
    }
  }, [pendingSchoolName, schools])

  useEffect(() => {
    if (!id) {
      loadBankQuestions().then(setBankQuestions)
      setInitialLoading(false)
      return
    }
    Promise.all([loadBankQuestions(), loadFormForBuilder(id)]).then(([bank, data]) => {
      setBankQuestions(bank as Question[])
      if (!data) return
      const { form, questions: qs, trails: loadedTrails } = data
      setTitle(form.title)
      setDescription(form.description || '')
      const match = findSchoolByName(schools, form.school_name)
      if (match) {
        setSchoolSelection({
          schoolId: match.id,
          municipio: formatSchoolMunicipio(match),
          schoolName: match.name,
        })
      } else if (form.school_name) {
        setPendingSchoolName(form.school_name)
      }
      setIsActive(form.is_active)
      setStatus(form.status || 'em_andamento')
      setExpectedStudents(form.expected_students?.toString() || '')
      setFormMode(form.form_mode || 'padrao')
      setTurma(form.turma || '5º Ano')
      setComponenteCurricular(form.componente_curricular || COMPONENTE_MVP)
      setDesignAccent(form.design_accent || '#14b8a6')
      setFinalScreenTitle(form.final_screen_title || 'Obrigado!')
      setFinalScreenMessage(
        form.final_screen_message ||
          'Suas respostas foram registradas com sucesso. Seu professor receberá o diagnóstico completo.',
      )
      setQuestions(applyCreatorNotesAccess(qs, user?.id, profile?.role))
      setTrails(loadedTrails)
      setInitialLoading(false)
    })
  }, [id, schools])

  const selectedQuestion = questions.find((q) => q.localId === selectedId) || null

  const addFromBank = (item: BuilderQuestion) => {
    if (questions.some((q) => q.questionId && q.questionId === item.questionId)) return
    setQuestions((prev) => [...prev, item])
    setSelectedId(item.localId)
  }

  const addInline = (type: QuestionType) => {
    const item = createEmptyInlineQuestion(type)
    setQuestions((prev) => [...prev, item])
    setSelectedId(item.localId)
  }

  const removeQuestion = (localId: string) => {
    setQuestions((prev) => prev.filter((q) => q.localId !== localId))
    if (selectedId === localId) setSelectedId(null)
  }

  const moveQuestion = (localId: string, direction: -1 | 1) => {
    setQuestions((prev) => {
      const index = prev.findIndex((q) => q.localId === localId)
      if (index < 0) return prev
      const next = index + direction
      if (next < 0 || next >= prev.length) return prev
      const copy = [...prev]
      const [item] = copy.splice(index, 1)
      copy.splice(next, 0, item)
      return copy
    })
  }

  const updateQuestion = (updated: BuilderQuestion) => {
    setQuestions((prev) => prev.map((q) => (q.localId === updated.localId ? updated : q)))
  }

  const handleSaveQuestion = async (q: BuilderQuestion) => {
    if (!user?.id) throw new Error('Usuário não autenticado')

    const questionId = await saveBuilderQuestion(q, user.id)
    updateQuestion({ ...q, questionId, source: q.source === 'bank' ? 'bank' : 'inline' })
  }

  const handleSave = async () => {
    setError('')
    if (!title.trim()) {
      setError('Informe o título do formulário')
      return
    }
    if (questions.length === 0) {
      setError('Adicione pelo menos uma questão')
      return
    }
    const missingCorrect = questions.some(
      (q) =>
        q.source === 'inline' &&
        needsAlternatives(q.questionType) &&
        !q.alternatives.some((a) => a.is_correct),
    )
    if (missingCorrect) {
      setError('Marque a alternativa correta em todas as questões manuais')
      return
    }

    const trailError = validateFormTrails(trails)
    if (trailError) {
      setError(trailError)
      setActiveTab('trilhas')
      return
    }

    setLoading(true)
    try {
      await saveForm(
        {
          title,
          description,
          schoolName: schoolSelection?.schoolName || '',
          componenteCurricular,
          isActive,
          status,
          expectedStudents,
          formMode,
          turma,
          finalScreenTitle,
          finalScreenMessage,
          designAccent,
          questions,
          trails,
        },
        user!.id,
        id,
      )
      navigate(resolvedReturnPath ?? '/formularios')
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao salvar'))
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className={cn('fixed inset-0 flex items-center justify-center bg-[#080c14]', collapsed ? 'lg:left-[4.25rem]' : 'lg:left-64')}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500/30 border-t-teal-500" />
      </div>
    )
  }

  return (
    <div className={cn('fixed inset-0 flex flex-col bg-[#080c14] z-10', collapsed ? 'lg:left-[4.25rem]' : 'lg:left-64')}>
      <header className="h-14 shrink-0 border-b border-white/10 grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)_auto] items-center gap-x-3 px-3 sm:px-4 bg-[#0a0e1a]">
        <div className="flex items-center gap-2 min-w-0 md:max-w-[16rem]">
          <button
            type="button"
            onClick={() => navigate(resolvedReturnPath ?? '/formularios')}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="relative group min-w-0 flex-1">
            <Pencil
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-focus-within:text-teal-400"
            />
            <input
              id="form-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do formulário"
              className="w-full min-w-0 bg-white/5 border border-white/10 rounded-lg pl-8 pr-2.5 py-1.5 text-sm font-semibold text-white outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 placeholder:text-slate-600 placeholder:font-normal truncate"
            />
          </div>
        </div>

        <nav className="hidden md:flex items-center justify-center gap-1 min-w-0 overflow-x-auto scrollbar-app px-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3 xl:px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors whitespace-nowrap shrink-0',
                activeTab === tab.id
                  ? 'bg-white/10 text-white ring-1 ring-white/20'
                  : 'text-slate-500 hover:text-slate-300',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-2 shrink-0 col-start-2 md:col-start-3">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
            <Eye size={16} />
            <span className="hidden sm:inline ml-1">Visualizar</span>
          </Button>
          <Button size="sm" loading={loading} onClick={handleSave} className="bg-teal-600 hover:bg-teal-500">
            <Save size={16} />
            <span className="hidden sm:inline ml-1">Salvar</span>
          </Button>
        </div>
      </header>

      <div className="md:hidden px-3 py-2 border-b border-white/10 bg-[#0a0e1a]">
        <Select
          size="sm"
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as BuilderTab)}
          options={TABS.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Tab panels */}
      {activeTab === 'editor' && (
        <div className="flex flex-1 min-h-0 flex-col xl:flex-row overflow-hidden">
          <QuestionBankSidebar
            questions={bankQuestions}
            onAddFromBank={addFromBank}
            onCreateInline={addInline}
          />
          <FormCanvas
            questions={questions}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRemove={removeQuestion}
            onMove={moveQuestion}
          />
          <QuestionInspector
            question={selectedQuestion}
            onChange={updateQuestion}
            onDelete={() => selectedId && removeQuestion(selectedId)}
            onSaveQuestion={handleSaveQuestion}
          />
        </div>
      )}

      {activeTab === 'fluxo' && (
        <div className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto w-full">
          <h2 className="text-lg font-semibold text-white mb-2">Fluxo do formulário</h2>
          <p className="text-sm text-slate-400 mb-6">
            As questões são apresentadas ao aluno na ordem abaixo, uma por vez.
          </p>
          <ol className="space-y-2">
            {questions.map((q, i) => (
              <li
                key={q.localId}
                className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.02]"
              >
                <span className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <span className="text-sm text-white">{q.title}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {activeTab === 'configuracao' && (
        <div className="flex-1 overflow-y-auto p-8 max-w-lg mx-auto w-full space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Configuração</h2>
            <p className="text-sm text-slate-400 mb-6">
              Defina o modo, a escola, a série e demais parâmetros do formulário.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Modo</label>
            <FormModeToggle value={formMode} onChange={setFormMode} />
            <p className="text-xs text-slate-500 mt-2">
              No modo gamificado, o aluno vê emojis animados e mensagens de incentivo — sem
              pontuação, ranking ou trilha visível. A trilha recomendada fica disponível apenas
              para o professor.
            </p>
          </div>

          <SchoolPicker
            schools={schools}
            loading={schoolsLoading}
            value={schoolSelection}
            onChange={setSchoolSelection}
          />

          <Select
            label="Série"
            size="sm"
            value={turma}
            onChange={(e) => setTurma(e.target.value)}
            options={TURMA_OPTIONS}
          />

          <Select
            label="Área do conhecimento"
            size="sm"
            value={componenteCurricular}
            onChange={(e) => setComponenteCurricular(e.target.value)}
            options={AREA_OPTIONS}
            disabled={Boolean(presetComponente)}
          />

          <Select
            label="Status"
            size="sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as FormStatus)}
            options={Object.entries(FORM_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Formulário</label>
            <div className="flex rounded-xl border border-white/10 p-1 bg-white/[0.03] w-fit">
              <button
                type="button"
                onClick={() => setIsActive(true)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/40'
                    : 'text-slate-500 hover:text-slate-300',
                )}
              >
                Ativo
              </button>
              <button
                type="button"
                onClick={() => setIsActive(false)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  !isActive
                    ? 'bg-white/10 text-white ring-1 ring-white/15'
                    : 'text-slate-500 hover:text-slate-300',
                )}
              >
                Inativo
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Cor de destaque</label>
            <input
              type="color"
              value={designAccent}
              onChange={(e) => setDesignAccent(e.target.value)}
              className="h-10 w-full rounded-xl cursor-pointer bg-transparent"
            />
          </div>

          <Input
            label="Total esperado de alunos"
            size="sm"
            type="number"
            min="0"
            value={expectedStudents}
            onChange={(e) => setExpectedStudents(e.target.value)}
          />

          <div className="border-t border-white/10 pt-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-white mb-1">Tela final</h3>
              <p className="text-sm text-slate-400">
                Mensagem exibida ao aluno após enviar as respostas. O aluno não verá percentual de
                acertos nem pontuação — apenas esta mensagem. A trilha de recomposição é atribuída
                automaticamente e exibida somente na área do professor.
              </p>
            </div>

            <Input
              label="Título da tela final"
              size="sm"
              value={finalScreenTitle}
              onChange={(e) => setFinalScreenTitle(e.target.value)}
            />

            <Textarea
              label="Mensagem"
              value={finalScreenMessage}
              onChange={(e) => setFinalScreenMessage(e.target.value)}
            />

            <div
              className="rounded-2xl border border-white/10 p-8 text-center"
              style={{ borderColor: `${designAccent}40` }}
            >
              <h3 className="text-xl font-bold text-white mb-2">{finalScreenTitle}</h3>
              <p className="text-slate-400 text-sm">{finalScreenMessage}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'trilhas' && (
        <FormTrailsPanel trails={trails} onChange={setTrails} />
      )}
      <FormPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        config={{
          title,
          formMode,
          designAccent,
          finalScreenTitle,
          finalScreenMessage,
          questions,
        }}
      />
    </div>
  )
}
