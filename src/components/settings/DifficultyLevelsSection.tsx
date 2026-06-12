import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { FormModal } from '@/components/ui/FormModal'
import {
  createDifficultyLevel,
  deleteDifficultyLevel,
  updateDifficultyLevel,
  validateDifficultyPointValue,
  DIFFICULTY_POINT_HINT,
  DIFFICULTY_POINT_MIN,
  DIFFICULTY_POINT_MAX,
} from '@/lib/difficultyLevels'
import { useDifficultyLevels } from '@/hooks/useDifficultyLevels'
import type { DifficultyLevel } from '@/types/database'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'

export function DifficultyLevelsSection() {
  const { levels, loading, error, reload } = useDifficultyLevels()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [pointValue, setPointValue] = useState('1')
  const [nameError, setNameError] = useState('')
  const [pointError, setPointError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [listError, setListError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPointValue, setEditPointValue] = useState('')
  const [editNameError, setEditNameError] = useState('')
  const [editPointError, setEditPointError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<DifficultyLevel | null>(null)
  const [deleting, setDeleting] = useState(false)

  const resetCreateForm = () => {
    setName('')
    setPointValue('1')
    setNameError('')
    setPointError('')
  }

  const openCreateModal = () => {
    resetCreateForm()
    setListError('')
    setShowForm(true)
  }

  const closeCreateModal = () => {
    setShowForm(false)
    resetCreateForm()
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameError('')
    setPointError('')

    const parsed = parseFloat(pointValue.replace(',', '.'))
    let hasError = false

    if (!name.trim()) {
      setNameError('Informe o nome do nível')
      hasError = true
    }

    const pointValidation = validateDifficultyPointValue(parsed)
    if (pointValidation) {
      setPointError(pointValidation)
      hasError = true
    }

    if (hasError) return

    setSubmitting(true)
    try {
      await createDifficultyLevel(name, parsed, levels.length)
      closeCreateModal()
      reload()
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Não foi possível cadastrar o nível')
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (level: DifficultyLevel) => {
    setEditingId(level.id)
    setEditName(level.name)
    setEditPointValue(String(level.point_value))
    setEditNameError('')
    setEditPointError('')
    setListError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditPointValue('')
    setEditNameError('')
    setEditPointError('')
  }

  const saveEdit = async (id: string) => {
    setEditNameError('')
    setEditPointError('')

    const parsed = parseFloat(editPointValue.replace(',', '.'))
    let hasError = false

    if (!editName.trim()) {
      setEditNameError('Informe o nome do nível')
      hasError = true
    }

    const pointValidation = validateDifficultyPointValue(parsed)
    if (pointValidation) {
      setEditPointError(pointValidation)
      hasError = true
    }

    if (hasError) return

    setSubmitting(true)
    setListError('')
    try {
      await updateDifficultyLevel(id, { name: editName.trim(), point_value: parsed })
      cancelEdit()
      reload()
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Não foi possível salvar o nível')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setListError('')
    try {
      await deleteDifficultyLevel(deleteTarget.id)
      setDeleteTarget(null)
      reload()
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Níveis de dificuldade</h2>
          <p className="text-sm text-slate-400 mt-1">
            Cadastre níveis e defina a pontuação padrão de cada um. Ao criar questões, a pontuação
            é sugerida automaticamente conforme o nível selecionado.
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus size={16} />
          Novo nível
        </Button>
      </div>

      <FormModal
        open={showForm}
        onClose={closeCreateModal}
        title="Novo nível de dificuldade"
        description="Defina o nome e a pontuação padrão por acerto neste nível."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Nome do nível"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (nameError) setNameError('')
            }}
            placeholder="Ex.: Fácil, Médio, Difícil"
            error={nameError || undefined}
            required
          />
          <div>
            <Input
              label="Pontuação padrão (pts por acerto)"
              type="number"
              min={DIFFICULTY_POINT_MIN}
              max={DIFFICULTY_POINT_MAX}
              step={0.5}
              value={pointValue}
              onChange={(e) => {
                setPointValue(e.target.value)
                if (pointError) setPointError('')
              }}
              error={pointError || undefined}
              required
            />
            {!pointError && (
              <p className="text-xs text-slate-500 mt-1">{DIFFICULTY_POINT_HINT}</p>
            )}
          </div>
          {listError && showForm && (
            <p className="text-sm text-red-400">{listError}</p>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={closeCreateModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              Cadastrar nível
            </Button>
          </div>
        </form>
      </FormModal>

      {error && !showForm && (
        <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {listError && !showForm && (
        <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
          {listError}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
        </div>
      ) : levels.length === 0 ? (
        <Card>
          <p className="text-slate-400 text-center py-8">Nenhum nível cadastrado.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {levels.map((level) => (
            <Card key={level.id}>
              {editingId === level.id ? (
                <div className="flex flex-wrap items-end gap-4">
                  <Input
                    label="Nome"
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value)
                      if (editNameError) setEditNameError('')
                    }}
                    error={editNameError || undefined}
                    className="flex-1 min-w-[140px]"
                  />
                  <div className="w-full sm:w-40">
                    <Input
                      label="Pontuação"
                      type="number"
                      min={DIFFICULTY_POINT_MIN}
                      max={DIFFICULTY_POINT_MAX}
                      step={0.5}
                      value={editPointValue}
                      onChange={(e) => {
                        setEditPointValue(e.target.value)
                        if (editPointError) setEditPointError('')
                      }}
                      error={editPointError || undefined}
                    />
                    {!editPointError && (
                      <p className="text-xs text-slate-500 mt-1">{DIFFICULTY_POINT_HINT}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(level.id)} loading={submitting}>
                      <Check size={16} />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={cancelEdit}>
                      <X size={16} />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-medium text-white">{level.name}</h3>
                    <Badge variant="warning">
                      {level.point_value} {level.point_value === 1 ? 'pt' : 'pts'} por acerto
                    </Badge>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(level)}>
                      <Pencil size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(level)}>
                      <Trash2 size={16} className="text-red-400" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Excluir nível de dificuldade"
        description="Questões que usam este nível manterão o nome salvo, mas ele não aparecerá mais nas opções."
        itemName={deleteTarget?.name}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
