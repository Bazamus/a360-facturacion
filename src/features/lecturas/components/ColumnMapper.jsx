/**
 * Componente ColumnMapper para mostrar el mapeo de columnas detectado
 * Sistema de Facturación A360
 */

import React from 'react'
import { Check, X, AlertTriangle, HelpCircle } from 'lucide-react'

export function ColumnMapper({ analisis, headers }) {
  if (!analisis) return null

  const { fixedColumns, conceptColumns, unknownColumns, errors, warnings, summary } = analisis

  return (
    <div className="space-y-6">
      {/* Errores */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
            <X className="w-5 h-5" />
            <span>Errores de estructura</span>
          </div>
          <ul className="list-disc list-inside text-red-600 text-sm space-y-1">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Advertencias</span>
          </div>
          <ul className="list-disc list-inside text-amber-600 text-sm space-y-1">
            {warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Columnas Fijas Detectadas */}
      <div>
        <h4 className="font-medium text-gray-700 mb-3">Columnas Fijas Detectadas</h4>
        <div className="bg-white border rounded-lg divide-y">
          {Object.entries(fixedColumns).map(([field, index]) => (
            <div key={field} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                {index >= 0 ? (
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                ) : (
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <HelpCircle className="w-4 h-4 text-gray-400" />
                  </div>
                )}
                <span className="font-medium capitalize">
                  {field.replace('_', ' ')}
                </span>
              </div>
              <div className="text-right">
                {index >= 0 ? (
                  <span className="text-sm text-gray-600">
                    Columna {String.fromCharCode(65 + index)}: <strong>{headers[index]}</strong>
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">No detectada</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Columnas de Conceptos Detectadas */}
      <div>
        <h4 className="font-medium text-gray-700 mb-3">
          Columnas de Conceptos ({Object.keys(conceptColumns).length})
        </h4>
        {Object.keys(conceptColumns).length > 0 ? (
          <div className="bg-white border rounded-lg divide-y">
            {Object.entries(conceptColumns).map(([colIndex, concepto]) => (
              <div key={colIndex} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <span className="font-medium">{concepto.concepto_codigo}</span>
                    <span className="text-gray-500 text-sm ml-2">
                      ({concepto.concepto_nombre})
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  Columna {String.fromCharCode(65 + parseInt(colIndex))} • {concepto.unidad_medida}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-dashed rounded-lg p-4 text-center text-gray-500">
            No se detectaron columnas de conceptos
          </div>
        )}
      </div>

      {/* Columnas No Reconocidas */}
      {unknownColumns.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-500 mb-3">
            Columnas no reconocidas (se ignorarán)
          </h4>
          <div className="flex flex-wrap gap-2">
            {unknownColumns.map(({ header, index }) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-100 text-gray-500 text-sm rounded-full"
              >
                {header}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Resumen */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-700 mb-2">Resumen</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-800">{summary.totalColumns}</p>
            <p className="text-xs text-gray-500">Columnas totales</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{summary.fixedColumnsFound}</p>
            <p className="text-xs text-gray-500">Columnas fijas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{summary.conceptColumnsFound}</p>
            <p className="text-xs text-gray-500">Conceptos</p>
          </div>
        </div>
        {summary.conceptCodes.length > 0 && (
          <p className="text-sm text-gray-600 mt-3 text-center">
            Conceptos detectados: <strong>{summary.conceptCodes.join(', ')}</strong>
          </p>
        )}
      </div>
    </div>
  )
}

export default ColumnMapper



