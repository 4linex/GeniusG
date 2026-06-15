import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { FormResponse } from '@/types/database'

async function getProfessorLinkIds(professorId: string): Promise<string[]> {
  const { data: links } = await supabase
    .from('form_links')
    .select('id')
    .eq('professor_id', professorId)

  return links?.map((l) => l.id) || []
}

const scopedCache = new Map<string, FormResponse[]>()

export function useScopedResponses<T extends FormResponse = FormResponse>(
  select: string,
) {
  const { user, profile } = useAuth()
  const cacheKey = user && profile ? `${user.id}:${profile.role}:${select}` : null
  const cached = cacheKey ? (scopedCache.get(cacheKey) as T[] | undefined) : undefined

  const [responses, setResponses] = useState<T[]>(cached ?? [])
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    if (!user || !profile) {
      setLoading(false)
      return
    }

    const key = `${user.id}:${profile.role}:${select}`
    const hit = scopedCache.get(key) as T[] | undefined
    if (hit) {
      setResponses(hit)
      setLoading(false)
      return
    }

    let cancelled = false

    const load = async () => {
      setLoading(true)

      let query = supabase
        .from('form_responses')
        .select(select)
        .order('completed_at', { ascending: false })

      if (profile.role === 'professor') {
        const linkIds = await getProfessorLinkIds(user.id)
        if (linkIds.length === 0) {
          if (!cancelled) {
            scopedCache.set(key, [])
            setResponses([])
            setLoading(false)
          }
          return
        }
        query = query.in('form_link_id', linkIds)
      }

      const { data } = await query
      if (cancelled) return
      const list = (data as unknown as T[]) || []
      scopedCache.set(key, list as FormResponse[])
      setResponses(list)
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [user, profile, select])

  return { responses, loading }
}

export interface StudentSummary {
  student_name: string
  student_email: string
  responseCount: number
  lastCompletedAt: string
  avgTct: number | null
  bestTct: number | null
  turma: string | null
}

export type PerformanceStatus = 'excelente' | 'bom' | 'regular' | 'atencao'

export const PERFORMANCE_STATUS_LABELS: Record<PerformanceStatus, string> = {
  excelente: 'Excelente',
  bom: 'Bom',
  regular: 'Regular',
  atencao: 'Atenção',
}

export function getPerformanceStatus(tct: number | null | undefined): PerformanceStatus {
  if (tct == null) return 'regular'
  if (tct >= 80) return 'excelente'
  if (tct >= 60) return 'bom'
  if (tct >= 40) return 'regular'
  return 'atencao'
}

type ResponseWithForm = FormResponse & {
  form?: { title: string; turma?: string | null } | null
}

export function groupResponsesByStudent(responses: ResponseWithForm[]): StudentSummary[] {
  const map = new Map<string, StudentSummary & { tctSum: number; tctCount: number }>()

  for (const r of responses) {
    const existing = map.get(r.student_email)
    const tct = r.percentual_acerto ?? null
    const turma = r.form?.turma ?? null

    if (!existing) {
      map.set(r.student_email, {
        student_name: r.student_name,
        student_email: r.student_email,
        responseCount: 1,
        lastCompletedAt: r.completed_at,
        avgTct: tct,
        bestTct: tct,
        turma,
        tctSum: tct ?? 0,
        tctCount: tct != null ? 1 : 0,
      })
      continue
    }

    existing.responseCount += 1
    if (r.completed_at > existing.lastCompletedAt) {
      existing.lastCompletedAt = r.completed_at
      existing.student_name = r.student_name
      if (turma) existing.turma = turma
    }
    if (tct != null) {
      existing.tctSum += tct
      existing.tctCount += 1
      existing.bestTct =
        existing.bestTct != null ? Math.max(existing.bestTct, tct) : tct
    }
  }

  return Array.from(map.values())
    .map(({ tctSum, tctCount, ...student }) => ({
      ...student,
      avgTct: tctCount > 0 ? tctSum / tctCount : null,
    }))
    .sort((a, b) => b.lastCompletedAt.localeCompare(a.lastCompletedAt))
}

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    || '?'
}

export function studentDetailPath(email: string) {
  return `/professor/relatorios/aluno/${encodeURIComponent(email)}`
}
