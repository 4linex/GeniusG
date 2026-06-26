export interface IbgeState {
  id: number
  sigla: string
  nome: string
}

export interface IbgeCity {
  id: number
  nome: string
}

const IBGE_BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades'

let statesCache: IbgeState[] | null = null
const citiesCache = new Map<string, IbgeCity[]>()

export async function fetchIbgeStates(): Promise<IbgeState[]> {
  if (statesCache) return statesCache
  const res = await fetch(`${IBGE_BASE}/estados?orderBy=nome`)
  if (!res.ok) throw new Error('Não foi possível carregar os estados')
  statesCache = (await res.json()) as IbgeState[]
  return statesCache
}

export async function fetchIbgeCities(stateUf: string): Promise<IbgeCity[]> {
  const uf = stateUf.trim().toUpperCase()
  if (!uf) return []
  if (citiesCache.has(uf)) return citiesCache.get(uf)!

  const res = await fetch(`${IBGE_BASE}/estados/${uf}/municipios?orderBy=nome`)
  if (!res.ok) throw new Error('Não foi possível carregar as cidades')
  const cities = (await res.json()) as IbgeCity[]
  citiesCache.set(uf, cities)
  return cities
}
