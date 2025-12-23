/**
 * Componente ValidacionStats para mostrar resumen de estadísticas de validación
 * Sistema de Facturación A360
 */

import React from 'react'
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

export function ValidacionStats({ stats, onFilterChange, activeFilter = 'todos' }) {
  if (!stats) return null

  const items = [
    {
      id: 'todos',
      label: 'Total',
      value: stats.total,
      icon: null,
      color: 'gray',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-300'
    },
    {
      id: 'valido',
      label: 'Válidas',
      value: stats.validas,
      icon: CheckCircle,
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-300'
    },
    {
      id: 'alerta',
      label: 'Con alertas',
      value: stats.conAlertas,
      icon: AlertTriangle,
      color: 'amber',
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-800',
      borderColor: 'border-amber-300'
    },
    {
      id: 'error',
      label: 'Errores',
      value: stats.errores,
      icon: XCircle,
      color: 'red',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-300'
    }
  ]

  return (
    <div className="flex gap-3">
      {items.map((item) => {
        const Icon = item.icon
        const isActive = activeFilter === item.id
        
        return (
          <button
            key={item.id}
            onClick={() => onFilterChange?.(item.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all
              ${isActive 
                ? `${item.bgColor} ${item.borderColor} ${item.textColor}` 
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }
            `}
          >
            {Icon && <Icon className={`w-4 h-4 ${isActive ? '' : 'text-gray-400'}`} />}
            <span className="font-bold">{item.value}</span>
            <span className="text-sm">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default ValidacionStats



