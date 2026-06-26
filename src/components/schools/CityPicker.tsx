import { useEffect, useState } from 'react'
import { Select } from '@/components/ui/Select'
import { fetchIbgeCities, fetchIbgeStates, type IbgeCity, type IbgeState } from '@/lib/ibgeCities'

export interface CitySelection {
  municipio: string
  state_uf: string
}

interface CityPickerProps {
  value: CitySelection
  onChange: (value: CitySelection) => void
  disabled?: boolean
}

export function CityPicker({ value, onChange, disabled }: CityPickerProps) {
  const [states, setStates] = useState<IbgeState[]>([])
  const [cities, setCities] = useState<IbgeCity[]>([])
  const [loadingStates, setLoadingStates] = useState(true)
  const [loadingCities, setLoadingCities] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoadingStates(true)
    fetchIbgeStates()
      .then((data) => {
        if (!cancelled) setStates(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar estados')
      })
      .finally(() => {
        if (!cancelled) setLoadingStates(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!value.state_uf) {
      setCities([])
      return
    }

    let cancelled = false
    setLoadingCities(true)
    fetchIbgeCities(value.state_uf)
      .then((data) => {
        if (!cancelled) setCities(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar cidades')
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false)
      })

    return () => {
      cancelled = true
    }
  }, [value.state_uf])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Select
        label="Estado"
        value={value.state_uf}
        onChange={(e) => onChange({ state_uf: e.target.value, municipio: '' })}
        disabled={disabled || loadingStates}
        options={[
          { value: '', label: loadingStates ? 'Carregando estados…' : 'Selecione o estado' },
          ...states.map((state) => ({ value: state.sigla, label: `${state.nome} (${state.sigla})` })),
        ]}
      />
      <Select
        label="Município"
        value={value.municipio}
        onChange={(e) => onChange({ ...value, municipio: e.target.value })}
        disabled={disabled || !value.state_uf || loadingCities}
        options={[
          {
            value: '',
            label: !value.state_uf
              ? 'Selecione o estado primeiro'
              : loadingCities
                ? 'Carregando cidades…'
                : 'Selecione o município',
          },
          ...cities.map((city) => ({ value: city.nome, label: city.nome })),
        ]}
      />
      {error && <p className="text-sm text-red-400 sm:col-span-2">{error}</p>}
    </div>
  )
}
