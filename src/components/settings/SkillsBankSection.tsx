import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { TabBar } from '@/components/ui/TabBar'
import { Select } from '@/components/ui/Select'
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal'
import { FormModal } from '@/components/ui/FormModal'
import {
  createSkillBankItem,
  deleteSkillBankItem,
  formatSkillBankValue,
  getBnccComponentLabel,
  getRelatedBnccIdsForSaeb,
  groupBnccByKnowledgeArea,
  groupSaebByKnowledgeArea,
  syncSkillBankRelations,
  updateSkillBankItem,
} from '@/lib/skillBank'
import { SkillBankBnccMultiPicker } from '@/components/settings/SkillBankBnccMultiPicker'
import { useSkillBankAll } from '@/hooks/useSkillBank'
import type { SkillBankItem, SkillBankType } from '@/types/database'
import { SKILL_BANK_TYPE_LABELS, SAEB_SERIE_OPTIONS } from '@/types/database'
import { Plus, Pencil, Trash2, Check, X, BookOpen, Link2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'saeb' as const, label: 'SAEB (Descritores)' },
  { id: 'bncc' as const, label: 'BNCC (Habilidades)' },
  { id: 'bloom' as const, label: 'Bloom' },
]

const CODE_PLACEHOLDER: Record<SkillBankType, string> = {
  bncc: 'Ex.: EF05LP03, EF15MA01',
  bloom: 'Ex.: Compreender',
  saeb: 'Ex.: D3',
}

const LABEL_PLACEHOLDER: Record<SkillBankType, string> = {
  bncc: 'Ex.: Identificar o gênero de textos',
  bloom: 'Ex.: Compreender',
  saeb: 'Ex.: Inferir o sentido de palavra ou expressão',
}

function relatedBnccForSaeb(
  saebId: string,
  relations: ReturnType<typeof useSkillBankAll>['relations'],
  bncc: SkillBankItem[],
): SkillBankItem[] {
  const ids = new Set(
    relations.filter((r) => r.saeb_item_id === saebId).map((r) => r.bncc_item_id),
  )
  return bncc.filter((b) => ids.has(b.id))
}

function relatedSaebForBncc(
  bnccId: string,
  relations: ReturnType<typeof useSkillBankAll>['relations'],
  saeb: SkillBankItem[],
): SkillBankItem[] {
  const ids = new Set(
    relations.filter((r) => r.bncc_item_id === bnccId).map((r) => r.saeb_item_id),
  )
  return saeb.filter((s) => ids.has(s.id))
}

export function SkillsBankSection() {
  const { bncc, bloom, saeb, relations, loading, error, reload } = useSkillBankAll()
  const [activeType, setActiveType] = useState<SkillBankType>('saeb')
  const [showForm, setShowForm] = useState(false)
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [topic, setTopic] = useState('')
  const [bloomHint, setBloomHint] = useState('')
  const [anoSerie, setAnoSerie] = useState('5º Ano')
  const [selectedBnccIds, setSelectedBnccIds] = useState<string[]>([])
  const [labelError, setLabelError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [listError, setListError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCode, setEditCode] = useState('')
  const [editLabel, setEditLabel] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTopic, setEditTopic] = useState('')
  const [editBloomHint, setEditBloomHint] = useState('')
  const [editAnoSerie, setEditAnoSerie] = useState('5º Ano')
  const [editBnccIds, setEditBnccIds] = useState<string[]>([])
  const [editLabelError, setEditLabelError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<SkillBankItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [areaFilter, setAreaFilter] = useState('')
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(() => new Set())
  const [expandedSaebTopics, setExpandedSaebTopics] = useState<Set<string>>(() => new Set())

  const itemsByType: Record<SkillBankType, SkillBankItem[]> = { bncc, bloom, saeb }
  const items = itemsByType[activeType]
  const saebAreaGroups = useMemo(() => groupSaebByKnowledgeArea(saeb), [saeb])
  const bnccGroups = useMemo(() => groupBnccByKnowledgeArea(bncc), [bncc])

  useEffect(() => {
    setAreaFilter('')
    setEditingId(null)
    setExpandedAreas(new Set())
    setExpandedSaebTopics(new Set())
  }, [activeType])

  useEffect(() => {
    if (areaFilter) {
      setExpandedAreas(new Set([areaFilter]))
      setExpandedSaebTopics(new Set())
    } else {
      setExpandedAreas(new Set())
      setExpandedSaebTopics(new Set())
    }
  }, [areaFilter])

  const saebAreaOptions = useMemo(
    () => [
      { value: '', label: 'Todas as áreas' },
      ...saebAreaGroups.map((group) => ({
        value: group.area,
        label: `${group.area} (${group.totalItems})`,
      })),
    ],
    [saebAreaGroups],
  )

  const visibleSaebAreaGroups = useMemo(() => {
    if (!areaFilter) return saebAreaGroups
    return saebAreaGroups.filter((group) => group.area === areaFilter)
  }, [saebAreaGroups, areaFilter])

  const saebDescriptorCount = useMemo(
    () => saebAreaGroups.reduce((sum, group) => sum + group.totalItems, 0),
    [saebAreaGroups],
  )

  const areaOptions = useMemo(
    () => [
      { value: '', label: 'Todas as áreas' },
      ...bnccGroups.map((group) => ({
        value: group.area,
        label: `${group.area} (${group.totalItems})`,
      })),
    ],
    [bnccGroups],
  )

  const visibleBnccGroups = useMemo(() => {
    if (!areaFilter) return bnccGroups
    return bnccGroups.filter((group) => group.area === areaFilter)
  }, [bnccGroups, areaFilter])

  const bnccFifthYearCount = useMemo(
    () => bnccGroups.reduce((sum, group) => sum + group.totalItems, 0),
    [bnccGroups],
  )

  const resetCreateForm = () => {
    setCode('')
    setLabel('')
    setDescription('')
    setTopic('')
    setBloomHint('')
    setAnoSerie('5º Ano')
    setSelectedBnccIds([])
    setLabelError('')
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
    setLabelError('')
    if (!label.trim()) {
      setLabelError('Informe a descrição')
      return
    }

    setSubmitting(true)
    try {
      const created = await createSkillBankItem(
        activeType,
        label,
        code,
        {
          description,
          topic: activeType === 'saeb' ? topic : undefined,
          bloom_hint: activeType === 'saeb' ? bloomHint : undefined,
          ano_serie: activeType === 'saeb' ? anoSerie : undefined,
        },
        items.length,
      )
      if (activeType === 'saeb' && selectedBnccIds.length > 0) {
        await syncSkillBankRelations(created.id, selectedBnccIds)
      }
      closeCreateModal()
      reload()
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Não foi possível cadastrar')
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (item: SkillBankItem) => {
    setEditingId(item.id)
    setEditCode(item.code || '')
    setEditLabel(item.label)
    setEditDescription(item.description || '')
    setEditTopic(item.topic || '')
    setEditBloomHint(item.bloom_hint || '')
    setEditAnoSerie(item.ano_serie || '5º Ano')
    setEditBnccIds(
      activeType === 'saeb' ? getRelatedBnccIdsForSaeb(item.id, relations) : [],
    )
    setEditLabelError('')
    setListError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditCode('')
    setEditLabel('')
    setEditDescription('')
    setEditTopic('')
    setEditBloomHint('')
    setEditAnoSerie('5º Ano')
    setEditBnccIds([])
    setEditLabelError('')
  }

  const saveEdit = async (id: string) => {
    setEditLabelError('')
    if (!editLabel.trim()) {
      setEditLabelError('Informe a descrição')
      return
    }

    setSubmitting(true)
    setListError('')
    try {
      await updateSkillBankItem(id, {
        code: editCode.trim() || null,
        label: editLabel.trim(),
        description: editDescription.trim() || null,
        topic: activeType === 'saeb' ? editTopic.trim() || null : undefined,
        bloom_hint: activeType === 'saeb' ? editBloomHint.trim() || null : undefined,
        ano_serie: activeType === 'saeb' ? editAnoSerie || null : undefined,
      })
      if (activeType === 'saeb') {
        await syncSkillBankRelations(id, editBnccIds)
      }
      cancelEdit()
      reload()
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Não foi possível salvar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setListError('')
    try {
      await deleteSkillBankItem(deleteTarget.id)
      setDeleteTarget(null)
      reload()
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  const renderItemActions = (item: SkillBankItem) => (
    <div className="flex gap-2 shrink-0">
      <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
        <Pencil size={16} />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)}>
        <Trash2 size={16} className="text-red-400" />
      </Button>
    </div>
  )

  const renderEditForm = (item: SkillBankItem) => (
    <div className="space-y-4">
      <Input
        label="Código"
        value={editCode}
        onChange={(e) => setEditCode(e.target.value)}
        placeholder={CODE_PLACEHOLDER[activeType]}
      />
      <Input
        label="Descrição"
        value={editLabel}
        onChange={(e) => {
          setEditLabel(e.target.value)
          if (editLabelError) setEditLabelError('')
        }}
        error={editLabelError || undefined}
      />
      {activeType === 'saeb' && (
        <>
          <Select
            label="Série / ano"
            value={editAnoSerie}
            onChange={(e) => setEditAnoSerie(e.target.value)}
            options={SAEB_SERIE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
          <Input
            label="Tópico SAEB"
            value={editTopic}
            onChange={(e) => setEditTopic(e.target.value)}
            placeholder="Ex.: I. Procedimentos de leitura"
          />
          <Input
            label="Bloom sugerido"
            value={editBloomHint}
            onChange={(e) => setEditBloomHint(e.target.value)}
            placeholder="Ex.: Compreender / Analisar"
          />
          <SkillBankBnccMultiPicker
            bnccItems={bncc}
            value={editBnccIds}
            onChange={setEditBnccIds}
            disabled={submitting}
            loading={loading}
          />
        </>
      )}
      <Textarea
        label="Observações"
        value={editDescription}
        onChange={(e) => setEditDescription(e.target.value)}
        rows={2}
        className="min-h-[56px]"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => saveEdit(item.id)} loading={submitting}>
          <Check size={16} />
          Salvar
        </Button>
        <Button size="sm" variant="secondary" onClick={cancelEdit}>
          <X size={16} />
          Cancelar
        </Button>
      </div>
    </div>
  )

  const toggleAreaExpanded = (area: string) => {
    setExpandedAreas((prev) => {
      const next = new Set(prev)
      if (next.has(area)) {
        next.delete(area)
        setExpandedSaebTopics((topics) => {
          const cleaned = new Set(topics)
          for (const key of topics) {
            if (key.startsWith(`${area}::`)) cleaned.delete(key)
          }
          return cleaned
        })
      } else {
        next.add(area)
      }
      return next
    })
  }

  const saebTopicKey = (area: string, topic: string) => `${area}::${topic}`

  const toggleSaebTopicExpanded = (area: string, topic: string) => {
    const key = saebTopicKey(area, topic)
    setExpandedSaebTopics((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const renderSaebItem = (item: SkillBankItem) => {
    const linkedBncc = relatedBnccForSaeb(item.id, relations, bncc)
    return (
      <Card key={item.id}>
        {editingId === item.id ? (
          renderEditForm(item)
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {item.code && (
                  <Badge variant="default">{item.code}</Badge>
                )}
                {item.bloom_hint && (
                  <Badge variant="info" className="border border-primary-500/40">
                    Bloom: {item.bloom_hint}
                  </Badge>
                )}
                {item.ano_serie && (
                  <Badge variant="default" className="border border-white/10">
                    {item.ano_serie}
                  </Badge>
                )}
              </div>
              <p className="font-medium text-white mt-2">{item.label}</p>
              {item.description && (
                <p className="text-sm text-slate-400 mt-1">{item.description}</p>
              )}
              {linkedBncc.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs text-slate-500 flex items-center gap-1 mb-2">
                    <Link2 size={12} />
                    Habilidades BNCC relacionadas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {linkedBncc.map((b) => (
                      <Badge key={b.id} variant="default" className="text-xs font-normal">
                        {formatSkillBankValue(b)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {renderItemActions(item)}
          </div>
        )}
      </Card>
    )
  }

  const renderBnccItem = (item: SkillBankItem) => {
    const linkedSaeb = relatedSaebForBncc(item.id, relations, saeb)
    return (
      <Card key={item.id}>
        {editingId === item.id ? (
          renderEditForm(item)
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {item.code && <Badge variant="default">{item.code}</Badge>}
                {getBnccComponentLabel(item.code) && (
                  <Badge variant="info" className="border border-primary-500/30">
                    {getBnccComponentLabel(item.code)}
                  </Badge>
                )}
              </div>
              <p className="font-medium text-white mt-2">{item.label}</p>
              {item.description && (
                <p className="text-sm text-slate-400 mt-1">{item.description}</p>
              )}
              {linkedSaeb.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs text-slate-500 flex items-center gap-1 mb-2">
                    <Link2 size={12} />
                    Descritores SAEB relacionados
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {linkedSaeb.map((s) => (
                      <Badge key={s.id} variant="default" className="text-xs font-normal">
                        {formatSkillBankValue(s)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {renderItemActions(item)}
          </div>
        )}
      </Card>
    )
  }

  const renderBloomItem = (item: SkillBankItem) => (
    <Card key={item.id}>
      {editingId === item.id ? (
        renderEditForm(item)
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium text-white">{formatSkillBankValue(item)}</p>
            {item.description && (
              <p className="text-sm text-slate-400 mt-1">{item.description}</p>
            )}
          </div>
          {renderItemActions(item)}
        </div>
      )}
    </Card>
  )

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <BookOpen size={20} className="text-primary-400" />
            Banco de habilidades
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Descritores SAEB e habilidades BNCC organizados por área do conhecimento (5º ano), além
            dos níveis de Bloom.
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus size={16} />
          Novo item
        </Button>
      </div>

      <TabBar items={TABS} active={activeType} onChange={setActiveType} className="mb-6" />

      <FormModal
        open={showForm}
        onClose={closeCreateModal}
        title={`Novo item — ${SKILL_BANK_TYPE_LABELS[activeType]}`}
        description={
          activeType === 'saeb'
            ? 'Descritor SAEB (código D1, D3…). Informe a série e marque as habilidades BNCC correlacionadas.'
            : activeType === 'bncc'
              ? 'Habilidade BNCC do 5º ano (código EF05, EF15 ou EF35 + componente: LP, MA, CI…).'
              : 'Nível da taxonomia de Bloom revisada.'
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label={activeType === 'bloom' ? 'Nome do nível' : 'Código'}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={CODE_PLACEHOLDER[activeType]}
          />
          <Input
            label="Descrição"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value)
              if (labelError) setLabelError('')
            }}
            placeholder={LABEL_PLACEHOLDER[activeType]}
            error={labelError || undefined}
            required
          />
          {activeType === 'saeb' && (
            <>
              <Select
                label="Série / ano"
                value={anoSerie}
                onChange={(e) => setAnoSerie(e.target.value)}
                options={SAEB_SERIE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                required
              />
              <Input
                label="Tópico SAEB"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex.: I. Procedimentos de leitura"
              />
              <Input
                label="Bloom sugerido"
                value={bloomHint}
                onChange={(e) => setBloomHint(e.target.value)}
                placeholder="Ex.: Compreender / Analisar"
              />
              <SkillBankBnccMultiPicker
                bnccItems={bncc}
                value={selectedBnccIds}
                onChange={setSelectedBnccIds}
                disabled={submitting}
                loading={loading}
              />
            </>
          )}
          <Textarea
            label="Observações (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="min-h-[56px]"
          />
          {listError && showForm && <p className="text-sm text-red-400">{listError}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={closeCreateModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              Cadastrar
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
      ) : items.length === 0 ? (
        <Card>
          <p className="text-slate-400 text-center py-8">
            Nenhum item em {SKILL_BANK_TYPE_LABELS[activeType]}.
            {activeType !== 'bloom' && (
              <span className="block mt-2 text-xs">
                Execute <code className="text-primary-300">npm run seed:pedagogical-matrix</code> para
                carregar a matriz pedagógica.
              </span>
            )}
          </p>
        </Card>
      ) : activeType === 'saeb' ? (
        <>
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Área do conhecimento"
              size="sm"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              options={saebAreaOptions}
            />
            <div className="flex items-end">
              <p className="text-sm text-slate-400 pb-2">
                {areaFilter
                  ? `${visibleSaebAreaGroups[0]?.totalItems ?? 0} descritores nesta área`
                  : `${saebAreaGroups.length} áreas · ${saebDescriptorCount} descritores (LP · 5º ano)`}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {visibleSaebAreaGroups.map((group) => {
              const isExpanded = expandedAreas.has(group.area)

              return (
                <section key={group.area} className="rounded-xl border border-white/10 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleAreaExpanded(group.area)}
                    aria-expanded={isExpanded}
                    className="w-full flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 text-left bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-primary-300">{group.area}</h3>
                      {group.totalItems > 0 && group.components.length === 1 && (
                        <p className="text-xs text-slate-500 mt-0.5">{group.components[0].component}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-500">
                        {group.totalItems} descritor{group.totalItems !== 1 ? 'es' : ''}
                      </span>
                      <ChevronDown
                        size={16}
                        className={cn(
                          'text-slate-400 transition-transform',
                          isExpanded && 'rotate-180',
                        )}
                      />
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="p-4 pt-2 border-t border-white/10 space-y-4">
                      {group.totalItems === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">
                          Nenhum descritor cadastrado para esta área no 5º ano.
                        </p>
                      ) : (
                        group.components.map((comp) => (
                          <div key={comp.component} className="space-y-3">
                            {group.components.length > 1 && (
                              <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide px-1">
                                {comp.component}
                              </h4>
                            )}
                            {comp.topics.map((topicGroup) => {
                              const topicKey = saebTopicKey(group.area, topicGroup.topic)
                              const isTopicExpanded = expandedSaebTopics.has(topicKey)

                              return (
                                <section
                                  key={topicKey}
                                  className="rounded-xl border border-white/10 overflow-hidden"
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleSaebTopicExpanded(group.area, topicGroup.topic)}
                                    aria-expanded={isTopicExpanded}
                                    className="w-full flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-left bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                                  >
                                    <h4 className="text-sm font-medium text-slate-200 pr-4">
                                      {topicGroup.topic}
                                    </h4>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-xs text-slate-500">
                                        {topicGroup.items.length} descritor
                                        {topicGroup.items.length !== 1 ? 'es' : ''}
                                      </span>
                                      <ChevronDown
                                        size={16}
                                        className={cn(
                                          'text-slate-400 transition-transform',
                                          isTopicExpanded && 'rotate-180',
                                        )}
                                      />
                                    </div>
                                  </button>
                                  {isTopicExpanded && (
                                    <div className="space-y-3 p-4 pt-2 border-t border-white/10">
                                      {topicGroup.items.map(renderSaebItem)}
                                    </div>
                                  )}
                                </section>
                              )
                            })}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        </>
      ) : activeType === 'bncc' ? (
        <>
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Área do conhecimento"
              size="sm"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              options={areaOptions}
            />
            <div className="flex items-end">
              <p className="text-sm text-slate-400 pb-2">
                {areaFilter
                  ? `${visibleBnccGroups[0]?.totalItems ?? 0} habilidades nesta área`
                  : `${bnccGroups.length} áreas · ${bnccFifthYearCount} habilidades (5º ano)`}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {visibleBnccGroups.map((group) => {
              const isExpanded = expandedAreas.has(group.area)

              return (
                <section key={group.area} className="rounded-xl border border-white/10 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleAreaExpanded(group.area)}
                    aria-expanded={isExpanded}
                    className="w-full flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 text-left bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-primary-300">{group.area}</h3>
                      {group.totalItems > 0 && group.components.length === 1 && (
                        <p className="text-xs text-slate-500 mt-0.5">{group.components[0].component}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-500">
                        {group.totalItems} habilidade{group.totalItems !== 1 ? 's' : ''}
                      </span>
                      <ChevronDown
                        size={16}
                        className={cn(
                          'text-slate-400 transition-transform',
                          isExpanded && 'rotate-180',
                        )}
                      />
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="p-4 pt-2 border-t border-white/10 space-y-4">
                      {group.totalItems === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">
                          Nenhuma habilidade cadastrada para esta área no 5º ano.
                        </p>
                      ) : (
                        group.components.map((comp) => (
                          <div key={comp.component}>
                            {group.components.length > 1 && (
                              <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                                {comp.component}
                              </h4>
                            )}
                            <div className="space-y-3">
                              {comp.items.map(renderBnccItem)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        </>
      ) : (
        <div className="space-y-3">{items.map(renderBloomItem)}</div>
      )}

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Excluir item"
        description="Questões que já usam este item manterão o texto salvo, mas ele não aparecerá mais nas opções."
        itemName={deleteTarget ? formatSkillBankValue(deleteTarget) : undefined}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
