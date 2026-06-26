import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  Calculator,
  FlaskConical,
  Globe,
  Landmark,
  Palette,
} from 'lucide-react'
import { AREA_OPTIONS, DIFICULDADE_LEVELS, type Question } from '@/types/database'

export interface ComponentTheme {
  label: string
  description: string
  icon: LucideIcon
  color: string
  bg: string
  border: string
  badge: string
}

const THEMES: Record<string, ComponentTheme> = {
  'Língua Portuguesa': {
    label: 'Língua Portuguesa',
    description: 'Leitura, escrita e análise linguística',
    icon: BookOpen,
    color: 'text-violet-400',
    bg: 'bg-violet-500/15',
    border: 'border-violet-500/30',
    badge: 'bg-violet-500/20 text-violet-300',
  },
  Matemática: {
    label: 'Matemática',
    description: 'Números, operações e resolução de problemas',
    icon: Calculator,
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
    badge: 'bg-blue-500/20 text-blue-300',
  },
  Ciências: {
    label: 'Ciências',
    description: 'Fenômenos naturais e método científico',
    icon: FlaskConical,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500/20 text-emerald-300',
  },
  História: {
    label: 'História',
    description: 'Tempo, sociedade e cultura',
    icon: Landmark,
    color: 'text-orange-400',
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/30',
    badge: 'bg-orange-500/20 text-orange-300',
  },
  Geografia: {
    label: 'Geografia',
    description: 'Espaço, território e meio ambiente',
    icon: Globe,
    color: 'text-pink-400',
    bg: 'bg-pink-500/15',
    border: 'border-pink-500/30',
    badge: 'bg-pink-500/20 text-pink-300',
  },
  Arte: {
    label: 'Arte',
    description: 'Expressão visual e linguagens artísticas',
    icon: Palette,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-500/30',
    badge: 'bg-cyan-500/20 text-cyan-300',
  },
}

const DEFAULT_THEME: ComponentTheme = {
  label: 'Outro',
  description: 'Componente curricular',
  icon: BookOpen,
  color: 'text-slate-400',
  bg: 'bg-white/10',
  border: 'border-white/10',
  badge: 'bg-white/10 text-slate-300',
}

export function getComponentTheme(name: string): ComponentTheme {
  return THEMES[name] ?? { ...DEFAULT_THEME, label: name }
}

export interface ComponentAggregate {
  key: string
  label: string
  count: number
  avgPoints: number
  dominantDifficulty: string | null
  lastUpdated: string | null
}

const DIFFICULTY_WEIGHT: Record<string, number> = {
  Fácil: 1,
  Médio: 2,
  Difícil: 3,
}

function dominantDifficulty(values: string[]): string | null {
  if (values.length === 0) return null
  const counts = new Map<string, number>()
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

function averageDifficultyLabel(values: string[]): string | null {
  const weights = values
    .map((v) => DIFFICULTY_WEIGHT[v])
    .filter((w): w is number => w != null)
  if (weights.length === 0) return null
  const avg = weights.reduce((sum, w) => sum + w, 0) / weights.length
  if (avg < 1.5) return 'Fácil'
  if (avg < 2.5) return 'Médio'
  return 'Difícil'
}

export function aggregateQuestionsByComponent(questions: Question[]): ComponentAggregate[] {
  const knownLabels = new Set(AREA_OPTIONS.map((o) => o.value))
  const labels = AREA_OPTIONS.map((o) => o.value)
  for (const q of questions) {
    if (q.componente_curricular && !knownLabels.has(q.componente_curricular)) {
      labels.push(q.componente_curricular)
      knownLabels.add(q.componente_curricular)
    }
  }

  return labels
    .map((label) => {
      const items = questions.filter((q) => q.componente_curricular === label)
      const points = items.map((q) => q.point_value ?? 1)
      const difficulties = items
        .map((q) => q.nivel_dificuldade)
        .filter((d): d is string => Boolean(d))

      const lastUpdated =
        items.length > 0
          ? items.reduce((latest, q) =>
              !latest || q.created_at > latest ? q.created_at : latest,
            items[0].created_at)
          : null

      return {
        key: label,
        label,
        count: items.length,
        avgPoints:
          points.length > 0
            ? Math.round((points.reduce((s, p) => s + p, 0) / points.length) * 10) / 10
            : 0,
        dominantDifficulty: dominantDifficulty(difficulties),
        lastUpdated,
      }
    })
}

export function computeQuestionBankStats(questions: Question[]) {
  const components = aggregateQuestionsByComponent(questions)
  const withQuestions = components.filter((c) => c.count > 0)
  const points = questions.map((q) => q.point_value ?? 1)
  const difficulties = questions
    .map((q) => q.nivel_dificuldade)
    .filter((d): d is string => Boolean(d))

  return {
    totalQuestions: questions.length,
    componentCount: withQuestions.length,
    avgPoints:
      points.length > 0
        ? Math.round((points.reduce((s, p) => s + p, 0) / points.length) * 10) / 10
        : 0,
    avgDifficulty: averageDifficultyLabel(difficulties),
    components,
  }
}

export function formatPointsLabel(value: number): string {
  return `${value.toString().replace('.', ',')} ${value === 1 ? 'pt' : 'pts'}`
}

export const COMPONENT_SLUG_MAP: Record<string, string> = {
  'lingua-portuguesa': 'Língua Portuguesa',
  matematica: 'Matemática',
  ciencias: 'Ciências',
  historia: 'História',
  geografia: 'Geografia',
  arte: 'Arte',
}

const COMPONENT_LABEL_TO_SLUG = Object.fromEntries(
  Object.entries(COMPONENT_SLUG_MAP).map(([slug, label]) => [label, slug]),
)

export function componentToSlug(component: string): string {
  return COMPONENT_LABEL_TO_SLUG[component] ?? encodeURIComponent(component)
}

export function slugToComponent(slug: string): string {
  if (COMPONENT_SLUG_MAP[slug]) return COMPONENT_SLUG_MAP[slug]
  try {
    return decodeURIComponent(slug)
  } catch {
    return slug
  }
}

export function isKnownComponent(component: string): boolean {
  return (
    AREA_OPTIONS.some((option) => option.value === component) ||
    component in THEMES ||
    Object.values(COMPONENT_SLUG_MAP).includes(component)
  )
}

export { DIFICULDADE_LEVELS }
