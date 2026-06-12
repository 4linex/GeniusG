import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { TrailCard } from '@/components/trails/TrailCard'
import { TrailBankFormModal } from '@/components/trails/TrailBankFormModal'
import { TrailBankDetail } from '@/components/trails/TrailBankDetail'
import { TrailAreaToggle } from '@/components/trails/TrailAreaToggle'
import { PROFESSOR_TRAIL_COLUMNS, type TrailAreaTab } from '@/lib/trailAreas'
import type { LearningTrail } from '@/types/database'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export function AdminTrailsPage() {
  const { user } = useAuth()
  const [trails, setTrails] = useState<LearningTrail[]>([])
  const [loading, setLoading] = useState(true)
  const [areaView, setAreaView] = useState<TrailAreaTab>('professor')
  const [showForm, setShowForm] = useState(false)
  const [editingTrail, setEditingTrail] = useState<LearningTrail | null>(null)
  const [viewTrail, setViewTrail] = useState<LearningTrail | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LearningTrail | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const loadTrails = async () => {
    const { data } = await supabase
      .from('learning_trails')
      .select(PROFESSOR_TRAIL_COLUMNS)
      .order('title')

    if (data) setTrails(data as LearningTrail[])
    setLoading(false)
  }

  useEffect(() => {
    loadTrails()
  }, [])

  const resetForm = () => {
    setEditingTrail(null)
    setShowForm(false)
  }

  const handleEdit = (trail: LearningTrail) => {
    setEditingTrail(trail)
    setShowForm(true)
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
        belowDescription={<TrailAreaToggle value={areaView} onChange={setAreaView} />}
        description="Cadastre trilhas com área pedagógica para o professor e conteúdo simplificado para o aluno. Ao criar um formulário, escolha quais trilhas usar e defina a faixa de % de acerto."
        action={
          <Button onClick={() => { setEditingTrail(null); setShowForm(true) }}>
            <Plus size={16} />
            Nova Trilha
          </Button>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">{error}</div>
      )}

      <TrailBankFormModal
        open={showForm}
        editingTrail={editingTrail}
        userId={user?.id}
        onSaved={() => {
          resetForm()
          loadTrails()
        }}
        onClose={resetForm}
      />

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
              areaView={areaView}
              onOpen={() => setViewTrail(trail)}
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

      {viewTrail && (
        <TrailBankDetail
          trail={viewTrail}
          open
          initialTab={areaView}
          onClose={() => setViewTrail(null)}
        />
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
