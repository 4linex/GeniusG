import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { FormModal } from '@/components/ui/FormModal'
import { CityPicker, type CitySelection } from '@/components/schools/CityPicker'
import { SchoolClassesEditor } from '@/components/schools/SchoolClassesEditor'
import {
  createSchool,
  deleteSchool,
  formatSchoolMunicipio,
  updateSchool,
} from '@/lib/schools'
import {
  getClassNamesForSchool,
  groupClassesBySchool,
  listAllSchoolClasses,
  listSchoolClasses,
  syncSchoolClasses,
} from '@/lib/schoolClasses'
import { invalidateSchoolsCache, useSchools } from '@/hooks/useSchools'
import type { School, SchoolClass } from '@/types/database'
import { formatDate } from '@/lib/utils'
import { Building2, MapPin, Pencil, Plus, Trash2, Users } from 'lucide-react'

const EMPTY_CITY: CitySelection = { state_uf: '', municipio: '' }

export function SchoolsSection() {
  const { schools, loading, error, reload } = useSchools()
  const [classesBySchool, setClassesBySchool] = useState(() => new Map<string, SchoolClass[]>())
  const [classesLoading, setClassesLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<School | null>(null)
  const [name, setName] = useState('')
  const [city, setCity] = useState<CitySelection>(EMPTY_CITY)
  const [turmas, setTurmas] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadClasses = async () => {
    setClassesLoading(true)
    try {
      const rows = await listAllSchoolClasses()
      setClassesBySchool(groupClassesBySchool(rows))
    } catch {
      setClassesBySchool(new Map())
    } finally {
      setClassesLoading(false)
    }
  }

  useEffect(() => {
    void loadClasses()
  }, [schools])

  const resetForm = () => {
    setName('')
    setCity(EMPTY_CITY)
    setTurmas([])
    setFormError('')
    setEditing(null)
  }

  const openCreate = () => {
    resetForm()
    setSuccess('')
    setShowForm(true)
  }

  const openEdit = async (school: School) => {
    setEditing(school)
    setName(school.name)
    setCity({ state_uf: school.state_uf, municipio: school.municipio })
    setFormError('')
    setShowForm(true)
    try {
      const rows = await listSchoolClasses(school.id)
      setTurmas(rows.map((row) => row.name))
    } catch {
      setTurmas(getClassNamesForSchool(classesBySchool, school.id))
    }
  }

  const closeForm = () => {
    setShowForm(false)
    resetForm()
  }

  useEffect(() => {
    if (!showForm) resetForm()
  }, [showForm])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!name.trim()) {
      setFormError('Informe o nome da escola')
      return
    }
    if (!city.state_uf || !city.municipio) {
      setFormError('Selecione o estado e o município')
      return
    }

    setSubmitting(true)
    try {
      if (editing) {
        await updateSchool(editing.id, {
          name,
          municipio: city.municipio,
          state_uf: city.state_uf,
        })
        await syncSchoolClasses(editing.id, turmas)
        setSuccess('Escola atualizada com sucesso!')
      } else {
        const school = await createSchool({
          name,
          municipio: city.municipio,
          state_uf: city.state_uf,
        })
        await syncSchoolClasses(school.id, turmas)
        setSuccess('Escola cadastrada com sucesso!')
      }
      invalidateSchoolsCache()
      closeForm()
      await Promise.all([reload(true), loadClasses()])
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar escola')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteSchool(deleteTarget.id)
      invalidateSchoolsCache()
      setDeleteTarget(null)
      setSuccess('Escola excluída.')
      await Promise.all([reload(true), loadClasses()])
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao excluir escola')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Escolas</h2>
          <p className="text-sm text-slate-400 mt-1">
            Cadastre escolas com nome, localização e turmas. Os dados são usados no cadastro de
            professores, links de formulário e filtros do sistema.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nova escola
        </Button>
      </div>

      {success && (
        <div className="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm text-emerald-400">
          {success}
        </div>
      )}

      {(error || formError) && !showForm && (
        <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
          {error || formError}
        </div>
      )}

      <FormModal
        open={showForm}
        onClose={closeForm}
        title={editing ? 'Editar escola' : 'Nova escola'}
        description="Informe o nome da unidade, selecione o município via API do IBGE e cadastre as turmas."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome da escola"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: E.M. Professor João Silva"
            required
          />
          <CityPicker value={city} onChange={setCity} />
          <SchoolClassesEditor value={turmas} onChange={setTurmas} disabled={submitting} />
          {formError && <p className="text-sm text-red-400">{formError}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={closeForm}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {editing ? 'Salvar alterações' : 'Cadastrar escola'}
            </Button>
          </div>
        </form>
      </FormModal>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
        </div>
      ) : schools.length === 0 ? (
        <Card>
          <p className="text-slate-400 text-center py-8">
            Nenhuma escola cadastrada. Clique em Nova escola para começar.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {schools.map((school) => {
            const classNames = getClassNamesForSchool(classesBySchool, school.id)
            return (
              <Card key={school.id} hover>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-primary-400 shrink-0" />
                      <h3 className="font-medium text-white truncate">{school.name}</h3>
                    </div>
                    <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
                      <MapPin size={14} className="shrink-0" />
                      {formatSchoolMunicipio(school)}
                    </p>
                    {!classesLoading && classNames.length > 0 && (
                      <p className="text-xs text-slate-500 mt-2 flex items-start gap-1.5">
                        <Users size={13} className="shrink-0 mt-0.5" />
                        <span>
                          Turmas: {classNames.join(', ')}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-xs text-slate-500 hidden sm:block">
                      {formatDate(school.created_at)}
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(school)}>
                      <Pencil size={16} className="text-slate-400" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(school)}>
                      <Trash2 size={16} className="text-red-400" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Excluir escola"
        description="As turmas cadastradas serão removidas. Professores vinculados terão o vínculo removido. Os dados históricos de respostas permanecem."
        itemName={
          deleteTarget
            ? `${deleteTarget.name} (${formatSchoolMunicipio(deleteTarget)})`
            : undefined
        }
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
