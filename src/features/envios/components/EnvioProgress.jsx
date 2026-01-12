import { Modal } from '../../../components/ui'
import { Check, X, AlertTriangle, Loader2, Mail, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function EnvioProgress({
  isOpen,
  onClose,
  progress,
  resultados,
  isCompleted,
  modoTest = false,
  onCancel
}) {
  const navigate = useNavigate()
  const porcentaje = progress?.porcentaje || 0
  const actual = progress?.actual || 0
  const total = progress?.total || 0

  // Calcular tasa de éxito
  const tasaExito = resultados?.exitosos
    ? Math.round((resultados.exitosos / resultados.total) * 100)
    : 0

  return (
    <Modal
      open={isOpen}
      onClose={isCompleted ? onClose : undefined}
      title={
        isCompleted
          ? '✅ Envío Completado'
          : (modoTest ? '🧪 Enviando Facturas (MODO TEST)' : '📤 Enviando Facturas')
      }
      size="lg"
    >
      <div className="space-y-6">
        {/* Advertencia modo test */}
        {modoTest && !isCompleted && (
          <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="text-yellow-600" size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-yellow-900">Modo de Prueba Activado</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Los emails se enviarán a direcciones de prueba de Resend (delivered+X@resend.dev), no a los clientes reales.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Procesando activamente */}
        {!isCompleted && (
          <div className="space-y-4">
            {/* Animación de envío */}
            <div className="flex items-center justify-center py-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 border-4 border-primary-200 rounded-full animate-ping opacity-20"></div>
                </div>
                <div className="relative w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center">
                  <Mail className="text-primary-600 animate-pulse" size={40} />
                </div>
              </div>
            </div>

            {/* Barra de progreso mejorada */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Enviando facturas...</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {actual} de {total} facturas procesadas
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-600">{porcentaje}%</p>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500 ease-out relative overflow-hidden"
                  style={{ width: `${porcentaje}%` }}
                >
                  <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Factura actual en proceso */}
            {progress?.factura && (
              <div className="p-4 bg-blue-50 border-l-4 border-primary-500 rounded-r-lg">
                <div className="flex items-center gap-3">
                  <Loader2 className="text-primary-600 animate-spin flex-shrink-0" size={20} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 uppercase tracking-wide font-medium">Procesando ahora</p>
                    <p className="text-sm font-semibold text-gray-900 truncate mt-0.5">
                      Factura {progress.factura}
                    </p>
                    {progress.email && (
                      <p className="text-xs text-gray-500 truncate">{progress.email}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
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
                ¡Envío Completado!
              </h3>
              <p className="text-gray-600">
                Se han procesado <span className="font-semibold text-gray-900">{resultados.total}</span> facturas
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
              {/* Enviados exitosamente */}
              <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Check className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-green-700">{resultados.exitosos}</p>
                    <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Enviados</p>
                  </div>
                </div>
                {resultados.exitosos > 0 && (
                  <p className="text-xs text-green-600 mt-2">
                    ✓ Emails entregados correctamente
                  </p>
                )}
              </div>

              {/* Fallidos */}
              <div className={`p-5 rounded-xl border-2 ${
                resultados.fallidos > 0
                  ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${
                    resultados.fallidos > 0 ? 'bg-red-500' : 'bg-gray-300'
                  }`}>
                    <X className="text-white" size={20} />
                  </div>
                  <div>
                    <p className={`text-3xl font-bold ${
                      resultados.fallidos > 0 ? 'text-red-700' : 'text-gray-500'
                    }`}>
                      {resultados.fallidos}
                    </p>
                    <p className={`text-xs font-medium uppercase tracking-wide ${
                      resultados.fallidos > 0 ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      Fallidos
                    </p>
                  </div>
                </div>
                {resultados.fallidos > 0 && (
                  <p className="text-xs text-red-600 mt-2">
                    ✗ Revisa los detalles abajo
                  </p>
                )}
              </div>

              {/* Sin email */}
              {resultados.sinEmail > 0 && (
                <div className="col-span-2 p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500 rounded-lg">
                      <AlertTriangle className="text-white" size={18} />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-amber-700">{resultados.sinEmail}</p>
                      <p className="text-xs text-amber-600 font-medium">Clientes sin email configurado</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Ya enviados */}
              {resultados.yaEnviados > 0 && (
                <div className="col-span-2 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Clock className="text-white" size={18} />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-blue-700">{resultados.yaEnviados}</p>
                      <p className="text-xs text-blue-600 font-medium">Facturas ya enviadas anteriormente</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Detalles de errores mejorados */}
            {resultados.detalles?.some(d => d.status === 'error' || d.status === 'sin_email') && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="text-red-500" size={18} />
                  <p className="text-sm font-semibold text-gray-900">Detalles de Problemas</p>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2 bg-gray-50 rounded-lg p-3">
                  {resultados.detalles
                    .filter(d => d.status === 'error' || d.status === 'sin_email')
                    .map((detalle, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg text-sm border-l-4 ${
                          detalle.status === 'error'
                            ? 'bg-red-50 border-red-400 text-red-800'
                            : 'bg-amber-50 border-amber-400 text-amber-800'
                        }`}
                      >
                        <p className="font-semibold">{detalle.numero || `Factura ${detalle.facturaId}`}</p>
                        <p className="text-xs mt-1 opacity-90">{detalle.error}</p>
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
                El proceso puede tardar varios minutos...
              </p>
              <button
                onClick={onCancel}
                className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancelar envío
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  navigate('/facturacion/envios/historial')
                  onClose()
                }}
                className="px-5 py-2.5 text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors font-medium"
              >
                Ver Historial
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors font-semibold shadow-lg shadow-primary-500/30"
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



