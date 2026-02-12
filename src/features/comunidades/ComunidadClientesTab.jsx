import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Search, X } from 'lucide-react'
import { Card, Badge, EmptyState } from '@/components/ui'
import { useClientes } from '@/hooks/useClientes'
import { getBadgeVariant } from '@/utils/estadosCliente'

export function ComunidadClientesTab({ comunidad }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data: clientes, isLoading } = useClientes({ comunidadId: comunidad.id })

  // Filtrar por busqueda local
  const clientesFiltrados = useMemo(() => {
    if (!clientes) return []
    if (!search) return clientes

    const term = search.toLowerCase()
    return clientes.filter(c =>
      c.nombre?.toLowerCase().includes(term) ||
      c.apellidos?.toLowerCase().includes(term) ||
      c.nif?.toLowerCase().includes(term) ||
      c.codigo_cliente?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term)
    )
  }, [clientes, search])

  // Obtener ubicacion actual del cliente en esta comunidad
  const getUbicacionEnComunidad = (cliente) => {
    const uc = cliente.ubicaciones_clientes?.find(uc =>
      uc.es_actual && uc.ubicacion?.agrupacion?.comunidad?.id === comunidad.id
    )
    if (!uc) return '-'
    return `${uc.ubicacion?.agrupacion?.nombre || ''} - ${uc.ubicacion?.nombre || ''}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-500">Cargando clientes...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumen + Busqueda */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-gray-500">
          {clientes?.length || 0} cliente{clientes?.length !== 1 ? 's' : ''} en esta comunidad
        </p>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, NIF, email..."
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
      {clientesFiltrados.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'Sin resultados' : 'Sin clientes'}
          description={search
            ? 'No se encontraron clientes con ese criterio'
            : 'No hay clientes asignados a esta comunidad'}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Codigo</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NIF</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefono</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicacion</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clientesFiltrados.map(cliente => (
                  <tr
                    key={cliente.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/clientes/${cliente.id}`)}
                  >
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs text-gray-600">
                        {cliente.codigo_cliente || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {cliente.nombre} {cliente.apellidos}
                      </div>
                      <div className="text-xs text-gray-500">
                        {cliente.tipo === 'propietario' ? 'Propietario' : 'Inquilino'}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                      {cliente.nif}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {cliente.email ? (
                        <span className="text-sm text-primary-600">{cliente.email}</span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                      {cliente.telefono || '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">
                      {getUbicacionEnComunidad(cliente)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      {cliente.estado ? (
                        <Badge variant={getBadgeVariant(cliente.estado.color)} className="text-xs">
                          {cliente.estado.nombre}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
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
