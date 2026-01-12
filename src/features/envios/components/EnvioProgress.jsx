import { Modal } from '../../../components/ui'
import { Check, X, AlertTriangle, Loader2 } from 'lucide-react'

export function EnvioProgress({
  isOpen,
  onClose,
  progress,
  resultados,
  isCompleted,
  modoTest = false,
  onCancel
}) {
  const porcentaje = progress?.porcentaje || 0
  const actual = progress?.actual || 0
  const total = progress?.total || 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={isCompleted ? onClose : undefined}
      title={isCompleted ? 'Envío completado' : (modoTest ? '🧪 Enviando facturas (MODO TEST)' : 'Enviando facturas...')}
      size="md"
    >
      <div className="space-y-6">
        {/* Advertencia modo test */}
        {modoTest && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            ⚠️ Los emails se están enviando a direcciones de prueba de Resend, no a clientes reales
          </div>
        )}
        {/* Barra de progreso */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progreso</span>
            <span>{porcentaje}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isCompleted ? 'bg-green-500' : 'bg-primary-500'
              }`}
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {isCompleted ? 'Completado' : `Enviando: ${actual} de ${total}`}
          </p>
        </div>

        {/* Último envío */}
        {progress?.ultimoResultado && !isCompleted && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Último enviado:</p>
            <p className="font-medium">
              Factura {progress.ultimoResultado.numero}
              {progress.ultimoResultado.status === 'enviado' && (
                <Check className="inline ml-2 text-green-500" size={16} />
              )}
              {progress.ultimoResultado.status === 'error' && (
                <X className="inline ml-2 text-red-500" size={16} />
              )}
              {progress.ultimoResultado.status === 'sin_email' && (
                <AlertTriangle className="inline ml-2 text-amber-500" size={16} />
              )}
            </p>
          </div>
        )}

        {/* Resumen de resultados */}
        {isCompleted && resultados && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <Check className="mx-auto mb-2 text-green-500" size={24} />
                <p className="text-2xl font-bold text-green-700">{resultados.exitosos}</p>
                <p className="text-sm text-green-600">Enviados</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <X className="mx-auto mb-2 text-red-500" size={24} />
                <p className="text-2xl font-bold text-red-700">{resultados.fallidos}</p>
                <p className="text-sm text-red-600">Fallidos</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg text-center">
                <AlertTriangle className="mx-auto mb-2 text-amber-500" size={24} />
                <p className="text-2xl font-bold text-amber-700">{resultados.sinEmail}</p>
                <p className="text-sm text-amber-600">Sin email</p>
              </div>
            </div>

            {/* Detalles de errores */}
            {resultados.detalles?.some(d => d.status === 'error' || d.status === 'sin_email') && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Detalles:</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {resultados.detalles
                    .filter(d => d.status === 'error' || d.status === 'sin_email')
                    .map((detalle, idx) => (
                      <div 
                        key={idx}
                        className={`p-2 rounded text-sm ${
                          detalle.status === 'error' 
                            ? 'bg-red-50 text-red-700' 
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        <span className="font-medium">{detalle.numero || detalle.facturaId}:</span>{' '}
                        {detalle.error}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          {!isCompleted ? (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancelar envío
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}



