/**
 * Componente ExcelPreview para mostrar vista previa de los datos del Excel
 * Sistema de Facturación A360
 */

import React from 'react'
import { formatDate } from '../utils/dateParsers'
import { formatNumber } from '../utils/numberParsers'

export function ExcelPreview({ headers, rows, limit = 5, conceptColumns = {}, analisis = null, maxRows }) {
  if (!headers || headers.length === 0) return null

  // Soportar ambos formatos: conceptColumns directo o dentro de analisis
  const columnsToUse = analisis?.conceptColumns || conceptColumns
  const previewRows = rows.slice(0, maxRows || limit)
  const conceptIndices = new Set(Object.keys(columnsToUse).map(Number))

  const formatCell = (value, colIndex) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-300">—</span>
    }

    // Si es una columna de concepto, formatear como número
    if (conceptIndices.has(colIndex) && typeof value === 'number') {
      return formatNumber(value, 2)
    }

    // Si parece una fecha de Excel (número entre 40000 y 50000)
    if (typeof value === 'number' && value > 40000 && value < 50000) {
      // Es una fecha de Excel
      const date = new Date((value - 25569) * 86400 * 1000)
      return formatDate(date)
    }

    return String(value)
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 w-10">
              #
            </th>
            {headers.map((header, i) => (
              <th
                key={i}
                className={`px-3 py-2 text-left text-xs font-medium whitespace-nowrap ${
                  conceptIndices.has(i)
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600'
                }`}
              >
                {header || `Col ${i + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {previewRows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              <td className="px-2 py-2 text-gray-400 text-xs">
                {rowIndex + 1}
              </td>
              {headers.map((_, colIndex) => (
                <td
                  key={colIndex}
                  className={`px-3 py-2 whitespace-nowrap ${
                    conceptIndices.has(colIndex)
                      ? 'text-right font-mono text-blue-700'
                      : 'text-gray-700'
                  }`}
                >
                  {formatCell(row[colIndex], colIndex)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length > limit && (
        <div className="px-4 py-2 bg-gray-50 text-center text-sm text-gray-500">
          Mostrando {limit} de {rows.length} filas
        </div>
      )}
    </div>
  )
}

export default ExcelPreview
