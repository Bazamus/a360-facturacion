import { Clock, User, CheckCircle, AlertTriangle, Truck, Play, XCircle, FileText } from 'lucide-react'
import { useHistorialIntervencion } from '@/hooks'
import { LoadingSpinner } from '@/components/ui'

const ESTADO_CONFIG = {
  pendiente: { icon: Clock, color: 'text-yellow-500 bg-yellow-50', label: 'Creada (pendiente)' },
  asignada: { icon: User, color: 'text-blue-500 bg-blue-50', label: 'Asignada a técnico' },
  programada: { icon: Clock, color: 'text-indigo-500 bg-indigo-50', label: 'Programada' },
  en_camino: { icon: Truck, color: 'text-orange-500 bg-orange-50', label: 'Técnico en camino' },
  en_curso: { icon: Play, color: 'text-primary-500 bg-primary-50', label: 'En curso' },
  completada: { icon: CheckCircle, color: 'text-green-500 bg-green-50', label: 'Completada' },
  facturada: { icon: FileText, color: 'text-emerald-500 bg-emerald-50', label: 'Facturada' },
  cancelada: { icon: XCircle, color: 'text-red-500 bg-red-50', label: 'Cancelada' },
}

function formatFecha(dateStr) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function IntervencionTimeline({ intervencion }) {
  const { data: historial, isLoading } = useHistorialIntervencion(intervencion?.id)

  if (!intervencion) return null

  // Si hay historial real, usarlo; si no, fallback a reconstruccion
  const events = historial?.length
    ? historial.map((h) => ({
        estado: h.estado_nuevo,
        estado_anterior: h.estado_anterior,
        fecha: h.created_at,
        usuario: h.usuario_nombre,
        notas: h.notas,
      }))
    : buildFallbackEvents(intervencion)

  if (isLoading) {
    return <div className="py-4 flex justify-center"><LoadingSpinner size="sm" /></div>
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {events.map((event, idx) => {
          const config = ESTADO_CONFIG[event.estado] || ESTADO_CONFIG.pendiente
          const Icon = config.icon
          const isLast = idx === events.length - 1

          return (
            <li key={idx}>
              <div className="relative pb-8">
                {!isLast && (
                  <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" />
                )}
                <div className="relative flex items-start space-x-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{config.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {event.fecha && (
                        <span className="text-xs text-gray-500">{formatFecha(event.fecha)}</span>
                      )}
                      {event.usuario && (
                        <span className="text-xs text-gray-400">— {event.usuario}</span>
                      )}
                    </div>
                    {event.notas && (
                      <p className="text-xs text-gray-500 mt-1 italic">{event.notas}</p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Fallback para intervenciones creadas antes del historial
function buildFallbackEvents(intervencion) {
  const events = []

  events.push({ estado: 'pendiente', fecha: intervencion.created_at })

  if (intervencion.tecnico_id && intervencion.estado !== 'pendiente') {
    events.push({ estado: 'asignada', fecha: intervencion.updated_at })
  }

  if (intervencion.fecha_programada) {
    events.push({ estado: 'programada', fecha: intervencion.fecha_programada })
  }

  if (intervencion.fecha_inicio) {
    events.push({ estado: 'en_curso', fecha: intervencion.fecha_inicio })
  }

  if (intervencion.fecha_fin) {
    events.push({ estado: 'completada', fecha: intervencion.fecha_fin })
  }

  if (intervencion.estado === 'cancelada') {
    events.push({ estado: 'cancelada', fecha: intervencion.updated_at })
  }

  return events
}
