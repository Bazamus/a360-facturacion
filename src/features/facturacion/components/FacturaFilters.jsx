import React from 'react'
import { Search, Filter, X } from 'lucide-react'
import { Button, Card } from '@/components/ui'

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'borrador', label: 'Borradores' },
  { value: 'emitida', label: 'Emitidas' },
  { value: 'pagada', label: 'Pagadas' },
  { value: 'anulada', label: 'Anuladas' }
]

export function FacturaFilters({ 
  comunidades = [],
  filters = {},
  onChange,
  onClear
}) {
  const hasFilters = filters.comunidadId || filters.estado || filters.search

  return (
    <Card className="p-4">
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

        {/* Limpiar filtros */}
        {hasFilters && (
          <div className="flex items-end">
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
    </Card>
  )
}



