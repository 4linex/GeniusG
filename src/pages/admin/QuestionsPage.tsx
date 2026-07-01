import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { CardHeader } from '@/components/ui/Card'
import { QuestionsStatsBar } from '@/components/questions/QuestionsStatsBar'
import { QuestionsComponentsList } from '@/components/questions/QuestionsComponentsList'
import { computeQuestionBankStats } from '@/lib/questionComponents'
import { type Question } from '@/types/database'
import { Plus } from 'lucide-react'

export function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  const loadQuestions = async () => {
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('questions')
      .select('id, componente_curricular, nivel_dificuldade, point_value, created_at')
      .is('archived_at', null)
      .order('created_at', { ascending: false })

    if (!loadError && data) setQuestions(data as Question[])
    setLoading(false)
  }

  useEffect(() => {
    loadQuestions()
  }, [])

  const bankStats = useMemo(() => computeQuestionBankStats(questions), [questions])

  return (
    <div>
      <CardHeader
        title="Questões"
        description="Banco organizado por componente curricular — selecione uma área para ver e gerenciar as questões"
        action={
          <Link to="/admin/questoes/nova">
            <Button>
              <Plus size={16} />
              Nova Questão
            </Button>
          </Link>
        }
      />

      <QuestionsStatsBar
        totalQuestions={bankStats.totalQuestions}
        componentCount={bankStats.componentCount}
        avgPoints={bankStats.avgPoints}
        avgDifficulty={bankStats.avgDifficulty}
      />

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Componentes curriculares</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Clique em &quot;Ver questões&quot; para abrir o banco do componente
        </p>
      </div>

      <QuestionsComponentsList components={bankStats.components} loading={loading} />

      {!loading && questions.length === 0 && (
        <p className="text-center text-sm text-slate-500 mt-6">
          Nenhuma questão cadastrada. Escolha um componente e use a aba Escrever, ou clique em Nova
          Questão.
        </p>
      )}
    </div>
  )
}
