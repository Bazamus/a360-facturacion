import { 
  FileText, 
  CheckCircle, 
  Send, 
  AlertTriangle, 
  XCircle,
  Clock,
  Loader
} from 'lucide-react'

const ESTADOS = {
  borrador: {
    label: 'Borrador',
    color: 'bg-gray-100 text-gray-700',
    icon: FileText
  },
  generada: {
    label: 'Generada',
    color: 'bg-blue-100 text-blue-700',
    icon: CheckCircle
  },
  enviada: {
    label: 'Enviada',
    color: 'bg-indigo-100 text-indigo-700',
    icon: Send
  },
  procesada: {
    label: 'Procesada',
    color: 'bg-purple-100 text-purple-700',
    icon: Loader
  },
  parcial: {
    label: 'Parcial',
    color: 'bg-amber-100 text-amber-700',
    icon: AlertTriangle
  },
  completada: {
    label: 'Completada',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle
  },
  rechazada: {
    label: 'Rechazada',
    color: 'bg-red-100 text-red-700',
    icon: XCircle
  }
}

export function EstadoRemesaBadge({ estado }) {
  const config = ESTADOS[estado] || ESTADOS.borrador
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}

