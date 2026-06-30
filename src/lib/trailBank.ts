import {
  getProfessorTrailPdfUrl,
  getStudentTrailPdfUrl,
  PROFESSOR_TRAIL_COLUMNS,
} from '@/lib/trailAreas'
import type { TrailTier } from '@/lib/trailRecommendation'
import type { ResolvedStudentTrail } from '@/lib/studentResponseTrail'
import { supabase } from '@/lib/supabase'
import type { LearningTrail, NivelProficiencia } from '@/types/database'

const TIER_TO_NIVEL: Record<TrailTier, NivelProficiencia> = {
  1: 'inicial',
  2: 'intermediario',
  3: 'avancado',
}

export async function loadLearningTrailsByNivel(): Promise<Map<NivelProficiencia, LearningTrail>> {
  const { data, error } = await supabase
    .from('learning_trails')
    .select(PROFESSOR_TRAIL_COLUMNS)
    .order('title')

  if (error) {
    console.warn('Não foi possível carregar banco de trilhas:', error.message)
    return new Map()
  }

  const map = new Map<NivelProficiencia, LearningTrail>()
  for (const trail of (data ?? []) as LearningTrail[]) {
    const nivel = trail.nivel_proficiencia
    if (nivel && !map.has(nivel)) {
      map.set(nivel, trail)
    }
  }
  return map
}

export function enrichResolvedWithTrailBank(
  resolved: ResolvedStudentTrail,
  bankByNivel: Map<NivelProficiencia, LearningTrail>,
): ResolvedStudentTrail {
  const tier = resolved.trailTier ?? resolved.diagnosis?.trailTier
  if (!tier) return resolved

  const bankTrail = bankByNivel.get(TIER_TO_NIVEL[tier])
  const trail = resolved.trail ?? bankTrail ?? null

  const pdfUrl =
    resolved.pdfUrl ??
    getProfessorTrailPdfUrl(trail) ??
    (bankTrail ? getProfessorTrailPdfUrl(bankTrail) : null)
  const studentPdfUrl =
    resolved.studentPdfUrl ??
    getStudentTrailPdfUrl(trail) ??
    (bankTrail ? getStudentTrailPdfUrl(bankTrail) : null)

  if (!trail && !pdfUrl && !studentPdfUrl) return resolved

  return {
    ...resolved,
    trail,
    displayTitle: resolved.displayTitle || trail?.title || bankTrail?.title || resolved.displayTitle,
    pdfUrl,
    studentPdfUrl,
  }
}
