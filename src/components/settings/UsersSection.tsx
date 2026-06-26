import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { FormModal } from '@/components/ui/FormModal'
import { formatDate } from '@/lib/utils'
import type { Profile, School, UserRole } from '@/types/database'
import { ROLE_LABELS } from '@/types/database'
import { UserPlus, Trash2, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  ProfileLocationsPicker,
  type ProfileLocationsValue,
} from '@/components/schools/ProfileLocationsPicker'
import { listAllSchoolClasses } from '@/lib/schoolClasses'
import { formatSchoolMunicipio } from '@/lib/schools'
import {
  getProfileMunicipios,
  getProfileSchoolIds,
  getProfileSchoolNames,
} from '@/lib/profileLocations'
import { useSchools } from '@/hooks/useSchools'

const EMPTY_LOCATIONS: ProfileLocationsValue = {
  municipios: [],
  schoolIds: [],
  turmas: [],
}

function formatProfileLocations(profile: Profile): string | null {
  const parts: string[] = []
  const municipios = getProfileMunicipios(profile)
  const schools = getProfileSchoolNames(profile)
  if (municipios.length) parts.push(municipios.join(', '))
  if (schools.length) parts.push(schools.join(', '))
  if (profile.turmas?.length) parts.push(`Turmas: ${profile.turmas.join(', ')}`)
  return parts.length ? parts.join(' · ') : null
}

function resolveLocationsFromProfile(profile: Profile, schools: School[]): ProfileLocationsValue {
  let schoolIds = getProfileSchoolIds(profile)
  if (schoolIds.length === 0) {
    const names = getProfileSchoolNames(profile)
    schoolIds = schools.filter((s) => names.includes(s.name)).map((s) => s.id)
  }
  return {
    municipios: getProfileMunicipios(profile),
    schoolIds,
    turmas: profile.turmas ?? [],
  }
}

function canManageTarget(
  target: Profile,
  currentUserId: string | undefined,
  isRoot: boolean,
): boolean {
  if (target.id === currentUserId) return false
  if (target.role === 'root') return false
  if (isRoot) return target.role === 'professor' || target.role === 'admin'
  return target.role === 'professor'
}

export function UsersSection() {
  const { user, registerUser, updateUser, deleteUser, hasRole } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { schools, loading: schoolsLoading } = useSchools()
  const [locations, setLocations] = useState<ProfileLocationsValue>(EMPTY_LOCATIONS)
  const [role, setRole] = useState<UserRole>('professor')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isRoot = hasRole('root')
  const isEditing = Boolean(editingUser)

  const loadUsers = async () => {
    setLoading(true)
    const roles = isRoot ? ['professor', 'admin'] : ['professor']
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('role', roles)
      .order('created_at', { ascending: false })

    if (data) setUsers(data as Profile[])
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [isRoot])

  useRefreshOnFocus(loadUsers, true)

  const resetForm = () => {
    setFullName('')
    setEmail('')
    setPassword('')
    setLocations(EMPTY_LOCATIONS)
    setRole('professor')
    setEditingUser(null)
    setError('')
  }

  const openCreateModal = () => {
    resetForm()
    setSuccess('')
    setShowForm(true)
  }

  const openEditModal = (profile: Profile) => {
    setEditingUser(profile)
    setFullName(profile.full_name)
    setEmail(profile.email)
    setPassword('')
    setRole(profile.role)
    setLocations(resolveLocationsFromProfile(profile, schools))
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  const closeFormModal = () => {
    setShowForm(false)
    resetForm()
  }

  const validateLocations = async (): Promise<string | null> => {
    if ((role === 'professor' || role === 'admin') && locations.schoolIds.length === 0) {
      return role === 'professor'
        ? 'Selecione ao menos uma escola do professor'
        : 'Selecione ao menos uma escola ou município do administrador'
    }

    if (role === 'professor' && locations.schoolIds.length > 0) {
      const allClasses = await listAllSchoolClasses()
      const schoolIdSet = new Set(locations.schoolIds)
      const hasClasses = allClasses.some((row) => schoolIdSet.has(row.school_id))
      if (hasClasses && locations.turmas.length === 0) {
        return 'Selecione ao menos uma turma do professor'
      }
    }

    return null
  }

  const buildLocationPayload = () => {
    const selectedSchools = schools.filter((s) => locations.schoolIds.includes(s.id))
    const municipios =
      locations.municipios.length > 0
        ? locations.municipios
        : [...new Set(selectedSchools.map((s) => formatSchoolMunicipio(s)))]

    return {
      municipios,
      school_names: selectedSchools.map((s) => s.name),
      school_ids: locations.schoolIds,
      turmas: role === 'professor' ? locations.turmas : undefined,
      municipio: municipios[0],
      school_name: selectedSchools[0]?.name,
      school_id: locations.schoolIds[0],
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const validationError = await validateLocations()
    if (validationError) {
      setError(validationError)
      return
    }

    const locationPayload = buildLocationPayload()

    setSubmitting(true)
    try {
      if (isEditing && editingUser) {
        await updateUser({
          user_id: editingUser.id,
          email,
          full_name: fullName,
          role,
          ...locationPayload,
          ...(password.trim() ? { password } : {}),
        })
        setSuccess('Usuário atualizado com sucesso!')
      } else {
        if (!password.trim()) {
          setError('Informe uma senha para o novo usuário')
          setSubmitting(false)
          return
        }
        await registerUser({
          email,
          password,
          full_name: fullName,
          role,
          ...locationPayload,
        })
        setSuccess('Usuário cadastrado com sucesso!')
      }
      closeFormModal()
      loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : isEditing ? 'Erro ao atualizar' : 'Erro ao cadastrar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setError('')
    try {
      await deleteUser(deleteTarget.id)
      setDeleteTarget(null)
      loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  const roleOptions = isRoot
    ? [
        { value: 'professor', label: 'Professor' },
        { value: 'admin', label: 'Administrador' },
      ]
    : [{ value: 'professor', label: 'Professor' }]

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Usuários</h2>
          <p className="text-sm text-slate-400 mt-1">
            {isRoot
              ? 'Cadastro, edição e exclusão de usuários (professor ou administrador)'
              : 'Cadastro, edição e exclusão de usuários com perfil professor'}
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <UserPlus size={16} />
          Novo usuário
        </Button>
      </div>

      {success && (
        <div className="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm text-emerald-400">
          {success}
        </div>
      )}

      <FormModal
        open={showForm}
        onClose={closeFormModal}
        title={isEditing ? 'Editar usuário' : 'Novo usuário'}
        description={
          isEditing
            ? 'Altere os dados do perfil. Deixe a senha em branco para mantê-la.'
            : isRoot
              ? 'Cadastre um professor ou administrador no sistema.'
              : 'Cadastre um usuário com perfil professor.'
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input
            label={isEditing ? 'Nova senha (opcional)' : 'Senha'}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!isEditing}
            minLength={isEditing ? undefined : 6}
            placeholder={isEditing ? 'Deixe em branco para não alterar' : undefined}
          />
          <Select
            label="Perfil de acesso"
            value={role}
            onChange={(e) => {
              const nextRole = e.target.value as UserRole
              setRole(nextRole)
              if (nextRole !== 'professor' && nextRole !== 'admin') {
                setLocations(EMPTY_LOCATIONS)
              }
              if (nextRole !== 'professor') {
                setLocations((prev) => ({ ...prev, turmas: [] }))
              }
            }}
            options={roleOptions}
            disabled={isEditing && !isRoot}
          />
          {(role === 'professor' || role === 'admin') && (
            <ProfileLocationsPicker
              schools={schools}
              loading={schoolsLoading}
              value={locations}
              onChange={setLocations}
              disabled={submitting}
              showTurmas={role === 'professor'}
              requireTurmas={role === 'professor'}
            />
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={closeFormModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {isEditing ? 'Salvar alterações' : 'Cadastrar usuário'}
            </Button>
          </div>
        </form>
      </FormModal>

      {error && !showForm && (
        <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <p className="text-slate-400 text-center py-8">Nenhum usuário cadastrado.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((profile) => {
            const locationLabel = formatProfileLocations(profile)
            const manageable = canManageTarget(profile, user?.id, isRoot)
            return (
              <Card key={profile.id} hover>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white">{profile.full_name}</h3>
                      <Badge variant="info">{ROLE_LABELS[profile.role]}</Badge>
                    </div>
                    <p className="text-sm text-slate-400">{profile.email}</p>
                    {locationLabel && (
                      <p className="text-xs text-slate-500 mt-1">{locationLabel}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-500 hidden sm:block">{formatDate(profile.created_at)}</p>
                    {manageable && (
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(profile)} title="Editar usuário">
                        <Pencil size={16} className="text-primary-400" />
                      </Button>
                    )}
                    {manageable && (
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(profile)} title="Excluir usuário">
                        <Trash2 size={16} className="text-red-400" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Excluir usuário"
        description="Esta ação remove permanentemente o usuário do sistema. Não pode ser desfeita."
        itemName={deleteTarget ? `${deleteTarget.full_name} (${deleteTarget.email})` : undefined}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
