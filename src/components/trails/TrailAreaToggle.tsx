import { TabBar } from '@/components/ui/TabBar'
import type { TrailAreaTab } from '@/lib/trailAreas'
import { BookOpen, UserRound } from 'lucide-react'

interface TrailAreaToggleProps {
  value: TrailAreaTab
  onChange: (tab: TrailAreaTab) => void
  className?: string
}

export function TrailAreaToggle({ value, onChange, className }: TrailAreaToggleProps) {
  return (
    <TabBar
      className={className}
      items={[
        { id: 'professor' as const, label: 'Professor', icon: <BookOpen size={14} /> },
        { id: 'aluno' as const, label: 'Aluno', icon: <UserRound size={14} /> },
      ]}
      active={value}
      onChange={onChange}
    />
  )
}
