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

      <div className="divide-y divide-gray-100">
        {envios.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No hay envíos recientes
          </div>
        ) : (
          envios.map((envio) => (
            <div
              key={envio.id}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => navigate(`/facturacion/envios/historial?envio=${envio.id}`)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">
                      {envio.factura?.numero_completo || 'N/A'}
                    </span>
                    <EstadoEnvioBadge estado={envio.estado} size="xs" />
                    {envio.es_test && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        🧪 TEST
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {envio.email_destino}
                  </p>
                  {envio.cliente && (
                    <p className="text-xs text-gray-400 mt-1">
                      {envio.cliente.nombre} {envio.cliente.apellidos}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400 whitespace-nowrap">
                    {formatFecha(envio.created_at)}
                  </p>
                  {envio.factura?.total != null && (
                    <p className="text-sm font-medium text-gray-700 mt-1">
                      {new Intl.NumberFormat('es-ES', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format(envio.factura.total)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}



