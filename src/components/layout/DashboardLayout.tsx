import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext'
import { cn } from '@/lib/utils'
import { ROLE_LABELS, type UserRole } from '@/types/database'
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { PageShell } from '@/components/layout/PageShell'
import { ReportDataProvider } from '@/contexts/ReportDataContext'
import { APP_NAME, APP_TAGLINE } from '@/lib/branding'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  roles: UserRole[]
  /** Ativa também em sub-rotas (ex.: detalhe do aluno) */
  matchPrefix?: string
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      {
        to: '/dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard size={18} />,
        roles: ['root', 'admin', 'professor'],
      },
    ],
  },
  {
    label: 'Conteúdo',
    items: [
      {
        to: '/formularios',
        label: 'Formulários',
        icon: <ClipboardList size={18} />,
        roles: ['root', 'admin', 'professor'],
      },
      {
        to: '/admin/questoes',
        label: 'Questões',
        icon: <BookOpen size={18} />,
        roles: ['root', 'admin'],
      },
      {
        to: '/professor/trilhas',
        label: 'Banco de Trilhas',
        icon: <Map size={18} />,
        roles: ['professor'],
      },
      {
        to: '/admin/trilhas',
        label: 'Banco de Trilhas',
        icon: <Map size={18} />,
        roles: ['root', 'admin'],
      },
    ],
  },
  {
    label: 'Análises',
    items: [
      {
        to: '/professor/relatorios/alunos',
        label: 'Alunos',
        icon: <Users size={18} />,
        roles: ['root', 'admin', 'professor'],
        matchPrefix: '/professor/relatorios/aluno',
      },
      {
        to: '/professor/relatorios/formulario',
        label: 'Por Formulário',
        icon: <ClipboardList size={18} />,
        roles: ['root', 'admin', 'professor'],
        matchPrefix: '/professor/relatorios/formulario',
      },
      {
        to: '/professor/relatorios/habilidades',
        label: 'Habilidades',
        icon: <BarChart3 size={18} />,
        roles: ['root', 'admin', 'professor'],
        matchPrefix: '/professor/relatorios/habilidades',
      },
    ],
  },
  {
    label: 'Administração',
    items: [
      {
        to: '/admin/configuracoes',
        label: 'Configurações',
        icon: <Settings size={18} />,
        roles: ['root', 'admin'],
      },
    ],
  },
]

function isNavItemActive(pathname: string, item: NavItem) {
  if (item.matchPrefix) {
    return pathname === item.to || pathname.startsWith(`${item.matchPrefix}/`)
  }
  if (item.to === '/formularios') {
    return (
      pathname === '/formularios' ||
      pathname.startsWith('/formularios/') ||
      pathname.startsWith('/admin/formularios')
    )
  }
  if (item.to === '/dashboard') {
    return pathname === '/dashboard' || pathname.startsWith('/dashboard/')
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

function getVisibleGroups(role: UserRole) {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0)
}

function DashboardLayoutInner() {
  const { profile, signOut } = useAuth()
  const { collapsed, toggle, mobileOpen, setMobileOpen, closeMobile, widthClass } = useSidebar()
  const navigate = useNavigate()
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0 })
  }, [location.pathname])

  const isFullBleedRoute =
    /^\/formularios\/(novo|[^/]+)$/.test(location.pathname) &&
    !location.pathname.endsWith('/visualizar')

  const visibleGroups = profile ? getVisibleGroups(profile.role) : []

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const sidebarContent = (
    <>
      <div className={cn('border-b border-white/10 shrink-0', collapsed ? 'p-3' : 'p-5 lg:p-6')}>
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between gap-2')}>
          <h1 className={cn('font-bold gradient-text', collapsed ? 'text-sm' : 'text-lg lg:text-xl')}>
            {collapsed ? 'G' : APP_NAME}
          </h1>
          {!collapsed && (
            <button
              type="button"
              onClick={toggle}
              className="hidden lg:inline-flex p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5"
              title="Minimizar menu"
            >
              <PanelLeftClose size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={closeMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5"
            title="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>
        {!collapsed && (
          <p className="text-xs text-slate-500 mt-1 hidden sm:block">{APP_TAGLINE}</p>
        )}
      </div>

      {collapsed && (
        <div className="px-2 pt-2 hidden lg:block shrink-0">
          <button
            type="button"
            onClick={toggle}
            className="w-full flex justify-center p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5"
            title="Expandir menu"
          >
            <PanelLeftOpen size={18} />
          </button>
        </div>
      )}

      <ScrollArea className={cn('flex-1 min-h-0', collapsed ? 'p-2' : 'p-3 lg:p-4')}>
        <nav className="space-y-5">
          {visibleGroups.map((group, gi) => (
            <div key={group.label ?? `group-${gi}`}>
              {group.label && !collapsed && (
                <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    onClick={closeMobile}
                    className={() =>
                      cn(
                        'flex items-center rounded-xl text-sm transition-colors',
                        collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                        isNavItemActive(location.pathname, item)
                          ? 'bg-primary-500/20 text-primary-300 font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-white/5',
                      )
                    }
                  >
                    {item.icon}
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className={cn('border-t border-white/10 shrink-0', collapsed ? 'p-2' : 'p-3 lg:p-4')}>
        {!collapsed && (
          <div className="mb-3 px-3">
            <p className="text-sm font-medium text-white truncate">{profile?.full_name}</p>
            <p className="text-xs text-slate-500 truncate">
              {profile && ROLE_LABELS[profile.role]}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn('w-full', collapsed ? 'justify-center px-0' : 'justify-start')}
          onClick={handleSignOut}
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut size={16} />
          {!collapsed && 'Sair'}
        </Button>
      </div>
    </>
  )

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <header className="lg:hidden shrink-0 z-30 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 glass">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <span className="font-semibold gradient-text truncate">{APP_NAME}</span>
        <div className="w-9" aria-hidden />
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden lg:flex-row">
        {mobileOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            aria-label="Fechar menu"
            onClick={closeMobile}
          />
        )}

        <aside
          className={cn(
            'glass border-r border-white/10 flex flex-col shrink-0 min-h-0 h-full transition-[transform,width] duration-200 ease-out z-50',
            'fixed inset-y-0 left-0 lg:relative lg:translate-x-0',
            mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
            widthClass,
          )}
        >
          {sidebarContent}
        </aside>

        <main
          ref={mainRef}
          className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain scrollbar-app"
        >
          {isFullBleedRoute ? (
            <Outlet />
          ) : (
            <PageShell>
              <Outlet />
            </PageShell>
          )}
        </main>
      </div>
    </div>
  )
}

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <ReportDataProvider>
        <DashboardLayoutInner />
      </ReportDataProvider>
    </SidebarProvider>
  )
}
