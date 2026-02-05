import { useState } from 'react'
import { X, Trash2, AlertTriangle } from 'lucide-react'
import { useLecturas, useEliminarLectura } from '@/hooks/useLecturas'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/utils'

export function HistorialLecturasModal({ open, onClose, contadorId, concepto }) {
  const [confirmModal, setConfirmModal] = useState({ open: false, lectura: null })
  const toast = useToast()

  // Cargar lecturas del contador-concepto
  const { data: lecturas, isLoading } = useLecturas({
    contadorId,
    conceptoId: concepto?.id,
    limit: 100
  })

  const eliminarLectura = useEliminarLectura()

  const handleEliminarClick = (lectura) => {
    setConfirmModal({ open: true, lectura })
  }

  const handleConfirmarEliminacion = async () => {
    const lectura = confirmModal.lectura
    setConfirmModal({ open: false, lectura: null })

    try {
      const result = await eliminarLectura.mutateAsync(lectura.id)

      const mensaje = result.lectura_actual_nueva !== null
        ? `Lectura eliminada. Lectura actual restaurada a: ${result.lectura_actual_nueva} ${concepto?.unidad_medida || 'm³'} (${formatDate(result.fecha_lectura_actual_nueva)})`
        : 'Lectura eliminada. Lectura actual restaurada a lectura inicial'

      toast.success(mensaje)
    } catch (error) {
      toast.error(`Error al eliminar lectura: ${error.message}`)
    }
  }

  const calcularConsumo = (lectura, index) => {
    // El consumo es la diferencia con la lectura anterior (más antigua)
    if (!lecturas || index >= lecturas.length - 1) return null

    const lecturaAnterior = lecturas[index + 1]
    const consumo = lectura.lectura_valor - lecturaAnterior.lectura_valor
    return consumo >= 0 ? consumo : null
  }

  if (!open) return null

  return (
    <>
      {/* Modal principal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Historial de Lecturas
              </h2>
              {concepto && (
                <p className="text-sm text-gray-500 mt-1">
                  Concepto: {concepto.codigo} - {concepto.nombre}
                </p>
              )}
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
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Cargando lecturas...
              </div>
            ) : !lecturas || lecturas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay lecturas registradas para este concepto
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lectura
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Consumo
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {lecturas.map((lectura, index) => {
                      const consumo = calcularConsumo(lectura, index)
                      return (
                        <tr key={lectura.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(lectura.fecha_lectura)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                            {lectura.lectura_valor} {concepto?.unidad_medida || 'm³'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                            {consumo !== null ? (
                              `${consumo.toFixed(4)} ${concepto?.unidad_medida || 'm³'}`
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <Badge variant={lectura.facturada ? 'success' : 'secondary'}>
                              {lectura.facturada ? 'Facturada' : 'Pendiente'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {!lectura.facturada ? (
                              <button
                                onClick={() => handleEliminarClick(lectura)}
                                className="inline-flex items-center justify-center p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                title="Eliminar lectura"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
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

      {/* Modal de confirmación */}
      {confirmModal.open && confirmModal.lectura && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center gap-3 p-6 border-b">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                Confirmar Eliminación
              </h3>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Advertencia */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900 mb-2">
                      Esta acción es IRREVERSIBLE
                    </p>
                    <ul className="text-sm text-amber-800 space-y-1">
                      <li>• Se eliminará la lectura permanentemente</li>
                      <li>• Se recalculará lectura_actual del contador</li>
                      <li>• Si hay lecturas anteriores, se restaurará a la penúltima</li>
                      <li>• Si no hay lecturas previas, se restaurará a la lectura inicial</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Datos de la lectura */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-gray-600">
                  <strong className="text-gray-900">Fecha:</strong>{' '}
                  {formatDate(confirmModal.lectura.fecha_lectura)}
                </p>
                <p className="text-sm text-gray-600">
                  <strong className="text-gray-900">Lectura:</strong>{' '}
                  {confirmModal.lectura.lectura_valor} {concepto?.unidad_medida || 'm³'}
                </p>
                <p className="text-sm text-gray-600">
                  <strong className="text-gray-900">Concepto:</strong>{' '}
                  {concepto?.codigo} - {concepto?.nombre}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setConfirmModal({ open: false, lectura: null })}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmarEliminacion}
                disabled={eliminarLectura.isPending}
              >
                {eliminarLectura.isPending ? 'Eliminando...' : 'Confirmar Eliminación'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
