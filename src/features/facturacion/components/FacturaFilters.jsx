import React from 'react'
import { Search, Filter, X, Calendar } from 'lucide-react'
import { Button, Card } from '@/components/ui'

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'borrador', label: 'Borradores' },
  { value: 'emitida', label: 'Emitidas' },
  { value: 'pagada', label: 'Pagadas' },
  { value: 'anulada', label: 'Anuladas' }
]

const RANGOS_FECHA = [
  { value: '', label: 'Todo el tiempo' },
  { value: 'mes_actual', label: 'Mes actual' },
  { value: 'mes_anterior', label: 'Mes anterior' },
  { value: 'ultimo_trimestre', label: 'Último trimestre' },
  { value: 'este_año', label: 'Este año' },
  { value: 'personalizado', label: 'Personalizado' }
]

// Función para calcular rangos de fecha
function calcularRangoFecha(tipo) {
  const hoy = new Date()
  let desde, hasta

  switch (tipo) {
    case 'mes_actual':
      desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
      break
    case 'mes_anterior':
      desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
      hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
      break
    case 'ultimo_trimestre':
      desde = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1)
      hasta = hoy
      break
    case 'este_año':
      desde = new Date(hoy.getFullYear(), 0, 1)
      hasta = new Date(hoy.getFullYear(), 11, 31)
      break
    default:
      return { desde: null, hasta: null }
  }

  // Convertir a formato YYYY-MM-DD
  return {
    desde: desde.toISOString().split('T')[0],
    hasta: hasta.toISOString().split('T')[0]
  }
}

export function FacturaFilters({ 
  comunidades = [],
  filters = {},
  onChange,
  onClear
}) {
  const hasFilters = filters.comunidadId || filters.estado || filters.search || 
                     filters.rangoFecha || filters.fechaDesde || filters.fechaHasta

  // Manejador para cambio de rango predefinido
  const handleRangoChange = (rango) => {
    if (rango === 'personalizado') {
      onChange({ 
        ...filters, 
        rangoFecha: rango,
        fechaDesde: '',
        fechaHasta: ''
      })
    } else if (rango === '') {
      onChange({ 
        ...filters, 
        rangoFecha: '',
        fechaDesde: null,
        fechaHasta: null
      })
    } else {
      const { desde, hasta } = calcularRangoFecha(rango)
      onChange({ 
        ...filters, 
        rangoFecha: rango,
        fechaDesde: desde,
        fechaHasta: hasta
      })
    }
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Primera fila: Comunidad, Estado, Búsqueda */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Comunidad */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Comunidad
            </label>
            <select
              value={filters.comunidadId || ''}
              onChange={(e) => onChange({ ...filters, comunidadId: e.target.value })}
              className="w-full rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Todas las comunidades</option>
              {comunidades.map(c => (
                <option key={c.id} value={c.id}>
                  {c.codigo} - {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div className="w-48">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Estado
            </label>
            <select
              value={filters.estado || ''}
              onChange={(e) => onChange({ ...filters, estado: e.target.value })}
              className="w-full rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {ESTADOS.map(e => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>

          {/* Búsqueda */}
          <div className="flex-1 min-w-[250px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.search || ''}
                onChange={(e) => onChange({ ...filters, search: e.target.value })}
                placeholder="Nº factura, cliente, NIF..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Segunda fila: Filtros de fecha */}
        <div className="flex flex-wrap items-end gap-4 pt-2 border-t">
          <Calendar className="w-5 h-5 text-gray-400 mb-2" />
          
          {/* Rango predefinido */}
          <div className="w-56">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Período
            </label>
            <select
              value={filters.rangoFecha || ''}
              onChange={(e) => handleRangoChange(e.target.value)}
              className="w-full rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {RANGOS_FECHA.map(r => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Campos de fecha personalizada */}
          {filters.rangoFecha === 'personalizado' && (
            <>
              <div className="w-48">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={filters.fechaDesde || ''}
                  onChange={(e) => onChange({ ...filters, fechaDesde: e.target.value })}
                  className="w-full rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="w-48">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={filters.fechaHasta || ''}
                  onChange={(e) => onChange({ ...filters, fechaHasta: e.target.value })}
                  className="w-full rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* Limpiar filtros */}
          {hasFilters && (
            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={onClear}
                className="h-[38px]"
              >
                <X className="w-4 h-4 mr-1" />
                Limpiar
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}



