/**
 * Componente ImportProgress - Barra de progreso de importación
 * Sistema de Facturación A360
 */

import React from 'react'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export function ImportProgress({ progreso, estado, resultado }) {
  const { porcentaje, actual, total } = progreso
  const porcentajeVisual = Math.round(porcentaje * 100)

  if (estado === 'completado' && resultado) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
          <div>
            <h3 className="text-lg font-medium text-green-800">
              Importación completada
            </h3>
            <p className="text-sm text-green-600">
              Se procesaron {resultado.total} registros
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="p-3 bg-white rounded-lg border border-green-200">
            <p className="text-2xl font-bold text-green-600">{resultado.created}</p>
            <p className="text-sm text-gray-500">Creados</p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-green-200">
            <p className="text-2xl font-bold text-blue-600">{resultado.updated}</p>
            <p className="text-sm text-gray-500">Actualizados</p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-green-200">
            <p className="text-2xl font-bold text-red-600">{resultado.errors?.length || 0}</p>
            <p className="text-sm text-gray-500">Errores</p>
          </div>
        </div>

        {resultado.ubicacionesAsignadas > 0 && (
          <p className="mt-3 text-sm text-green-600">
            Además, se asignaron {resultado.ubicacionesAsignadas} ubicaciones a clientes.
          </p>
        )}
      </div>
    )
  }

  if (estado === 'error') {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-3">
          <XCircle className="w-8 h-8 text-red-500" />
          <div>
            <h3 className="text-lg font-medium text-red-800">
              Error durante la importación
            </h3>
            <p className="text-sm text-red-600">
              Por favor, revisa los errores e intenta de nuevo.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-3 mb-4">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        <div>
          <h3 className="text-lg font-medium text-blue-800">
            Importando datos...
          </h3>
          <p className="text-sm text-blue-600">
            Procesando registro {actual} de {total}
          </p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="relative">
        <div className="w-full bg-blue-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${porcentajeVisual}%` }}
          />
        </div>
        <p className="text-right text-sm text-blue-600 mt-1">
          {porcentajeVisual}%
        </p>
      </div>
    </div>
  )
}

export default ImportProgress

