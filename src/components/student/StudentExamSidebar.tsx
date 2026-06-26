import { FileText, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

const EXAM_TIPS = [
  'Leia cada questão com atenção antes de responder.',
  'Analise todas as alternativas antes de marcar.',
  'Você pode voltar às questões anteriores a qualquer momento.',
  'Mantenha a prova em tela cheia até finalizar.',
]

interface StudentExamSidebarProps {
  formTitle: string
  totalQuestions: number
  currentIndex: number
  answeredCount: number
  answers: Record<string, string>
  questionIds: string[]
  onNavigate: (index: number) => void
}

function CircularProgress({ percent }: { percent: number }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className="relative flex items-center justify-center w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#2563eb"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold text-gray-900">{Math.round(percent)}%</span>
        <span className="text-xs text-gray-500">concluído</span>
      </div>
    </div>
  )
}

export function StudentExamSidebar({
  formTitle,
  totalQuestions,
  currentIndex,
  answeredCount,
  answers,
  questionIds,
  onNavigate,
}: StudentExamSidebarProps) {
  const pendingCount = totalQuestions - answeredCount
  const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0
  const answeredPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0
  const pendingPercent = totalQuestions > 0 ? Math.round((pendingCount / totalQuestions) * 100) : 0

  return (
    <aside className="w-full lg:w-80 shrink-0 bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-6 shadow-sm">
      <div className="flex items-center gap-2 text-gray-900">
        <FileText size={20} className="text-blue-600 shrink-0" />
        <h2 className="font-semibold text-base leading-tight">{formTitle || 'Prova Online'}</h2>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Progresso da prova</p>
        <CircularProgress percent={progressPercent} />
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Resumo</p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-gray-600">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Respondidas
            </span>
            <span className="text-gray-900 font-medium">
              {answeredCount} ({answeredPercent}%)
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-gray-600">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Pendentes
            </span>
            <span className="text-gray-900 font-medium">
              {pendingCount} ({pendingPercent}%)
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-gray-600">
              <span className="w-2 h-2 rounded-full bg-gray-300" />
              Total de questões
            </span>
            <span className="text-gray-900 font-medium">{totalQuestions}</span>
          </li>
        </ul>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Navegação</p>
        <nav className="space-y-1 max-h-48 overflow-y-auto">
          {questionIds.map((id, index) => {
            const isCurrent = index === currentIndex
            const isAnswered = Boolean(answers[id])
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(index)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                  isCurrent
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50',
                )}
              >
                <span>Questão {index + 1}</span>
                <span className={cn('text-xs', isCurrent ? 'text-blue-600' : 'text-gray-400')}>
                  {isCurrent ? 'Atual' : isAnswered ? 'Respondida' : 'Pendente'}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto rounded-xl bg-amber-50 border border-amber-100 p-4">
        <div className="flex items-center gap-2 text-amber-800 font-medium text-sm mb-2">
          <Lightbulb size={16} />
          Dicas importantes
        </div>
        <ul className="space-y-1.5 text-xs text-amber-900/80 list-disc list-inside">
          {EXAM_TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
