import { Select, Input } from '../../../components/ui'
import { useComunidades } from '../../../hooks'
import { Filter, Calendar } from 'lucide-react'

export function EnvioFilters({ filtros, onFiltrosChange }) {
  const { data: comunidades = [] } = useComunidades()

  const handleChange = (key, value) => {
    onFiltrosChange({
      ...filtros,
      [key]: value
    })
  }

  const estadosEnvio = [
    { value: '', label: 'Todos los estados' },
    { value: 'pendiente', label: 'Pendientes de envío' },
    { value: 'sin_email', label: 'Sin email' },
    { value: 'enviado', label: 'Ya enviados' }
  ]

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
      <Filter size={18} className="text-gray-400" />

      <Select
        value={filtros.comunidadId || ''}
        onChange={(e) => handleChange('comunidadId', e.target.value || null)}
        className="w-64"
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
        className="w-48"
      >
        {estadosEnvio.map((estado) => (
          <option key={estado.value} value={estado.value}>
            {estado.label}
          </option>
        ))}
      </Select>

      <div className="flex items-center gap-2">
        <Calendar size={16} className="text-gray-400" />
        <span className="text-sm text-gray-500">Desde:</span>
        <Input
          type="date"
          value={filtros.fechaDesde || ''}
          onChange={(e) => handleChange('fechaDesde', e.target.value || null)}
          className="w-40"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Hasta:</span>
        <Input
          type="date"
          value={filtros.fechaHasta || ''}
          onChange={(e) => handleChange('fechaHasta', e.target.value || null)}
          className="w-40"
        />
      </div>
    </div>
  )
}



