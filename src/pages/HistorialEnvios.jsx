import { useState } from 'react'
import { History, RefreshCw } from 'lucide-react'
import { Modal } from '../components/ui'
import { useToast } from '../components/ui/Toast'
import {
  HistorialEnviosTable,
  HistorialFilters,
  EstadoEnvioBadge
} from '../features/envios/components'
import {
  useHistorialEnvios,
  useEnvio,
  useReintentarEnvio
} from '../hooks/useEnvios'

export default function HistorialEnvios() {
  const toast = useToast()
  const [filtros, setFiltros] = useState({
    comunidadId: null,
    estado: null,
    periodo: null,
    fechaInicio: null,
    fechaFin: null,
    search: '',
    page: 1
  })
  const [selectedEnvioId, setSelectedEnvioId] = useState(null)

  const { data: historial, isLoading, refetch } = useHistorialEnvios(filtros)
  const { data: envioDetalle, isLoading: detalleLoading } = useEnvio(selectedEnvioId)

  // Debug: Log cuando cambia selectedEnvioId
  console.log('selectedEnvioId:', selectedEnvioId, 'envioDetalle:', envioDetalle)
  const reintentarEnvio = useReintentarEnvio()

  const handleReintentar = async (envioId) => {
    try {
      await reintentarEnvio.mutateAsync(envioId)
      toast.success('Envío reintentado correctamente')
      refetch()
    } catch (error) {
      toast.error('Error al reintentar: ' + error.message)
    }
  }

  const handlePageChange = (newPage) => {
    setFiltros(prev => ({ ...prev, page: newPage }))
  }

  const formatFecha = (fecha) => {
    if (!fecha) return '-'
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <History className="text-primary-500" />
          Historial de Envíos
        </h1>
        <p className="text-gray-500">
          Consulta todos los envíos de facturas realizados
        </p>
      </div>

      {/* Filtros */}
      <HistorialFilters filtros={filtros} onFiltrosChange={setFiltros} />

      {/* Leyenda de estados */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-gray-500">Estados:</span>
        <EstadoEnvioBadge estado="enviado" size="xs" />
        <EstadoEnvioBadge estado="entregado" size="xs" />
        <EstadoEnvioBadge estado="abierto" size="xs" />
        <EstadoEnvioBadge estado="rebotado" size="xs" />
        <EstadoEnvioBadge estado="fallido" size="xs" />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <HistorialEnviosTable
          envios={historial?.data || []}
          isLoading={isLoading}
          onViewDetalle={setSelectedEnvioId}
          onReintentar={handleReintentar}
        />

        {/* Paginación */}
        {historial && historial.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Mostrando {((historial.page - 1) * historial.pageSize) + 1} - {Math.min(historial.page * historial.pageSize, historial.total)} de {historial.total} envíos
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(historial.page - 1)}
                disabled={historial.page === 1}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-600">
                Página {historial.page} de {historial.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(historial.page + 1)}
                disabled={historial.page === historial.totalPages}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      <Modal
        isOpen={!!selectedEnvioId}
        onClose={() => setSelectedEnvioId(null)}
        title="Detalle del Envío"
        size="md"
      >
        {detalleLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-100 rounded w-full"></div>
            <div className="h-4 bg-gray-100 rounded w-3/4"></div>
          </div>
        ) : envioDetalle && (
          <div className="space-y-6">
            {/* Estado actual */}
            <div className="flex items-center justify-between">
              <EstadoEnvioBadge estado={envioDetalle.estado} size="md" />
              <span className="text-sm text-gray-500">
                {envioDetalle.intentos} intento(s)
              </span>
            </div>

            {/* Información principal */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Factura</p>
                <p className="font-medium">{envioDetalle.factura?.numero_completo || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="font-medium">
                  {new Intl.NumberFormat('es-ES', { 
                    style: 'currency', 
                    currency: 'EUR' 
                  }).format(envioDetalle.factura?.total || 0)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Destinatario</p>
                <p className="font-medium">{envioDetalle.email_destino}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Asunto</p>
                <p className="font-medium">{envioDetalle.asunto}</p>
              </div>
            </div>

            {/* Timeline de eventos */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Timeline</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  <span className="text-gray-500">Creado:</span>
                  <span>{formatFecha(envioDetalle.created_at)}</span>
                </div>
                {envioDetalle.fecha_enviado && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-gray-500">Enviado:</span>
                    <span>{formatFecha(envioDetalle.fecha_enviado)}</span>
                  </div>
                )}
                {envioDetalle.fecha_entregado && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-gray-500">Entregado:</span>
                    <span>{formatFecha(envioDetalle.fecha_entregado)}</span>
                  </div>
                )}
                {envioDetalle.fecha_abierto && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-gray-500">Abierto:</span>
                    <span>{formatFecha(envioDetalle.fecha_abierto)}</span>
                  </div>
                )}
                {envioDetalle.fecha_rebote && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span className="text-gray-500">Rebotado:</span>
                    <span>{formatFecha(envioDetalle.fecha_rebote)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Error si existe */}
            {envioDetalle.error_mensaje && (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700">
                  <strong>Error:</strong> {envioDetalle.error_mensaje}
                </p>
              </div>
            )}

            {/* Mensaje de rebote si existe */}
            {envioDetalle.mensaje_rebote && (
              <div className="p-3 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-700">
                  <strong>Motivo rebote:</strong> {envioDetalle.mensaje_rebote}
                </p>
              </div>
            )}

            {/* Acciones */}
            {(envioDetalle.estado === 'fallido' || 
              (envioDetalle.estado === 'rebotado' && envioDetalle.tipo_rebote !== 'hard')) && 
             envioDetalle.intentos < envioDetalle.max_intentos && (
              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => {
                    handleReintentar(envioDetalle.id)
                    setSelectedEnvioId(null)
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                >
                  <RefreshCw size={16} />
                  Reintentar envío
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}



