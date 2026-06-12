import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader } from '@/components/ui/Card'
import { TrailCard } from '@/components/trails/TrailCard'
import type { LearningTrail } from '@/types/database'

export function ProfessorTrailsPage() {
  const [trails, setTrails] = useState<LearningTrail[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('learning_trails')
        .select('*')
        .order('title')

      if (data) setTrails(data as LearningTrail[])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      <CardHeader
        title="Banco de Trilhas"
        description="Visualize as trilhas cadastradas. A escolha e as faixas de % de acerto são feitas ao editar cada formulário."
      />

      <Card className="mb-6 border-white/10 bg-white/[0.02]">
        <p className="text-sm text-slate-400">
          Você pode visualizar e abrir as trilhas, mas não cadastrar ou alterar. O administrador mantém o banco; ao criar um formulário, selecione quais trilhas o aluno pode receber.
        </p>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
        </div>
      ) : trails.length === 0 ? (
        <Card>
          <p className="text-slate-400 text-center py-8">
            Nenhuma trilha cadastrada no banco.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {trails.map((trail) => (
            <TrailCard key={trail.id} trail={trail} readOnly />
          ))}
        </div>
      )}
    </div>
  )
}
