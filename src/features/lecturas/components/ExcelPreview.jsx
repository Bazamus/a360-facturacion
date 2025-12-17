import React from 'react'

/**
 * Componente para previsualizar datos del Excel
 */
export function ExcelPreview({ 
  headers, 
  rows, 
  mapping,
  maxRows = 5 
}) {
  const displayRows = rows.slice(0, maxRows)
  
  // Obtener índices de columnas mapeadas para resaltarlas
  const mappedIndices = new Set(Object.values(mapping))
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Vista Previa</h3>
        <span className="text-sm text-gray-500">
          Mostrando {displayRows.length} de {rows.length} filas
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
                #
              </th>
              {headers.map((header, index) => (
                <th 
                  key={index}
                  className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                    mappedIndices.has(index) 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'bg-gray-50 text-gray-500'
                  }`}
                >
                  {header || `Col ${index + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-400 bg-gray-50">
                  {rowIndex + 1}
                </td>
                {headers.map((_, cellIndex) => (
                  <td 
                    key={cellIndex}
                    className={`px-3 py-2 whitespace-nowrap text-sm ${
                      mappedIndices.has(cellIndex)
                        ? 'text-gray-900 font-medium'
                        : 'text-gray-500'
                    }`}
                  >
                    {row[cellIndex] !== undefined && row[cellIndex] !== '' 
                      ? String(row[cellIndex]) 
                      : <span className="text-gray-300">-</span>
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {rows.length > maxRows && (
        <p className="text-center text-sm text-gray-500">
          ... y {rows.length - maxRows} filas más
        </p>
      )}
    </div>
  )
}



