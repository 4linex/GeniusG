import { useState } from 'react'
import { CardHeader } from '@/components/ui/Card'
import { TabBar } from '@/components/ui/TabBar'
import { UsersSection } from '@/components/settings/UsersSection'
import { DifficultyLevelsSection } from '@/components/settings/DifficultyLevelsSection'
import { SkillsBankSection } from '@/components/settings/SkillsBankSection'
import { SchoolsSection } from '@/components/settings/SchoolsSection'
import { Gauge, Users, BookOpen, Building2 } from 'lucide-react'

type SettingsTab = 'usuarios' | 'escolas' | 'dificuldades' | 'habilidades'

const TABS = [
  { id: 'usuarios' as const, label: 'Usuários', icon: <Users size={16} /> },
  { id: 'escolas' as const, label: 'Escolas', icon: <Building2 size={16} /> },
  { id: 'dificuldades' as const, label: 'Níveis de dificuldade', icon: <Gauge size={16} /> },
  { id: 'habilidades' as const, label: 'Banco de habilidades', icon: <BookOpen size={16} /> },
]

export function GeneralSettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('usuarios')

  return (
    <div>
      <CardHeader
        title="Configurações Gerais"
        description="Gerencie usuários, escolas, níveis de dificuldade, habilidades pedagógicas e pontuações padrão do sistema."
      />

      <TabBar items={TABS} active={tab} onChange={setTab} className="mb-8" />

      {tab === 'usuarios' && <UsersSection />}
      {tab === 'escolas' && <SchoolsSection />}
      {tab === 'dificuldades' && <DifficultyLevelsSection />}
      {tab === 'habilidades' && <SkillsBankSection />}
    </div>
  )
}
