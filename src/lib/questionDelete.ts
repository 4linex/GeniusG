import { supabase } from '@/lib/supabase'

export type QuestionDeleteResult =
  | { ok: true; mode: 'deleted' }
  | { ok: true; mode: 'archived'; answerCount: number }
  | { ok: false; message: string }

export async function countQuestionAnswers(questionId: string): Promise<number> {
  const { count, error } = await supabase
    .from('response_answers')
    .select('id', { count: 'exact', head: true })
    .eq('question_id', questionId)

  if (error) throw error
  return count ?? 0
}

export async function deleteOrArchiveQuestion(questionId: string): Promise<QuestionDeleteResult> {
  const answerCount = await countQuestionAnswers(questionId)

  if (answerCount > 0) {
    const { error: unlinkError } = await supabase
      .from('form_questions')
      .delete()
      .eq('question_id', questionId)

    if (unlinkError) {
      return { ok: false, message: unlinkError.message }
    }

    const { error: archiveError } = await supabase
      .from('questions')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', questionId)

    if (archiveError) {
      const msg = archiveError.message.includes('archived_at')
        ? 'Execute a migração 033_question_archive no Supabase para arquivar questões respondidas.'
        : archiveError.message
      return { ok: false, message: msg }
    }

    return { ok: true, mode: 'archived', answerCount }
  }

  const { error: deleteError } = await supabase.from('questions').delete().eq('id', questionId)

  if (deleteError) {
    return { ok: false, message: deleteError.message }
  }

  return { ok: true, mode: 'deleted' }
}

export function questionDeleteSuccessMessage(result: Extract<QuestionDeleteResult, { ok: true }>): string {
  if (result.mode === 'archived') {
    return `Questão arquivada. Ela saiu do banco ativo, mas ${result.answerCount} resposta(s) de aluno(s) foram preservadas no histórico.`
  }
  return 'Questão excluída com sucesso.'
}
