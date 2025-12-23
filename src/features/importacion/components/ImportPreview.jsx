/**
 * Componente ImportPreview - Vista previa de datos a importar
 * Sistema de Facturación A360
 * Rediseñado con mejor scroll y más filas visibles
 */

import React, { useState, useMemo } from 'react'
import { CheckCircle, AlertTriangle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, Badge } from '@/components/ui'

const ROWS_PER_PAGE = 15

export function ImportPreview({ datosExcel, validacion, maxRows = ROWS_PER_PAGE }) {
  const [currentPage, setCurrentPage] = useState(0)

  if (!datosExcel) return null

  const { headers, rows, entidad, totalRows } = datosExcel
  
  // Calcular paginación
  const totalPages = Math.ceil(rows.length / maxRows)
  const startIndex = currentPage * maxRows
  const endIndex = Math.min(startIndex + maxRows, rows.length)
  const previewRows = rows.slice(startIndex, endIndex)

  const getEntidadLabel = (e) => {
    switch (e) {
      case 'comunidades': return 'Comunidades'
      case 'clientes': return 'Clientes'
      case 'contadores': return 'Contadores'
      default: return e
    }
  }

  const goToPage = (page) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page)
    }
  }

  return (
    <div className="space-y-0">
      {/* Tabla de preview con scroll horizontal */}
      <div className="overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-16 min-w-[64px] border-b border-gray-200 sticky left-0 bg-gray-100 z-10">
                  Fila
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-16 min-w-[64px] border-b border-gray-200">
                  Estado
                </th>
                {headers.map((header, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap min-w-[120px] border-b border-gray-200"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {previewRows.map((row, rowIndex) => {
                const rowNum = row._rowIndex || (startIndex + rowIndex + 2)
                const rowError = validacion?.errores.find(e => e.fila === rowNum)
                const hasError = !!rowError
                
                return (
                  <tr 
                    key={rowIndex}
                    className={`
                      ${hasError ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}
                      transition-colors
                    `}
                  >
                    {/* Número de fila - sticky */}
                    <td className={`px-4 py-2.5 text-xs font-medium sticky left-0 z-10 ${hasError ? 'bg-red-50 text-red-700' : 'bg-white text-gray-500'}`}>
                      {rowNum}
                    </td>
                    
                    {/* Estado */}
                    <td className="px-4 py-2.5 text-center">
                      {hasError ? (
                        <div className="flex justify-center" title={rowError.errores?.join(', ')}>
                          <XCircle className="w-4 h-4 text-red-500" />
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </div>
                      )}
                    </td>
                    
                    {/* Datos */}
                    {headers.map((header, colIndex) => {
                      // Buscar el valor por el nombre del campo en minúsculas
                      const headerLower = header.toLowerCase()
                      let value = null
                      
                      // Buscar en las claves del objeto
                      for (const [key, val] of Object.entries(row)) {
                        if (key === '_rowIndex') continue
                        if (key.toLowerCase() === headerLower) {
                          value = val
                          break
                        }
                      }
                      
                      // Si no lo encontró, intentar por índice
                      if (value === null || value === undefined) {
                        const keys = Object.keys(row).filter(k => k !== '_rowIndex')
                        if (keys[colIndex]) {
                          value = row[keys[colIndex]]
                        }
                      }
                      
                      const displayValue = value !== null && value !== undefined ? String(value) : ''
                      const isTruncated = displayValue.length > 30
                      
                      return (
                        <td
                          key={colIndex}
                          className="px-4 py-2.5 whitespace-nowrap text-gray-700 min-w-[120px]"
                          title={isTruncated ? displayValue : undefined}
                        >
                          {displayValue ? (
                            <span className={isTruncated ? 'block max-w-[250px] truncate' : ''}>
                              {displayValue}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer con paginación y resumen */}
        <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">
              Mostrando <span className="font-medium text-gray-700">{startIndex + 1}</span> - <span className="font-medium text-gray-700">{endIndex}</span> de <span className="font-medium text-gray-700">{totalRows}</span> registros
            </span>
            
            {validacion && (
              <div className="flex items-center gap-3 border-l pl-4">
                <Badge variant="success" className="gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {validacion.validas} válidos
                </Badge>
                {validacion.errores.length > 0 && (
                  <Badge variant="danger" className="gap-1">
                    <XCircle className="w-3 h-3" />
                    {validacion.errores.length} errores
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Controles de paginación */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 0}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i
                  } else if (currentPage < 3) {
                    pageNum = i
                  } else if (currentPage > totalPages - 4) {
                    pageNum = totalPages - 5 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => goToPage(pageNum)}
                      className="h-8 w-8 p-0 text-xs"
                    >
                      {pageNum + 1}
                    </Button>
                  )
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages - 1}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImportPreview
