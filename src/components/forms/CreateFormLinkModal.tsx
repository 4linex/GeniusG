import { useEffect, useState } from 'react'
import { CalendarClock, Link2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import { SchoolPicker, type SchoolSelection } from '@/components/schools/SchoolPicker'
import { SchoolTurmaPicker } from '@/components/schools/SchoolTurmaPicker'
import { findSchoolByProfileFields, formatSchoolMunicipio } from '@/lib/schools'
import { localDatetimeToIso } from '@/lib/formLinkAvailability'
import { useSchools } from '@/hooks/useSchools'

export interface FormLinkContext {
  municipio: string
  schoolName: string
  turma: string
  availableFrom: string | null
  availableUntil: string | null
}

interface CreateFormLinkModalProps {
  open: boolean
  formTitle?: string
  defaultMunicipio?: string | null
  defaultSchoolName?: string | null
  loading?: boolean
  onConfirm: (context: FormLinkContext) => void
  onCancel: () => void
}

export function CreateFormLinkModal({
  open,
  formTitle,
  defaultMunicipio,
  defaultSchoolName,
  loading,
  onConfirm,
  onCancel,
}: CreateFormLinkModalProps) {
  const { schools, loading: schoolsLoading } = useSchools()
  const [schoolSelection, setSchoolSelection] = useState<SchoolSelection | null>(null)
  const [turma, setTurma] = useState('')
  const [availableFrom, setAvailableFrom] = useState('')
  const [availableUntil, setAvailableUntil] = useState('')
  const [scheduleError, setScheduleError] = useState('')

  useEffect(() => {
    if (!open) return
    setTurma('')
    setAvailableFrom('')
    setAvailableUntil('')
    setScheduleError('')
    const match = findSchoolByProfileFields(schools, defaultMunicipio, defaultSchoolName)
    if (match) {
      setSchoolSelection({
        schoolId: match.id,
        municipio: formatSchoolMunicipio(match),
        schoolName: match.name,
      })
    } else {
      setSchoolSelection(null)
    }
  }, [open, defaultMunicipio, defaultSchoolName, schools])

  useEffect(() => {
    if (!open) return
    setTurma('')
  }, [open, schoolSelection?.schoolId])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!schoolSelection || !turma.trim()) return

    const fromIso = localDatetimeToIso(availableFrom)
    const untilIso = localDatetimeToIso(availableUntil)

    if (fromIso && untilIso && new Date(untilIso).getTime() <= new Date(fromIso).getTime()) {
      setScheduleError('A data/hora final deve ser posterior à inicial.')
      return
    }

    setScheduleError('')
    onConfirm({
      municipio: schoolSelection.municipio,
      schoolName: schoolSelection.schoolName,
      turma: turma.trim(),
      availableFrom: fromIso,
      availableUntil: untilIso,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg glass rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-xl bg-primary-500/15 text-primary-300">
            <Link2 size={22} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Configurar link</h3>
            <p className="text-sm text-slate-400 mt-1">
              Selecione a escola cadastrada e informe a turma. Cada combinação gera um link
              separado para rastrear de onde vieram as respostas.
            </p>
            {formTitle && <p className="text-sm font-medium text-white mt-2">{formTitle}</p>}
          </div>
        </div>

        <div className="space-y-4">
          <SchoolPicker
            schools={schools}
            loading={schoolsLoading}
            value={schoolSelection}
            onChange={setSchoolSelection}
            required
          />
          <SchoolTurmaPicker
            schoolId={schoolSelection?.schoolId}
            value={turma}
            onChange={setTurma}
            required
          />

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <CalendarClock size={16} className="text-primary-400" />
              Disponibilidade do formulário
              <span className="text-xs font-normal text-slate-500">(opcional)</span>
            </div>
            <p className="text-xs text-slate-500 -mt-2">
              Defina quando os alunos poderão acessar o link. Deixe em branco para disponível
              imediatamente e sem prazo final.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <DateTimePicker
                label="Disponível a partir de"
                value={availableFrom}
                onChange={(next) => {
                  setAvailableFrom(next)
                  setScheduleError('')
                }}
              />
              <DateTimePicker
                label="Disponível até"
                value={availableUntil}
                onChange={(next) => {
                  setAvailableUntil(next)
                  setScheduleError('')
                }}
              />
            </div>
            {scheduleError && <p className="text-xs text-red-400">{scheduleError}</p>}
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={!schoolSelection || !turma.trim()}
          >
            Criar link
          </Button>
        </div>
      </form>
    </div>
  )
}
