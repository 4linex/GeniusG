import { Outlet, useLocation } from 'react-router-dom'

const PAGE_TITLES: Record<string, { title: string; description: string }> = {
  '/professor/relatorios/alunos': {
    title: 'Alunos',
    description: 'Desempenho individual, filtros e gráficos por aluno',
  },
  '/professor/relatorios/formulario': {
    title: 'Por Formulário',
    description: 'Análise agregada e detalhamento por avaliação',
  },
  '/professor/relatorios/habilidades': {
    title: 'Habilidades',
    description: 'BNCC, Bloom, TRI e habilidades com déficit',
  },
}

function getPageMeta(pathname: string) {
  if (pathname.startsWith('/professor/relatorios/aluno/')) {
    return PAGE_TITLES['/professor/relatorios/alunos']
  }
  if (pathname.startsWith('/professor/relatorios/formulario/')) {
    return PAGE_TITLES['/professor/relatorios/formulario']
  }
  for (const [path, meta] of Object.entries(PAGE_TITLES)) {
    if (pathname === path || pathname.startsWith(`${path}/`)) return meta
  }
  return PAGE_TITLES['/professor/relatorios/alunos']
}

export function ReportsLayout() {
  const { pathname } = useLocation()
  const meta = getPageMeta(pathname)

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">{meta.title}</h1>
      <p className="text-slate-400 mb-6">{meta.description}</p>
      <Outlet />
    </div>
  )
}

