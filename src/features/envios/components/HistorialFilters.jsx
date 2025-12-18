import { Select, SearchInput } from '../../../components/ui'
import { useComunidades } from '../../../hooks'
import { Filter, Calendar } from 'lucide-react'

export function HistorialFilters({ filtros, onFiltrosChange }) {
  const { data: comunidades = [] } = useComunidades()

  const handleChange = (key, value) => {
    onFiltrosChange({
      ...filtros,
      [key]: value
    })
  }

  const estados = [
    { value: '', label: 'Todos los estados' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'enviado', label: 'Enviado' },
    { value: 'entregado', label: 'Entregado' },
    { value: 'abierto', label: 'Abierto' },
    { value: 'rebotado', label: 'Rebotado' },
    { value: 'fallido', label: 'Fallido' },
    { value: 'cancelado', label: 'Cancelado' }
  ]

  const periodos = [
    { value: '', label: 'Todo el tiempo' },
    { value: 'hoy', label: 'Hoy' },
    { value: 'semana', label: 'Última semana' },
    { value: 'mes', label: 'Último mes' },
    { value: 'trimestre', label: 'Último trimestre' }
  ]

  const handlePeriodoChange = (periodo) => {
    let fechaInicio = null
    let fechaFin = null
    const now = new Date()

    switch (periodo) {
      case 'hoy':
        fechaInicio = new Date(now.setHours(0, 0, 0, 0)).toISOString()
        break
      case 'semana':
        fechaInicio = new Date(now.setDate(now.getDate() - 7)).toISOString()
        break
      case 'mes':
        fechaInicio = new Date(now.setMonth(now.getMonth() - 1)).toISOString()
        break
      case 'trimestre':
        fechaInicio = new Date(now.setMonth(now.getMonth() - 3)).toISOString()
        break
    }

    onFiltrosChange({
      ...filtros,
      periodo,
      fechaInicio,
      fechaFin
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <Filter size={18} className="text-gray-400" />
        
        <Select
          value={filtros.comunidadId || ''}
          onChange={(e) => handleChange('comunidadId', e.target.value || null)}
          className="w-56"
        >
          <option value="">Todas las comunidades</option>
          {comunidades.map((comunidad) => (
            <option key={comunidad.id} value={comunidad.id}>
              {comunidad.nombre}
            </option>
          ))}
        </Select>

        <Select
          value={filtros.estado || ''}
          onChange={(e) => handleChange('estado', e.target.value || null)}
          className="w-44"
        >
          {estados.map((estado) => (
            <option key={estado.value} value={estado.value}>
              {estado.label}
            </option>
          ))}
        </Select>

        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" />
          <Select
            value={filtros.periodo || ''}
            onChange={(e) => handlePeriodoChange(e.target.value)}
            className="w-40"
          >
            {periodos.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <SearchInput
            value={filtros.search || ''}
            onChange={(value) => handleChange('search', value)}
            placeholder="Buscar por email, factura..."
          />
        </div>
      </div>
    </div>
  )
}



