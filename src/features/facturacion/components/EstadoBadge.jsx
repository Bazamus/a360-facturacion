import React from 'react'
import { FileText, Send, CheckCircle, XCircle } from 'lucide-react'

const estadoConfig = {
  borrador: {
    label: 'Borrador',
    icon: FileText,
    className: 'bg-gray-100 text-gray-700 border-gray-200'
  },
  emitida: {
    label: 'Emitida',
    icon: Send,
    className: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  pagada: {
    label: 'Pagada',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-700 border-green-200'
  },
  anulada: {
    label: 'Anulada',
    icon: XCircle,
    className: 'bg-red-100 text-red-700 border-red-200'
  }
}

export function EstadoBadge({ estado, size = 'md' }) {
  const config = estadoConfig[estado] || estadoConfig.borrador
  const Icon = config.icon

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  return (
    <span 
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full border
        ${config.className}
        ${sizeClasses[size]}
      `}
    >
      <Icon className={iconSizes[size]} />
      {config.label}
    </span>
  )
}



