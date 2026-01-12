import { EstadoEnvioBadge } from './EstadoEnvioBadge'
import { ArrowRight, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function EnviosRecientes({ envios = [], isLoading, onRefresh }) {
  const navigate = useNavigate()

  const formatFecha = (fecha) => {
    const date = new Date(fecha)
    const hoy = new Date()
    const ayer = new Date(hoy)
    ayer.setDate(ayer.getDate() - 1)

    if (date.toDateString() === hoy.toDateString()) {
      return `Hoy ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
    } else if (date.toDateString() === ayer.toDateString()) {
      return `Ayer ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
    }
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Envíos Recientes</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Actualizar"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => navigate('/facturacion/envios/historial')}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            Ver todos
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Factura
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente / Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Importe
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {envios.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                  No hay envíos recientes
                </td>
              </tr>
            ) : (
              envios.map((envio) => (
                <tr
                  key={envio.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/facturacion/envios/historial?envio=${envio.id}`)}
                >
                  {/* Factura */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-medium text-gray-900">
                      {envio.factura?.numero_completo || 'N/A'}
                    </span>
                  </td>

                  {/* Cliente / Email */}
                  <td className="px-4 py-3">
                    <div className="max-w-xs">
                      {envio.cliente && (
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {envio.cliente.nombre} {envio.cliente.apellidos}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 truncate">
                        {envio.email_destino}
                      </p>
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <EstadoEnvioBadge estado={envio.estado} size="xs" />
                      {envio.es_test && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          🧪
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Fecha */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs text-gray-500">
                      {formatFecha(envio.created_at)}
                    </span>
                  </td>

                  {/* Importe */}
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    {envio.factura?.total != null ? (
                      <span className="text-sm font-medium text-gray-900">
                        {new Intl.NumberFormat('es-ES', {
                          style: 'currency',
                          currency: 'EUR'
                        }).format(envio.factura.total)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}



