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
import type { Profile, UserRole } from '@/types/database'
import { ROLE_LABELS } from '@/types/database'
import { UserPlus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SchoolPicker, type SchoolSelection } from '@/components/schools/SchoolPicker'
import { SchoolTurmasMultiPicker } from '@/components/schools/SchoolTurmasMultiPicker'
import { listSchoolClasses } from '@/lib/schoolClasses'
import { useSchools } from '@/hooks/useSchools'

export function UsersSection() {
  const { user, registerUser, deleteUser, hasRole } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { schools, loading: schoolsLoading } = useSchools()
  const [schoolSelection, setSchoolSelection] = useState<SchoolSelection | null>(null)
  const [selectedTurmas, setSelectedTurmas] = useState<string[]>([])
  const [schoolHasClasses, setSchoolHasClasses] = useState(false)
  const [role, setRole] = useState<UserRole>('professor')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isRoot = hasRole('root')

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

  useEffect(() => {
    if (!schoolSelection?.schoolId) {
      setSelectedTurmas([])
      setSchoolHasClasses(false)
      return
    }

    let cancelled = false
    listSchoolClasses(schoolSelection.schoolId)
      .then((rows) => {
        if (cancelled) return
        const names = rows.map((row) => row.name)
        setSchoolHasClasses(names.length > 0)
        setSelectedTurmas((prev) => prev.filter((name) => names.includes(name)))
      })
      .catch(() => {
        if (!cancelled) {
          setSchoolHasClasses(false)
          setSelectedTurmas([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [schoolSelection?.schoolId])

  const resetForm = () => {
    setFullName('')
    setEmail('')
    setPassword('')
    setSchoolSelection(null)
    setSelectedTurmas([])
    setSchoolHasClasses(false)
    setRole('professor')
    setError('')
  }

  const openCreateModal = () => {
    resetForm()
    setSuccess('')
    setShowForm(true)
  }

  const closeCreateModal = () => {
    setShowForm(false)
    resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if ((role === 'professor' || role === 'admin') && !schoolSelection) {
      setError(
        role === 'professor'
          ? 'Selecione a escola do professor'
          : 'Selecione a escola ou município do administrador',
      )
      return
    }
    if (role === 'professor' && schoolHasClasses && selectedTurmas.length === 0) {
      setError('Selecione ao menos uma turma do professor')
      return
    }
    setSubmitting(true)
    try {
      await registerUser({
        email,
        password,
        full_name: fullName,
        role,
        municipio: schoolSelection?.municipio,
        school_name: schoolSelection?.schoolName,
        school_id: schoolSelection?.schoolId,
        turmas: role === 'professor' ? selectedTurmas : undefined,
      })
      setSuccess('Usuário cadastrado com sucesso!')
      closeCreateModal()
      loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar')
    } finally {
      setSubmitting(false)
    }
  }

  const canDelete = (target: Profile) => {
    if (target.id === user?.id) return false
    if (target.role === 'root') return false
    if (isRoot) return target.role === 'professor' || target.role === 'admin'
    return target.role === 'professor'
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
              ? 'Cadastro e exclusão de usuários (professor ou administrador)'
              : 'Cadastro e exclusão de usuários com perfil professor'}
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
        onClose={closeCreateModal}
        title="Novo usuário"
        description={
          isRoot
            ? 'Cadastre um professor ou administrador no sistema.'
            : 'Cadastre um usuário com perfil professor.'
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <Select
            label="Perfil de acesso"
            value={role}
            onChange={(e) => {
              const nextRole = e.target.value as UserRole
              setRole(nextRole)
              if (nextRole !== 'professor' && nextRole !== 'admin') {
                setSchoolSelection(null)
                setSelectedTurmas([])
              }
              if (nextRole !== 'professor') setSelectedTurmas([])
            }}
            options={roleOptions}
          />
          {(role === 'professor' || role === 'admin') && (
            <SchoolPicker
              schools={schools}
              loading={schoolsLoading}
              value={schoolSelection}
              onChange={setSchoolSelection}
              required
              label={role === 'admin' ? 'Área de responsabilidade' : 'Escola'}
            />
          )}
          {role === 'professor' && (
            <SchoolTurmasMultiPicker
              schoolId={schoolSelection?.schoolId}
              value={selectedTurmas}
              onChange={setSelectedTurmas}
              required={schoolHasClasses}
              disabled={submitting}
            />
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={closeCreateModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              Cadastrar usuário
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
          {users.map((profile) => (
            <Card key={profile.id} hover>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white">{profile.full_name}</h3>
                    <Badge variant="info">{ROLE_LABELS[profile.role]}</Badge>
                  </div>
                  <p className="text-sm text-slate-400">{profile.email}</p>
                  {(profile.municipio || profile.school_name || profile.turmas?.length) && (
                    <p className="text-xs text-slate-500 mt-1">
                      {[
                        profile.municipio,
                        profile.school_name,
                        profile.turmas?.length ? `Turmas: ${profile.turmas.join(', ')}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-slate-500">{formatDate(profile.created_at)}</p>
                  {canDelete(profile) && (
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(profile)}>
                      <Trash2 size={16} className="text-red-400" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
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
