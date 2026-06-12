import { useState } from 'react'
import { CardHeader } from '@/components/ui/Card'
import { TabBar } from '@/components/ui/TabBar'
import { UsersSection } from '@/components/settings/UsersSection'
import { DifficultyLevelsSection } from '@/components/settings/DifficultyLevelsSection'
import { Gauge, Users } from 'lucide-react'

type SettingsTab = 'usuarios' | 'dificuldades'

const TABS = [
  { id: 'usuarios' as const, label: 'Usuários', icon: <Users size={16} /> },
  { id: 'dificuldades' as const, label: 'Níveis de dificuldade', icon: <Gauge size={16} /> },
]

export function GeneralSettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('usuarios')

  return (
    <div>
      <CardHeader
        title="Configurações Gerais"
        description="Gerencie usuários, níveis de dificuldade e pontuações padrão do sistema."
      />

      <TabBar items={TABS} active={tab} onChange={setTab} className="mb-8" />

      {tab === 'usuarios' && <UsersSection />}
      {tab === 'dificuldades' && <DifficultyLevelsSection />}
    </div>
  )
}
