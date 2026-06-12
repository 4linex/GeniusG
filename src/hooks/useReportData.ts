import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { RawAnswerRow, ResponseWithForm } from '@/lib/reportAnalytics'

async function getProfessorLinkIds(professorId: string): Promise<string[]> {
  const { data: links } = await supabase
    .from('form_links')
    .select('id')
    .eq('professor_id', professorId)

  return links?.map((l) => l.id) || []
}

export function useReportData() {
  const { user, profile } = useAuth()
  const [responses, setResponses] = useState<ResponseWithForm[]>([])
  const [answers, setAnswers] = useState<RawAnswerRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !profile) return

    const load = async () => {
      setLoading(true)

      let query = supabase
        .from('form_responses')
        .select('*, form:forms(id, title, turma)')
        .order('completed_at', { ascending: false })

      if (profile.role === 'professor') {
        const linkIds = await getProfessorLinkIds(user.id)
        if (linkIds.length === 0) {
          setResponses([])
          setAnswers([])
          setLoading(false)
          return
        }
        query = query.in('form_link_id', linkIds)
      }

      const { data: respData } = await query
      const list = (respData as ResponseWithForm[]) || []
      setResponses(list)

      const ids = list.map((r) => r.id)
      if (ids.length === 0) {
        setAnswers([])
        setLoading(false)
        return
      }

      const { data: answerData } = await supabase
        .from('response_answers')
        .select('response_id, is_correct, question:questions(habilidade_bncc, descritor_saeb, nivel_bloom)')
        .in('response_id', ids)

      const parsed: RawAnswerRow[] = (answerData || []).map((a) => {
        const q = a.question as unknown as {
          habilidade_bncc: string | null
          descritor_saeb: string | null
          nivel_bloom: string | null
        } | null
        return {
          response_id: a.response_id,
          is_correct: a.is_correct,
          habilidade: q?.habilidade_bncc || q?.descritor_saeb || 'Sem habilidade',
          bloom: q?.nivel_bloom || 'Sem nível Bloom',
        }
      })

      setAnswers(parsed)
      setLoading(false)
    }

    load()
  }, [user, profile])

  return { responses, answers, loading }
}
