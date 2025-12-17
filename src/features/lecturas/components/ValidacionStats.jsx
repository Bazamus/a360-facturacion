import React from 'react'
import { Check, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Componente para mostrar estadísticas de validación
 */
export function ValidacionStats({ stats }) {
  const items = [
    {
      label: 'Válidas',
      value: stats.validas,
      icon: Check,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      iconColor: 'text-green-500'
    },
    {
      label: 'Con alertas',
      value: stats.conAlertas,
      icon: AlertTriangle,
      color: 'amber',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      iconColor: 'text-amber-500'
    },
    {
      label: 'Errores',
      value: stats.errores,
      icon: XCircle,
      color: 'red',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      iconColor: 'text-red-500'
    }
  ]

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <div 
          key={item.label}
          className={cn(
            'rounded-xl p-4 flex items-center gap-3',
            item.bgColor
          )}
        >
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            `bg-${item.color}-100`
          )}>
            <item.icon className={cn('w-5 h-5', item.iconColor)} />
          </div>
          <div>
            <p className={cn('text-2xl font-bold', item.textColor)}>
              {item.value}
            </p>
            <p className={cn('text-sm', item.textColor)}>
              {item.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

