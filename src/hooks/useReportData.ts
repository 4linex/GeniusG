import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { flattenNestedAnswers } from '@/lib/responseAnswers'
import type { RawAnswerRow, ResponseWithForm } from '@/lib/reportAnalytics'

const RESPONSES_SELECT = `
  *,
  form:forms(id, title, turma),
  response_answers(is_correct, question:questions(habilidade_bncc, descritor_saeb, nivel_bloom))
`

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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !profile) {
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        let query = supabase
          .from('form_responses')
          .select(RESPONSES_SELECT)
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

        const { data: respData, error: respError } = await query
        if (respError) throw respError

        const rawList = respData || []
        setResponses(rawList as ResponseWithForm[])
        setAnswers(flattenNestedAnswers(rawList))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar relatórios')
        setResponses([])
        setAnswers([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user, profile])

  return { responses, answers, loading, error }
}
