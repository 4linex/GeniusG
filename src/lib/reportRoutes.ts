/** Rotas que precisam do dataset de respostas + respostas por questão. */
export function isReportDataRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/professor/relatorios')
  )
}
