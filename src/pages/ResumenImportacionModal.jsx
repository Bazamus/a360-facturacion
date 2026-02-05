import { X, Calendar, FileText, CheckCircle, AlertTriangle, XCircle, User } from 'lucide-react'
import { Button, Badge, Card, LoadingSpinner } from '@/components/ui'
import { useImportacion, useImportacionDetalle } from '@/hooks/useLecturas'
import { formatDateTime } from '@/lib/utils'

const estadoBadges = {
  pendiente: { variant: 'default', label: 'Pendiente', icon: FileText },
  procesando: { variant: 'info', label: 'Procesando', icon: FileText },
  validado: { variant: 'warning', label: 'Por validar', icon: AlertTriangle },
  confirmado: { variant: 'success', label: 'Confirmado', icon: CheckCircle },
  cancelado: { variant: 'danger', label: 'Cancelado', icon: XCircle }
}

export function ResumenImportacionModal({ open, onClose, importacionId }) {
  const { data: importacion, isLoading: loadingImportacion } = useImportacion(importacionId)
  const { data: detalles, isLoading: loadingDetalles } = useImportacionDetalle(importacionId)

  if (!open) return null

  const estadoConfig = importacion ? estadoBadges[importacion.estado] || estadoBadges.pendiente : null
  const EstadoIcon = estadoConfig?.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Resumen de Importación
              </h2>
              {importacion && (
                <p className="text-sm text-gray-500 mt-1">
                  {importacion.nombre_archivo}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loadingImportacion ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : !importacion ? (
            <div className="text-center py-12 text-gray-500">
              No se encontró la importación
            </div>
          ) : (
            <div className="space-y-6">
              {/* Estado y fechas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    {EstadoIcon && <EstadoIcon className="w-8 h-8 text-gray-400" />}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Estado</p>
                      <Badge variant={estadoConfig.variant}>
                        {estadoConfig.label}
                      </Badge>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-8 h-8 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Fecha de importación</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDateTime(importacion.fecha_subida)}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <User className="w-8 h-8 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Comunidad</p>
                      <p className="text-sm font-medium text-gray-900">
                        {importacion.comunidad?.codigo}
                      </p>
                      <p className="text-xs text-gray-500 truncate max-w-[150px]">
                        {importacion.comunidad?.nombre}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Estadísticas */}
              <Card className="p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  Estadísticas de Filas
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">
                      {importacion.total_filas || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Total</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {importacion.filas_validas || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Válidas</p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-lg">
                    <p className="text-2xl font-bold text-amber-600">
                      {importacion.filas_con_alertas || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Con alertas</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">
                      {importacion.filas_error || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Errores</p>
                  </div>
                </div>
              </Card>

              {/* Información adicional */}
              {importacion.estado === 'confirmado' && (
                <Card className="p-6 bg-green-50 border-green-200">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        Importación confirmada
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        Las lecturas válidas han sido guardadas en el sistema y están disponibles para facturación.
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {importacion.estado === 'cancelado' && (
                <Card className="p-6 bg-red-50 border-red-200">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900">
                        Importación cancelada
                      </p>
                      <p className="text-sm text-red-700 mt-1">
                        Esta importación fue cancelada y sus lecturas fueron eliminadas del sistema.
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Lista de detalles (opcional, solo si hay pocos registros) */}
              {loadingDetalles ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : detalles && detalles.length > 0 && detalles.length <= 20 && (
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">
                    Detalles de Filas ({detalles.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Contador
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Concepto
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Lectura
                          </th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                            Estado
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {detalles.map((detalle, index) => (
                          <tr key={detalle.id || index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-xs text-gray-900">
                              {detalle.contador?.numero_serie || '-'}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-900">
                              {detalle.concepto?.codigo || '-'}
                            </td>
                            <td className="px-3 py-2 text-xs text-right text-gray-900">
                              {detalle.lectura_valor}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Badge
                                variant={
                                  detalle.estado === 'valido'
                                    ? 'success'
                                    : detalle.estado === 'alerta'
                                    ? 'warning'
                                    : 'danger'
                                }
                                className="text-[10px]"
                              >
                                {detalle.estado}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {detalles && detalles.length > 20 && (
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <p className="text-sm text-blue-900">
                    Esta importación contiene {detalles.length} filas. Para ver el detalle completo,
                    ve a la sección de validación de lecturas.
                  </p>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}
