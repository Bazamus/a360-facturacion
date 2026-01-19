import React from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Barra de progreso flotante para exportaciones
 */
export function ProgressoExportacion({ progreso }) {
  if (!progreso || progreso.current === 0) return null

  const porcentaje = Math.round((progreso.current / progreso.total) * 100)

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 mb-1">
            Exportando facturas
          </p>
          <p className="text-xs text-gray-500 mb-2 truncate">
            {progreso.message || 'Procesando...'}
          </p>

          {/* Barra de progreso */}
          <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${porcentaje}%` }}
            />
          </div>

          {/* Porcentaje */}
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs font-medium text-gray-600">
              {porcentaje}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
