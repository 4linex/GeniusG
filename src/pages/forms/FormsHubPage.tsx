import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { CardHeader } from '@/components/ui/Card'
import { FormsStatsBar } from '@/components/forms/FormsStatsBar'
import { FormsComponentsList } from '@/components/forms/FormsComponentsList'
import { computeFormBankStats } from '@/lib/formBank'
import { useFormsHubData } from '@/hooks/useFormsHubData'
import { Plus } from 'lucide-react'

export function FormsHubPage() {
  const { forms, loading, error, canManageForms } = useFormsHubData()
  const bankStats = useMemo(() => computeFormBankStats(forms), [forms])

  return (
    <div>
      <CardHeader
        title="Formulários"
        description={
          canManageForms
            ? 'Banco organizado por componente curricular — selecione uma área para ver e gerenciar os formulários'
            : 'Selecione um componente para visualizar formulários e criar links para os alunos'
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
        <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <FormsStatsBar
        totalForms={bankStats.totalForms}
        componentCount={bankStats.componentCount}
        avgQuestions={bankStats.avgQuestions}
        activeForms={bankStats.activeForms}
      />

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Componentes curriculares</h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Clique em &quot;Ver formulários&quot; para abrir o banco do componente
        </p>
      </div>

      <FormsComponentsList components={bankStats.components} loading={loading} />

      {!loading && forms.length === 0 && (
        <p className="text-center text-sm text-slate-500 mt-6">
          Nenhum formulário cadastrado. Escolha um componente ou clique em Novo Formulário.
        </p>
      )}
    </div>
  )
}
