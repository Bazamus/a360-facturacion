import React from 'react'
import { Check, X, AlertCircle } from 'lucide-react'
import { Select } from '@/components/ui'
import { cn } from '@/lib/utils'

const COLUMN_TYPES = [
  { value: 'numero_contador', label: 'Nº Contador', required: true },
  { value: 'concepto', label: 'Concepto', required: true },
  { value: 'lectura', label: 'Lectura', required: true },
  { value: 'fecha_lectura', label: 'Fecha Lectura', required: true },
  { value: 'portal', label: 'Portal (opcional)', required: false },
  { value: 'vivienda', label: 'Vivienda (opcional)', required: false },
  { value: 'ignorar', label: 'Ignorar columna', required: false },
]

/**
 * Componente para mapear columnas del Excel
 */
export function ColumnMapper({ 
  headers, 
  mapping, 
  onMappingChange,
  validation 
}) {
  const handleChange = (columnIndex, type) => {
    const newMapping = { ...mapping }
    
    // Quitar la columna del tipo anterior si existe
    Object.keys(newMapping).forEach(key => {
      if (newMapping[key] === columnIndex) {
        delete newMapping[key]
      }
    })
    
    // Asignar nuevo tipo (excepto 'ignorar')
    if (type !== 'ignorar') {
      newMapping[type] = columnIndex
    }
    
    onMappingChange(newMapping)
  }

  const getSelectedType = (columnIndex) => {
    for (const [key, value] of Object.entries(mapping)) {
      if (value === columnIndex) return key
    }
    return 'ignorar'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Mapeo de Columnas</h3>
        {validation.isValid ? (
          <span className="flex items-center gap-1 text-green-600 text-sm">
            <Check className="w-4 h-4" />
            Mapeo completo
          </span>
        ) : (
          <span className="flex items-center gap-1 text-amber-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            Faltan columnas: {validation.missing.join(', ')}
          </span>
        )}
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        {headers.map((header, index) => {
          const selectedType = getSelectedType(index)
          const columnType = COLUMN_TYPES.find(c => c.value === selectedType)
          const isRequired = columnType?.required
          const isMapped = selectedType !== 'ignorar'
          
          return (
            <div 
              key={index}
              className={cn(
                'flex items-center gap-4 p-3 bg-white rounded-lg border transition-colors',
                isMapped ? 'border-green-200' : 'border-gray-200'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="font-medium text-gray-700 truncate">
                    {header || `Columna ${index + 1}`}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-gray-400">→</span>
                
                <select
                  value={selectedType}
                  onChange={(e) => handleChange(index, e.target.value)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm min-w-[180px]',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500',
                    isMapped ? 'border-green-300 bg-green-50' : 'border-gray-300'
                  )}
                >
                  {COLUMN_TYPES.map(type => {
                    // Deshabilitar si ya está mapeado a otra columna
                    const isUsed = type.value !== 'ignorar' && 
                      Object.values(mapping).includes(mapping[type.value]) && 
                      mapping[type.value] !== index
                    
                    return (
                      <option 
                        key={type.value} 
                        value={type.value}
                        disabled={isUsed && type.value !== selectedType}
                      >
                        {type.label}
                        {type.required ? ' *' : ''}
                      </option>
                    )
                  })}
                </select>
                
                {isMapped ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <X className="w-5 h-5 text-gray-300" />
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      <p className="text-xs text-gray-500">
        * Columnas obligatorias. Las columnas no mapeadas serán ignoradas.
      </p>
    </div>
  )
}

