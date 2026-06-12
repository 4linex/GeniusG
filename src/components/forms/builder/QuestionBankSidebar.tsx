import { useMemo, useState } from 'react'
import { ChevronDown, Database } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { QuestionTypePicker } from '@/components/forms/QuestionTypePicker'
import {
  ANO_SERIE_MVP,
  AREA_OPTIONS,
  COMPONENTE_MVP,
  TURMA_OPTIONS,
  type Question,
} from '@/types/database'
import type { QuestionAlternative } from '@/types/database'
import type { QuestionType } from '@/types/questionTypes'
import { questionToBuilder } from '@/components/forms/builder/types'
import { loadQuestionAlternatives } from '@/lib/formBuilder'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  title: string
  icon?: React.ReactNode
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  className?: string
  contentClassName?: string
}

function CollapsibleSection({
  title,
  icon,
  open,
  onToggle,
  children,
  className,
  contentClassName,
}: CollapsibleSectionProps) {
  return (
    <div className={cn('border-b border-white/10 shrink-0', className)}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 p-4 hover:bg-white/[0.02] transition-colors"
        aria-expanded={open}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          {icon}
          {title}
        </span>
        <ChevronDown
          size={16}
          className={cn('text-slate-500 shrink-0 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      {open && <div className={cn('px-4 pb-4', contentClassName)}>{children}</div>}
    </div>
  )
}

interface QuestionBankSidebarProps {
  questions: Question[]
  onAddFromBank: (item: ReturnType<typeof questionToBuilder>) => void
  onCreateInline: (type: QuestionType) => void
}

export function QuestionBankSidebar({
  questions,
  onAddFromBank,
  onCreateInline,
}: QuestionBankSidebarProps) {
  const [turma, setTurma] = useState(ANO_SERIE_MVP)
  const [area, setArea] = useState(COMPONENTE_MVP)
  const [assunto, setAssunto] = useState('')
  const [addingId, setAddingId] = useState<string | null>(null)
  const [elementosOpen, setElementosOpen] = useState(true)
  const [bancoOpen, setBancoOpen] = useState(true)

  const assuntos = useMemo(() => {
    const set = new Set<string>()
    for (const q of questions) {
      if (q.conteudo_programatico) set.add(q.conteudo_programatico)
    }
    return Array.from(set).sort()
  }, [questions])

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (q.ano_serie !== turma) return false
      if (q.componente_curricular !== area) return false
      if (assunto && q.conteudo_programatico !== assunto) return false
      return true
    })
  }, [questions, turma, area, assunto])

  const handleAdd = async (q: Question) => {
    setAddingId(q.id)
    const alts = (await loadQuestionAlternatives(q.id)) as QuestionAlternative[]
    onAddFromBank(questionToBuilder(q, alts))
    setAddingId(null)
  }

  return (
    <aside className="w-full xl:w-72 shrink-0 border-r border-white/10 border-b xl:border-b-0 bg-[#0d1220] flex flex-col min-h-0 max-h-64 xl:max-h-none overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-app">
        <CollapsibleSection
          title="Elementos"
          open={elementosOpen}
          onToggle={() => setElementosOpen((v) => !v)}
          contentClassName="pt-0"
        >
          <QuestionTypePicker compact addOnClick onChange={onCreateInline} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Banco de questões"
          icon={<Database size={14} />}
          open={bancoOpen}
          onToggle={() => setBancoOpen((v) => !v)}
          contentClassName="space-y-3 pt-0"
        >
          <Select
            label="Turma"
            value={turma}
            onChange={(e) => setTurma(e.target.value)}
            options={TURMA_OPTIONS}
          />
          <Select
            label="Área do conhecimento"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            options={AREA_OPTIONS}
          />
          <Select
            label="Assunto"
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            options={[
              { value: '', label: 'Todos os assuntos' },
              ...assuntos.map((a) => ({ value: a, label: a })),
            ]}
          />
        </CollapsibleSection>

        {bancoOpen && (
          <div className="p-3 space-y-2 pb-4">
            {filtered.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Nenhuma questão neste filtro.</p>
            ) : (
              filtered.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  disabled={addingId === q.id}
                  onClick={() => handleAdd(q)}
                  className="w-full text-left p-3 rounded-xl border border-white/10 hover:border-primary-500/40 hover:bg-white/5 transition-colors"
                >
                  <p className="text-sm font-medium text-white truncate">{q.title}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {q.conteudo_programatico || 'Sem assunto'}
                  </p>
                  {q.nivel_dificuldade && (
                    <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-300">
                      {q.nivel_dificuldade}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
