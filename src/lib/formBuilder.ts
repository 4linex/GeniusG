import { supabase } from '@/lib/supabase'
import {
  ANO_SERIE_MVP,
  COMPONENTE_MVP,
  type FormMode,
  type FormStatus,
} from '@/types/database'
import type { BuilderQuestion } from '@/components/forms/builder/types'
import { questionRowToMetadata } from '@/components/forms/builder/types'
import { metadataToDbFields } from '@/components/forms/builder/types'
import { needsAlternatives } from '@/types/questionTypes'
import { mergeLegacyQuestionImage } from '@/lib/richTextImages'
import { dedupeAlternativesByLetter } from '@/lib/questionAlternatives'
import { getErrorMessage, syncQuestionAlternatives } from '@/lib/syncQuestionAlternatives'
import { loadDifficultyLevels, resolveQuestionPointValue } from '@/lib/difficultyLevels'
import type { DifficultyLevel } from '@/types/database'
import type { FormTrailConfig } from '@/types/database'
import { formTrailRowToConfig } from '@/lib/formTrails'
import { ensureSkillBankFromQuestionFields } from '@/lib/skillBank'

export { getErrorMessage, syncQuestionAlternatives }

export interface FormSavePayload {
  title: string
  description: string
  schoolName: string
  componenteCurricular: string
  isActive: boolean
  status: FormStatus
  expectedStudents: string
  formMode: FormMode
  turma: string
  finalScreenTitle: string
  finalScreenMessage: string
  designAccent: string
  questions: BuilderQuestion[]
  trails: FormTrailConfig[]
}

export async function loadBankQuestions() {
  const { data } = await supabase
    .from('questions')
    .select('*')
    .eq('is_form_exclusive', false)
    .eq('ano_serie', ANO_SERIE_MVP)
    .eq('componente_curricular', COMPONENTE_MVP)
    .order('conteudo_programatico')
    .order('title')

  return data || []
}

export async function loadQuestionAlternatives(questionId: string) {
  const { data } = await supabase
    .from('question_alternatives')
    .select('*')
    .eq('question_id', questionId)
    .order('order_index')

  return dedupeAlternativesByLetter(data || [])
}

function questionPointValue(q: BuilderQuestion, levels: DifficultyLevel[]) {
  return resolveQuestionPointValue(q.questionType, q.metadata?.nivel_dificuldade, levels)
}

async function syncQuestionSkillBank(metadata: BuilderQuestion['metadata']): Promise<void> {
  if (!metadata) return
  await ensureSkillBankFromQuestionFields({
    descritor_saeb: metadata.descritor_saeb,
    habilidade_bncc: metadata.habilidade_bncc,
    nivel_bloom: metadata.nivel_bloom,
  })
}

async function upsertInlineQuestion(
  q: BuilderQuestion,
  userId: string,
  difficultyLevels: DifficultyLevel[],
): Promise<string> {
  await syncQuestionSkillBank(q.metadata)

  const payload = {
    title: q.title,
    enunciado: q.enunciado,
    subtitle: q.description || null,
    image_url: null,
    youtube_url: q.youtubeUrl || null,
    creator_notes: q.creatorNotes || null,
    point_value: questionPointValue(q, difficultyLevels),
    ...metadataToDbFields(q.metadata),
    is_form_exclusive: true,
    question_type: q.questionType,
    created_by: userId,
  }

  if (q.questionId) {
    const { error: updateError } = await supabase.from('questions').update(payload).eq('id', q.questionId)
    if (updateError) throw updateError
    if (needsAlternatives(q.questionType)) {
      await syncQuestionAlternatives(q.questionId, q.alternatives)
    }
    return q.questionId
  }

  const { data, error } = await supabase.from('questions').insert(payload).select('id').single()
  if (error || !data) throw error || new Error('Erro ao criar questão')

  if (needsAlternatives(q.questionType) && q.alternatives.length > 0) {
    await syncQuestionAlternatives(data.id, q.alternatives)
  }

  return data.id
}

/** Atualiza metadados de questão do banco usada no formulário (não altera alternativas compartilhadas). */
async function updateBankQuestionInForm(
  q: BuilderQuestion,
  difficultyLevels: DifficultyLevel[],
): Promise<void> {
  if (!q.questionId) return

  await syncQuestionSkillBank(q.metadata)

  const updatePayload: Record<string, unknown> = {
    title: q.title,
    enunciado: q.enunciado,
    subtitle: q.description || null,
    image_url: null,
    youtube_url: q.youtubeUrl || null,
    point_value: questionPointValue(q, difficultyLevels),
    ...metadataToDbFields(q.metadata),
  }

  if (q.creatorNotes !== undefined) {
    updatePayload.creator_notes = q.creatorNotes || null
  }

  const { error: updateError } = await supabase.from('questions').update(updatePayload).eq('id', q.questionId)
  if (updateError) throw updateError
}

async function saveFormTrails(formId: string, trails: FormTrailConfig[]): Promise<void> {
  const { error: deleteError } = await supabase.from('form_trails').delete().eq('form_id', formId)
  if (deleteError) throw deleteError

  const rows = trails
    .filter((t) => t.enabled && t.learningTrailId)
    .map((t, order_index) => ({
      form_id: formId,
      learning_trail_id: t.learningTrailId,
      title: t.title?.trim() || 'Trilha de recomposição',
      min_percent: t.minPercent,
      max_percent: t.maxPercent,
      order_index,
      updated_at: new Date().toISOString(),
    }))

  if (rows.length === 0) return

  const { error } = await supabase.from('form_trails').insert(rows)
  if (error) throw error
}

export async function saveForm(
  payload: FormSavePayload,
  userId: string,
  formId?: string,
): Promise<string> {
  const formData = {
    title: payload.title,
    description: payload.description || null,
    school_name: payload.schoolName.trim() || null,
    componente_curricular: payload.componenteCurricular,
    is_active: payload.isActive,
    status: payload.status,
    expected_students: payload.expectedStudents ? parseInt(payload.expectedStudents, 10) : null,
    form_mode: payload.formMode,
    turma: payload.turma,
    final_screen_title: payload.finalScreenTitle,
    final_screen_message: payload.finalScreenMessage,
    design_accent: payload.designAccent,
  }

  let savedFormId = formId

  if (formId) {
    const { error } = await supabase.from('forms').update(formData).eq('id', formId)
    if (error) throw error

    const { error: deleteLinksError } = await supabase.from('form_questions').delete().eq('form_id', formId)
    if (deleteLinksError) throw deleteLinksError
  } else {
    const { data, error } = await supabase
      .from('forms')
      .insert({ ...formData, created_by: userId })
      .select('id')
      .single()
    if (error || !data) throw error || new Error('Erro ao criar formulário')
    savedFormId = data.id
  }

  const difficultyLevels = await loadDifficultyLevels()

  const questionIds: string[] = []
  for (const q of payload.questions) {
    if (q.source === 'inline') {
      questionIds.push(await upsertInlineQuestion(q, userId, difficultyLevels))
    } else if (q.questionId) {
      await updateBankQuestionInForm(q, difficultyLevels)
      questionIds.push(q.questionId)
    }
  }

  if (questionIds.length > 0) {
    const { error } = await supabase.from('form_questions').insert(
      questionIds.map((question_id, order_index) => ({
        form_id: savedFormId!,
        question_id,
        order_index,
      })),
    )
    if (error) throw error
  }

  await saveFormTrails(savedFormId!, payload.trails)

  return savedFormId!
}

/** Persiste uma questão do builder no banco sem salvar o formulário inteiro. */
export async function saveBuilderQuestion(
  q: BuilderQuestion,
  userId: string,
): Promise<string> {
  const difficultyLevels = await loadDifficultyLevels()

  if (q.source === 'inline') {
    return upsertInlineQuestion(q, userId, difficultyLevels)
  }

  if (q.questionId) {
    await updateBankQuestionInForm(q, difficultyLevels)
    return q.questionId
  }

  throw new Error('Questão inválida para salvar')
}

export async function loadFormForBuilder(formId: string) {
  const [{ data: form }, { data: formQuestions }, { data: trailRows }] = await Promise.all([
    supabase.from('forms').select('*').eq('id', formId).single(),
    supabase
      .from('form_questions')
      .select('question_id, order_index')
      .eq('form_id', formId)
      .order('order_index'),
    supabase
      .from('form_trails')
      .select('*, learning_trail:learning_trails(id, title, description, pdf_url, link_url)')
      .eq('form_id', formId)
      .order('order_index'),
  ])

  if (!form) return null

  const trails: FormTrailConfig[] =
    trailRows && trailRows.length > 0
      ? trailRows.map((row) => formTrailRowToConfig(row))
      : []

  const orderedIds = (formQuestions || []).map((fq) => fq.question_id)
  if (orderedIds.length === 0) return { form, questions: [], trails }

  const [{ data: questionRows }, { data: altRows }] = await Promise.all([
    supabase.from('questions').select('*').in('id', orderedIds),
    supabase
      .from('question_alternatives')
      .select('*')
      .in('question_id', orderedIds)
      .order('order_index'),
  ])

  const questionMap = new Map((questionRows || []).map((q) => [q.id, q]))
  const altsByQuestion = new Map<string, BuilderQuestion['alternatives']>()
  for (const alt of altRows || []) {
    const list = altsByQuestion.get(alt.question_id) || []
    list.push(alt as BuilderQuestion['alternatives'][number])
    altsByQuestion.set(alt.question_id, list)
  }

  const questions: BuilderQuestion[] = orderedIds
    .map((id) => questionMap.get(id))
    .filter(Boolean)
    .map((q) => ({
      localId: crypto.randomUUID(),
      questionId: q!.id,
      source: q!.is_form_exclusive ? 'inline' : 'bank',
      questionType: q!.question_type || 'multipla_escolha',
      title: q!.title,
      enunciado: mergeLegacyQuestionImage(q!.enunciado, q!.image_url),
      description: q!.subtitle || undefined,
      imageUrl: null,
      youtubeUrl: q!.youtube_url || null,
      creatorNotes: q!.creator_notes || undefined,
      createdBy: q!.created_by || null,
      pointValue: Number(q!.point_value ?? 1),
      required: true,
      alternatives: dedupeAlternativesByLetter(altsByQuestion.get(q!.id) || []),
      metadata: questionRowToMetadata(q!),
    }))

  return { form, questions, trails }
}
