/**
 * Componente ImportErrors - Lista de errores de importación
 * Sistema de Facturación A360
 */

import React, { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, XCircle } from 'lucide-react'
import { Button } from '@/components/ui'

export function ImportErrors({ errores = [], maxVisible = 10 }) {
  const [expandido, setExpandido] = useState(false)

  if (!errores || errores.length === 0) return null

  const erroresVisibles = expandido ? errores : errores.slice(0, maxVisible)
  const hayMas = errores.length > maxVisible

  return (
    <div className="border border-red-200 rounded-lg overflow-hidden">
      {/* Cabecera */}
      <div className="bg-red-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="font-medium text-red-800">
            {errores.length} {errores.length === 1 ? 'error encontrado' : 'errores encontrados'}
          </span>
        </div>
        {hayMas && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandido(!expandido)}
            className="text-red-600 hover:text-red-800"
          >
            {expandido ? (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Mostrar menos
              </>
            ) : (
              <>
                <ChevronRight className="w-4 h-4 mr-1" />
                Ver todos ({errores.length})
              </>
            )}
          </Button>
        )}
      </div>

      {/* Lista de errores */}
      <div className="divide-y divide-red-100">
        {erroresVisibles.map((error, index) => (
          <div key={index} className="px-4 py-3 bg-white">
            <div className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Fila {error.fila}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {error.errores.map((msg, i) => (
                    <li key={i} className="text-sm text-red-600">
                      • {msg}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pie si hay más */}
      {hayMas && !expandido && (
        <div className="bg-red-50 px-4 py-2 text-center">
          <p className="text-sm text-red-600">
            ... y {errores.length - maxVisible} errores más
          </p>
        </div>
      )}
    </div>
  )
}

export default ImportErrors
