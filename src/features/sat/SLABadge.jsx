import { useSLAIntervencion } from '@/hooks/useSLA'
import { AlertTriangle, CheckCircle, Clock, ShieldOff } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_CONFIG = {
  ok: {
    label: 'SLA OK',
    icon: CheckCircle,
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  en_riesgo: {
    label: 'En riesgo',
    icon: AlertTriangle,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  incumplido: {
    label: 'Incumplido',
    icon: AlertTriangle,
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  cumplido: {
    label: 'SLA cumplido',
    icon: CheckCircle,
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  sin_sla: {
    label: 'Sin SLA',
    icon: ShieldOff,
    className: 'bg-gray-50 text-gray-500 border-gray-200',
  },
}

/**
 * Badge compacto para mostrar estado SLA de una intervención.
 * Si `intervencionId` no se pasa, acepta `estado` directamente.
 */
export function SLABadge({ intervencionId, estado: estadoProp, className = '' }) {
  const { data: sla } = useSLAIntervencion(intervencionId || null)
  const estado = sla?.sla_resolucion_estado ?? estadoProp ?? 'sin_sla'
  const config = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.sin_sla
  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded border ${config.className} ${className}`}
    >
      <Icon className="h-3 w-3 flex-shrink-0" />
      {config.label}
    </span>
  )
}

/**
 * Panel SLA expandido para usar en IntervencionDetalle.
 */
export function SLAPanel({ intervencionId }) {
  const { data: sla, isLoading } = useSLAIntervencion(intervencionId)

  if (isLoading) return null
  if (!sla || sla.sla_resolucion_estado === 'sin_sla') return null

  const respConfig = ESTADO_CONFIG[sla.sla_respuesta_estado] ?? ESTADO_CONFIG.sin_sla
  const resolConfig = ESTADO_CONFIG[sla.sla_resolucion_estado] ?? ESTADO_CONFIG.sin_sla
  const RespIcon = respConfig.icon
  const ResolIcon = resolConfig.icon

  const pct = sla.sla_porcentaje ?? 0
  const barColor =
    pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-green-500'

  function formatLimite(dateStr) {
    if (!dateStr) return '—'
    return format(new Date(dateStr), "dd MMM yyyy 'a las' HH:mm", { locale: es })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">SLA — {sla.sla_nombre}</h4>
        {sla.sla_porcentaje !== null && (
          <span className={`text-xs font-bold ${pct >= 100 ? 'text-red-600' : pct >= 80 ? 'text-amber-600' : 'text-green-600'}`}>
            {pct}% del límite
          </span>
        )}
      </div>

      {/* Barra de progreso */}
      {sla.sla_porcentaje !== null && sla.sla_resolucion_estado !== 'cumplido' && (
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* Respuesta */}
        <div className="space-y-0.5">
          <p className="text-xs text-gray-500">Primera respuesta</p>
          <div className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded border ${respConfig.className}`}>
            <RespIcon className="h-3 w-3" />
            {respConfig.label}
          </div>
          {sla.sla_limite_respuesta && sla.sla_respuesta_estado !== 'cumplido' && (
            <p className="text-[11px] text-gray-400">Límite: {formatLimite(sla.sla_limite_respuesta)}</p>
          )}
          <p className="text-[11px] text-gray-400">{sla.tiempo_respuesta_horas}h permitidas</p>
        </div>

        {/* Resolución */}
        <div className="space-y-0.5">
          <p className="text-xs text-gray-500">Resolución</p>
          <div className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded border ${resolConfig.className}`}>
            <ResolIcon className="h-3 w-3" />
            {resolConfig.label}
          </div>
          {sla.sla_limite_resolucion && sla.sla_resolucion_estado !== 'cumplido' && (
            <p className="text-[11px] text-gray-400">Límite: {formatLimite(sla.sla_limite_resolucion)}</p>
          )}
          <p className="text-[11px] text-gray-400">{sla.tiempo_resolucion_horas}h permitidas</p>
        </div>
      </div>

      {sla.horas_transcurridas != null && (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {Number(sla.horas_transcurridas).toFixed(1)}h transcurridas
        </p>
      )}
    </div>
  )
}
