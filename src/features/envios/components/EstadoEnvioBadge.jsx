import { Mail, Check, Eye, AlertTriangle, X, Clock, Loader2 } from 'lucide-react'

const estadoConfig = {
  pendiente: {
    label: 'Pendiente',
    icon: Clock,
    className: 'bg-gray-100 text-gray-700'
  },
  enviando: {
    label: 'Enviando',
    icon: Loader2,
    className: 'bg-blue-100 text-blue-700',
    animate: true
  },
  enviado: {
    label: 'Enviado',
    icon: Mail,
    className: 'bg-blue-100 text-blue-700'
  },
  entregado: {
    label: 'Entregado',
    icon: Check,
    className: 'bg-green-100 text-green-700'
  },
  abierto: {
    label: 'Abierto',
    icon: Eye,
    className: 'bg-emerald-100 text-emerald-700'
  },
  rebotado: {
    label: 'Rebotado',
    icon: AlertTriangle,
    className: 'bg-amber-100 text-amber-700'
  },
  fallido: {
    label: 'Fallido',
    icon: X,
    className: 'bg-red-100 text-red-700'
  },
  cancelado: {
    label: 'Cancelado',
    icon: X,
    className: 'bg-gray-100 text-gray-500'
  }
}

export function EstadoEnvioBadge({ estado, showLabel = true, size = 'sm' }) {
  const config = estadoConfig[estado] || estadoConfig.pendiente
  const Icon = config.icon

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1.5 text-sm'
  }

  const iconSizes = {
    xs: 12,
    sm: 14,
    md: 16
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${sizeClasses[size]}
        ${config.className}
      `}
    >
      <Icon 
        size={iconSizes[size]} 
        className={config.animate ? 'animate-spin' : ''} 
      />
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}

// Componente para mostrar el estado del email en una factura
export function EstadoEmailFactura({ emailEnviado, fechaEnvio }) {
  if (!emailEnviado) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
        <Mail size={12} />
        Sin enviar
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
      <Check size={12} />
      Enviado
      {fechaEnvio && (
        <span className="text-green-600 ml-1">
          {new Date(fechaEnvio).toLocaleDateString('es-ES')}
        </span>
      )}
    </span>
  )
}



