import { supabase } from '@/lib/supabase'
import { fetchAllInBatches } from '@/lib/supabaseBatch'
import { formatPercentRange } from '@/lib/formTrails'

export interface TrailDistributionRow {
  key: string
  title: string
  percentRange: string
  studentCount: number
  responseCount: number
}

type FormTrailSnapshot = {
  id: string
  title?: string | null
  min_percent: number
  max_percent: number
  learning_trail?: { title?: string | null } | { title?: string | null }[] | null
}

type AssignmentRow = {
  response_id: string
  form_trail?: FormTrailSnapshot | FormTrailSnapshot[] | null
}

function normalizeFormTrail(
  raw: FormTrailSnapshot | FormTrailSnapshot[] | null | undefined,
): FormTrailSnapshot | null {
  if (!raw) return null
  return Array.isArray(raw) ? raw[0] ?? null : raw
}

function trailTitle(formTrail: FormTrailSnapshot): string {
  const bank = formTrail.learning_trail
  const bankTitle = Array.isArray(bank) ? bank[0]?.title : bank?.title
  return bankTitle || formTrail.title || 'Trilha de aprendizagem'
}

export async function loadTrailDistribution(
  responses: Array<{ id: string; student_email: string }>,
): Promise<TrailDistributionRow[]> {
  if (responses.length === 0) return []

  const emailByResponse = new Map(responses.map((r) => [r.id, r.student_email]))
  const responseIds = responses.map((r) => r.id)

  const assignments = await fetchAllInBatches(responseIds, async (chunk) => {
    const { data, error } = await supabase
      .from('student_trail_assignments')
      .select(`
        response_id,
        form_trail:form_trails(
          id,
          title,
          min_percent,
          max_percent,
          learning_trail:learning_trails(title)
        )
      `)
      .in('response_id', chunk)

    if (error) throw error
    return (data || []) as unknown as AssignmentRow[]
  })

  const byTrail = new Map<
    string,
    { title: string; percentRange: string; emails: Set<string>; responses: number }
  >()

  for (const assignment of assignments) {
    const formTrail = normalizeFormTrail(assignment.form_trail)
    if (!formTrail) continue

    const entry = byTrail.get(formTrail.id) || {
      title: trailTitle(formTrail),
      percentRange: formatPercentRange(
        Number(formTrail.min_percent),
        Number(formTrail.max_percent),
      ),
      emails: new Set<string>(),
      responses: 0,
    }

    const email = emailByResponse.get(assignment.response_id)
    if (email) entry.emails.add(email)
    entry.responses++
    byTrail.set(formTrail.id, entry)
  }

  const assignedResponseIds = new Set(assignments.map((a) => a.response_id))
  const withoutTrailEmails = new Set<string>()
  let withoutTrailResponses = 0

  for (const response of responses) {
    if (!assignedResponseIds.has(response.id)) {
      withoutTrailEmails.add(response.student_email)
      withoutTrailResponses++
    }
  }

  const rows: TrailDistributionRow[] = [...byTrail.entries()]
    .map(([key, value]) => ({
      key,
      title: value.title,
      percentRange: value.percentRange,
      studentCount: value.emails.size,
      responseCount: value.responses,
    }))
    .sort((a, b) => b.studentCount - a.studentCount)

  if (withoutTrailResponses > 0) {
    rows.push({
      key: 'sem-trilha',
      title: 'Sem trilha atribuída',
      percentRange: '—',
      studentCount: withoutTrailEmails.size,
      responseCount: withoutTrailResponses,
    })
  }

  return rows
}
