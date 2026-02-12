import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gauge, Search, X } from 'lucide-react'
import { Card, Badge, EmptyState } from '@/components/ui'
import { useContadores } from '@/hooks/useContadores'

export function ComunidadContadoresTab({ comunidad }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data: contadores, isLoading } = useContadores({ comunidadId: comunidad.id })

  // Filtrar por busqueda local
  const contadoresFiltrados = useMemo(() => {
    if (!contadores) return []
    if (!search) return contadores

    const term = search.toLowerCase()
    return contadores.filter(c =>
      c.numero_serie?.toLowerCase().includes(term) ||
      c.marca?.toLowerCase().includes(term) ||
      c.modelo?.toLowerCase().includes(term) ||
      c.ubicacion_nombre?.toLowerCase().includes(term) ||
      c.agrupacion_nombre?.toLowerCase().includes(term)
    )
  }, [contadores, search])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-500">Cargando contadores...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumen + Busqueda */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-gray-500">
          {contadores?.length || 0} contador{contadores?.length !== 1 ? 'es' : ''} en esta comunidad
        </p>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por N. serie, marca, ubicacion..."
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      {contadoresFiltrados.length === 0 ? (
        <EmptyState
          icon={Gauge}
          title={search ? 'Sin resultados' : 'Sin contadores'}
          description={search
            ? 'No se encontraron contadores con ese criterio'
            : 'No hay contadores asignados a esta comunidad'}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N. Serie</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca / Modelo</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{comunidad.nombre_agrupacion || 'Portal'}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{comunidad.nombre_ubicacion || 'Vivienda'}</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conceptos</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {contadoresFiltrados.map(contador => (
                  <tr
                    key={contador.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/contadores/${contador.id}`)}
                  >
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="font-mono font-medium text-gray-900 text-sm">
                        {contador.numero_serie}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {[contador.marca, contador.modelo].filter(Boolean).join(' ') || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                      {contador.agrupacion_nombre || '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                      {contador.ubicacion_nombre || '-'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {contador.conceptos?.filter(c => c.activo).map(concepto => (
                          <span
                            key={concepto.concepto_id}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                          >
                            {concepto.concepto_codigo}
                          </span>
                        ))}
                        {(!contador.conceptos || contador.conceptos.filter(c => c.activo).length === 0) && (
                          <span className="text-xs text-gray-400">Sin conceptos</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      <Badge variant={contador.activo ? 'success' : 'default'} className="text-xs">
                        {contador.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
