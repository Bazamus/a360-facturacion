/**
 * Componente ImportPreview - Vista previa de datos a importar
 * Sistema de Facturación A360
 */

import React from 'react'
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { Card } from '@/components/ui'

export function ImportPreview({ datosExcel, validacion, maxRows = 10 }) {
  if (!datosExcel) return null

  const { headers, rows, entidad, totalRows } = datosExcel
  const previewRows = rows.slice(0, maxRows)

  const getEntidadLabel = (e) => {
    switch (e) {
      case 'comunidades': return 'Comunidades'
      case 'clientes': return 'Clientes'
      case 'contadores': return 'Contadores'
      default: return e
    }
  }

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm text-gray-500">Tipo de datos detectado</p>
            <p className="font-medium text-gray-900">{getEntidadLabel(entidad)}</p>
          </div>
          <div className="border-l pl-4">
            <p className="text-sm text-gray-500">Total de registros</p>
            <p className="font-medium text-gray-900">{totalRows}</p>
          </div>
        </div>

        {validacion && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">{validacion.validas}</span>
              <span className="text-sm">válidos</span>
            </div>
            {validacion.errores.length > 0 && (
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">{validacion.errores.length}</span>
                <span className="text-sm">con errores</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabla de preview */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-12">
                  #
                </th>
                {headers.map((header, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {previewRows.map((row, rowIndex) => {
                const rowNum = row._rowIndex || rowIndex + 2
                const hasError = validacion?.errores.some(e => e.fila === rowNum)
                
                return (
                  <tr 
                    key={rowIndex}
                    className={hasError ? 'bg-red-50' : 'hover:bg-gray-50'}
                  >
                    <td className="px-3 py-2 text-gray-400 text-xs">
                      {rowNum}
                      {hasError && (
                        <XCircle className="w-3 h-3 text-red-500 inline ml-1" />
                      )}
                    </td>
                    {headers.map((_, colIndex) => {
                      // Obtener el valor usando el índice de la cabecera
                      const fieldName = Object.keys(row).find((_, idx) => idx === colIndex + 1)
                      const value = Object.values(row)[colIndex + 1] // +1 por _rowIndex
                      
                      return (
                        <td
                          key={colIndex}
                          className="px-3 py-2 whitespace-nowrap text-gray-700 max-w-[200px] truncate"
                          title={value?.toString() || ''}
                        >
                          {value ?? <span className="text-gray-300">—</span>}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {totalRows > maxRows && (
          <div className="px-4 py-2 bg-gray-50 text-center text-sm text-gray-500 border-t">
            Mostrando {maxRows} de {totalRows} registros
          </div>
        )}
      </div>
    </div>
  )
}

export default ImportPreview
