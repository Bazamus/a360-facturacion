import { Modal } from '@/components/ui'
import { Loader2, CheckCircle2, FileText } from 'lucide-react'

export function ReporteProgress({ 
  isOpen, 
  onClose,
  progress = 0, 
  mensaje = 'Procesando...', 
  isCompleted = false,
  tipo = 'generar' // 'generar' | 'exportar'
}) {
  return (
    <Modal
      open={isOpen}
      onClose={isCompleted ? onClose : null}
      title={isCompleted ? 'Completado' : (tipo === 'generar' ? 'Generando Reporte' : 'Exportando Datos')}
      size="md"
    >
      <div className="space-y-6">
        {!isCompleted ? (
          <>
            {/* Icono de carga */}
            <div className="flex justify-center">
              <div className="relative">
                <Loader2 className="h-16 w-16 text-primary-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary-600">
                    {progress}%
                  </span>
                </div>
              </div>
            </div>

            {/* Mensaje */}
            <div className="text-center">
              <p className="font-medium text-gray-900">{mensaje}</p>
              <p className="text-sm text-gray-500 mt-1">
                Por favor, espera...
              </p>
            </div>

            {/* Barra de progreso */}
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span className="font-medium text-primary-600">{progress}%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Spinner adicional */}
            <div className="flex justify-center gap-2">
              <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </>
        ) : (
          <>
            {/* Icono de éxito */}
            <div className="flex justify-center">
              <div className="p-4 bg-green-100 rounded-full">
                <CheckCircle2 className="h-16 w-16 text-green-600" />
              </div>
            </div>

            {/* Mensaje de éxito */}
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {tipo === 'generar' ? 'Reporte Generado' : 'Exportación Completada'}
              </h3>
              <p className="text-gray-600">
                {tipo === 'generar' 
                  ? 'El reporte se ha generado correctamente' 
                  : 'Los datos se han exportado correctamente'}
              </p>
            </div>

            {/* Botón de cerrar */}
            <div className="flex justify-center">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
