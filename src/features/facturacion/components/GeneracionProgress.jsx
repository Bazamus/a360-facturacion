import { Modal } from '@/components/ui'
import { Check, X, AlertTriangle, Loader2, FileText, CheckCircle2, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * Modal de progreso para generación de facturas en borrador
 * Muestra el progreso en tiempo real y resultados finales
 */
export function GeneracionProgress({
  isOpen,
  onClose,
  progress,
  resultados,
  isCompleted,
  onVerFacturas
}) {
  const navigate = useNavigate()
  const porcentaje = progress?.porcentaje || 0
  const actual = progress?.actual || 0
  const total = progress?.total || 0

  // Calcular tasa de éxito
  const tasaExito = resultados?.success?.length
    ? Math.round((resultados.success.length / (resultados.success.length + resultados.errors.length)) * 100)
    : 0

  return (
    <Modal
      open={isOpen}
      onClose={isCompleted ? onClose : undefined}
      title={
        isCompleted
          ? '✅ Generación Completada'
          : '⚙️ Generando Facturas en Borrador'
      }
      size="lg"
    >
      <div className="space-y-6">
        {/* Procesando activamente */}
        {!isCompleted && (
          <div className="space-y-4">
            {/* Animación de generación */}
            <div className="flex items-center justify-center py-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 border-4 border-blue-200 rounded-full animate-ping opacity-20"></div>
                </div>
                <div className="relative w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="text-blue-600 animate-pulse" size={40} />
                </div>
              </div>
            </div>

            {/* Barra de progreso mejorada */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Generando facturas...</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {actual} de {total} facturas procesadas
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{porcentaje}%</p>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out relative overflow-hidden"
                  style={{ width: `${porcentaje}%` }}
                >
                  <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Factura actual en proceso */}
            {progress?.contador && (
              <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                <div className="flex items-center gap-3">
                  <Loader2 className="text-blue-600 animate-spin flex-shrink-0" size={20} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 uppercase tracking-wide font-medium">Procesando ahora</p>
                    <p className="text-sm font-semibold text-gray-900 truncate mt-0.5">
                      Contador: {progress.contador}
                    </p>
                    {progress.cliente && (
                      <p className="text-xs text-gray-500 truncate">{progress.cliente}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Mensaje informativo */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 text-center">
                Por favor, espera mientras se generan las facturas. Este proceso puede tardar unos momentos...
              </p>
            </div>
          </div>
        )}

        {/* Resumen final mejorado */}
        {isCompleted && resultados && (
          <div className="space-y-6">
            {/* Hero section con animación */}
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4 animate-bounce">
                <CheckCircle2 className="text-green-600" size={48} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Generación Completada!
              </h3>
              <p className="text-gray-600">
                Se han procesado <span className="font-semibold text-gray-900">{resultados.success.length + resultados.errors.length}</span> contadores
              </p>
              {tasaExito === 100 && (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                  <CheckCircle2 size={16} />
                  Éxito total: 100%
                </div>
              )}
            </div>

            {/* Estadísticas mejoradas */}
            <div className="grid grid-cols-2 gap-4">
              {/* Generadas exitosamente */}
              <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Check className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-green-700">{resultados.success.length}</p>
                    <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Generadas</p>
                  </div>
                </div>
                {resultados.success.length > 0 && (
                  <p className="text-xs text-green-600 mt-2">
                    ✓ Facturas creadas como borrador
                  </p>
                )}
              </div>

              {/* Errores */}
              <div className={`p-5 rounded-xl border-2 ${
                resultados.errors.length > 0
                  ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${
                    resultados.errors.length > 0 ? 'bg-red-500' : 'bg-gray-300'
                  }`}>
                    <X className="text-white" size={20} />
                  </div>
                  <div>
                    <p className={`text-3xl font-bold ${
                      resultados.errors.length > 0 ? 'text-red-700' : 'text-gray-500'
                    }`}>
                      {resultados.errors.length}
                    </p>
                    <p className={`text-xs font-medium uppercase tracking-wide ${
                      resultados.errors.length > 0 ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      Errores
                    </p>
                  </div>
                </div>
                {resultados.errors.length > 0 && (
                  <p className="text-xs text-red-600 mt-2">
                    ✗ Revisa los detalles abajo
                  </p>
                )}
              </div>
            </div>

            {/* Lista de facturas generadas */}
            {resultados.success.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="text-green-500" size={18} />
                  <p className="text-sm font-semibold text-gray-900">Facturas Generadas</p>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2 bg-gray-50 rounded-lg p-3">
                  {resultados.success.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-green-200 rounded-lg text-sm hover:bg-green-50 transition-colors cursor-pointer"
                      onClick={() => {
                        if (item.facturaId) {
                          navigate(`/facturacion/facturas/${item.facturaId}`)
                          onClose()
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{item.contador}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{item.cliente}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">{item.total?.toFixed(2)} €</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detalles de errores */}
            {resultados.errors.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="text-red-500" size={18} />
                  <p className="text-sm font-semibold text-gray-900">Detalles de Errores</p>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2 bg-gray-50 rounded-lg p-3">
                  {resultados.errors.map((detalle, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-red-50 border-l-4 border-red-400 rounded-lg text-sm"
                    >
                      <p className="font-semibold text-red-800">{detalle.contador}</p>
                      <p className="text-xs text-red-700 mt-1">{detalle.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botones mejorados */}
        <div className="flex justify-between items-center gap-3 pt-6 border-t-2">
          {!isCompleted ? (
            <>
              <p className="text-xs text-gray-500 flex-1">
                No cierres esta ventana hasta que termine...
              </p>
              <div className="px-5 py-2.5 text-gray-400 bg-gray-100 rounded-lg font-medium cursor-not-allowed">
                Generando...
              </div>
            </>
          ) : (
            <>
              <button
                onClick={onVerFacturas}
                className="px-5 py-2.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors font-medium"
              >
                Ver Facturas
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-lg shadow-blue-500/30"
              >
                Cerrar
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
