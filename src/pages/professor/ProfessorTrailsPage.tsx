import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader } from '@/components/ui/Card'
import { TrailCard } from '@/components/trails/TrailCard'
import { TrailBankDetail } from '@/components/trails/TrailBankDetail'
import { TrailAreaToggle } from '@/components/trails/TrailAreaToggle'
import { PROFESSOR_TRAIL_COLUMNS, type TrailAreaTab } from '@/lib/trailAreas'
import type { LearningTrail } from '@/types/database'

export function ProfessorTrailsPage() {
  const [trails, setTrails] = useState<LearningTrail[]>([])
  const [loading, setLoading] = useState(true)
  const [areaView, setAreaView] = useState<TrailAreaTab>('professor')
  const [selectedTrail, setSelectedTrail] = useState<LearningTrail | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('learning_trails')
        .select(PROFESSOR_TRAIL_COLUMNS)
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
        belowDescription={<TrailAreaToggle value={areaView} onChange={setAreaView} />}
        description="Selecione a área do professor ou do aluno. Clique em uma trilha para ver o conteúdo completo."
      />

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
            <TrailCard
              key={trail.id}
              trail={trail}
              areaView={areaView}
              readOnly
              onOpen={() => setSelectedTrail(trail)}
            />
          ))}
        </div>
      )}

      {selectedTrail && (
        <TrailBankDetail
          trail={selectedTrail}
          open
          initialTab={areaView}
          onClose={() => setSelectedTrail(null)}
        />
      )}
    </div>
  )
}
