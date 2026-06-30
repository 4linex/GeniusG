import type { LearningTrail, NivelProficiencia } from '@/types/database'
import type { StudentAssignedTrail } from '@/lib/studentForm'

export type TrailAreaTab = 'professor' | 'aluno'

export interface TrailBankFormData {
  title: string
  description: string
  content: string
  pdfUrl: string
  linkUrl: string
  pedagogicalContent: string
  pedagogicalObjectives: string
  teacherNotes: string
  pedagogicalPdfUrl: string
  pedagogicalLinkUrl: string
  nivelProficiencia: NivelProficiencia | ''
}

export function emptyTrailBankForm(): TrailBankFormData {
  return {
    title: '',
    description: '',
    content: '',
    pdfUrl: '',
    linkUrl: '',
    pedagogicalContent: '',
    pedagogicalObjectives: '',
    teacherNotes: '',
    pedagogicalPdfUrl: '',
    pedagogicalLinkUrl: '',
    nivelProficiencia: '',
  }
}

export function trailToFormData(trail: LearningTrail): TrailBankFormData {
  return {
    title: trail.title,
    description: trail.description || '',
    content: trail.content || '',
    pdfUrl: trail.pdf_url || '',
    linkUrl: trail.link_url || '',
    pedagogicalContent: trail.pedagogical_content || '',
    pedagogicalObjectives: trail.pedagogical_objectives || '',
    teacherNotes: trail.teacher_notes || '',
    pedagogicalPdfUrl: trail.pedagogical_pdf_url || '',
    pedagogicalLinkUrl: trail.pedagogical_link_url || '',
    nivelProficiencia: trail.nivel_proficiencia || '',
  }
}

export function formDataToTrailPayload(data: TrailBankFormData, createdBy?: string) {
  return {
    title: data.title.trim(),
    description: data.description.trim() || null,
    content: data.content.trim() || null,
    pdf_url: data.pdfUrl.trim() || null,
    link_url: data.linkUrl.trim() || null,
    pedagogical_content: data.pedagogicalContent.trim() || null,
    pedagogical_objectives: data.pedagogicalObjectives.trim() || null,
    teacher_notes: data.teacherNotes.trim() || null,
    pedagogical_pdf_url: data.pedagogicalPdfUrl.trim() || null,
    pedagogical_link_url: data.pedagogicalLinkUrl.trim() || null,
    nivel_proficiencia: data.nivelProficiencia || null,
    created_by: createdBy,
  }
}

export function trailToStudentView(trail: Pick<
  LearningTrail,
  'title' | 'description' | 'content' | 'pdf_url' | 'link_url'
>): StudentAssignedTrail {
  return {
    title: trail.title,
    description: trail.description,
    content: trail.content,
    pdf_url: trail.pdf_url,
    link_url: trail.link_url,
  }
}

export function validateStudentTrailArea(data: TrailBankFormData): string | null {
  if (!data.title.trim()) return 'Informe o título da trilha do aluno'
  if (!data.pdfUrl.trim() && !data.linkUrl.trim() && !data.content.trim()) {
    return 'Na área do aluno, informe pelo menos um: PDF, link ou conteúdo em texto'
  }
  if (data.linkUrl.trim() && !/^https?:\/\//i.test(data.linkUrl.trim())) {
    return 'O link do aluno deve começar com http:// ou https://'
  }
  return null
}

export function validatePedagogicalLink(url: string): string | null {
  if (url.trim() && !/^https?:\/\//i.test(url.trim())) {
    return 'O link pedagógico deve começar com http:// ou https://'
  }
  return null
}

export function getStudentTrailPdfUrl(
  trail?: Pick<LearningTrail, 'pdf_url'> | null,
  fallbackPdfUrl?: string | null,
): string | null {
  const fromTrail = trail?.pdf_url?.trim()
  if (fromTrail) return fromTrail
  const fallback = fallbackPdfUrl?.trim()
  return fallback || null
}

export function getStudentTrailLinkUrl(
  trail?: Pick<LearningTrail, 'link_url'> | null,
  fallbackLinkUrl?: string | null,
): string | null {
  const fromTrail = trail?.link_url?.trim()
  if (fromTrail) return fromTrail
  const fallback = fallbackLinkUrl?.trim()
  return fallback || null
}

export function getProfessorTrailPdfUrl(
  trail?: Pick<LearningTrail, 'pedagogical_pdf_url' | 'pdf_url'> | null,
  fallbackPdfUrl?: string | null,
): string | null {
  const fromTrail = trail?.pedagogical_pdf_url?.trim() || trail?.pdf_url?.trim()
  if (fromTrail) return fromTrail
  const fallback = fallbackPdfUrl?.trim()
  return fallback || null
}

export function getProfessorTrailLinkUrl(
  trail?: Pick<LearningTrail, 'pedagogical_link_url' | 'link_url'> | null,
  fallbackLinkUrl?: string | null,
): string | null {
  const fromTrail = trail?.pedagogical_link_url?.trim() || trail?.link_url?.trim()
  if (fromTrail) return fromTrail
  const fallback = fallbackLinkUrl?.trim()
  return fallback || null
}

export function hasPedagogicalContent(trail: LearningTrail): boolean {
  return Boolean(
    trail.pedagogical_content?.trim()
    || trail.pedagogical_objectives?.trim()
    || trail.teacher_notes?.trim()
    || trail.pedagogical_pdf_url
    || trail.pedagogical_link_url,
  )
}

export function hasStudentContent(trail: LearningTrail): boolean {
  return Boolean(
    trail.title?.trim()
    && (trail.pdf_url || trail.link_url || trail.content?.trim() || trail.description?.trim()),
  )
}

export const TRAIL_AREA_TABS = [
  { id: 'professor' as const, label: 'Área do Professor' },
  { id: 'aluno' as const, label: 'Área do Aluno' },
]

export const STUDENT_TRAIL_COLUMNS =
  'id, title, description, pdf_url, link_url, content' as const

export const PROFESSOR_TRAIL_COLUMNS =
  'id, title, description, pdf_url, link_url, content, pedagogical_content, pedagogical_pdf_url, pedagogical_link_url, pedagogical_objectives, teacher_notes, nivel_proficiencia, created_at' as const
