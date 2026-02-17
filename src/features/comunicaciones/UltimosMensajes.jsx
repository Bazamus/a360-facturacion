import { Card, CardContent, Badge, EmptyState } from '@/components/ui'
import {
  MessageSquare,
  Mail,
  Phone,
  MessageCircle,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Clock,
} from 'lucide-react'

const CANAL_ICONS = {
  whatsapp: MessageSquare,
  email: Mail,
  telefono: Phone,
  chat: MessageCircle,
  sms: MessageSquare,
}

const CANAL_COLORS = {
  whatsapp: 'bg-green-100 text-green-700',
  email: 'bg-blue-100 text-blue-700',
  telefono: 'bg-orange-100 text-orange-700',
  chat: 'bg-purple-100 text-purple-700',
  sms: 'bg-gray-100 text-gray-700',
}

const ESTADO_VARIANTS = {
  recibido: 'warning',
  leido: 'info',
  respondido: 'success',
  archivado: 'default',
  enviado: 'primary',
  entregado: 'success',
  fallido: 'danger',
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `Hace ${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `Hace ${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `Hace ${diffDays}d`
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

function truncate(text, maxLen = 120) {
  if (!text) return ''
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

export function UltimosMensajes({ mensajes = [], loading = false, title = 'Mensajes pendientes de respuesta' }) {
  const CanalIcon = (canal) => CANAL_ICONS[canal] || MessageSquare

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-48" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-10 w-10 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            {title}
          </h3>
          {mensajes.length > 0 && (
            <Badge variant="warning">{mensajes.length}</Badge>
          )}
        </div>

        {mensajes.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Sin mensajes pendientes"
            description="No hay comunicaciones pendientes de respuesta."
          />
        ) : (
          <div className="space-y-2">
            {mensajes.map((msg) => {
              const Icon = CanalIcon(msg.canal)
              return (
                <div
                  key={msg.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  {/* Canal icon */}
                  <div className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg ${CANAL_COLORS[msg.canal] || 'bg-gray-100 text-gray-700'}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {msg.cliente_nombre || msg.remitente_nombre || msg.remitente_telefono || 'Desconocido'}
                      </span>
                      <Badge variant={ESTADO_VARIANTS[msg.estado] || 'default'} className="text-[10px]">
                        {msg.estado}
                      </Badge>
                      {msg.direccion === 'entrante' ? (
                        <ArrowDownLeft className="h-3 w-3 text-blue-500 flex-shrink-0" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {truncate(msg.contenido)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {msg.remitente_telefono && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {msg.remitente_telefono}
                        </span>
                      )}
                      {msg.cliente_nombre && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Cliente vinculado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex-shrink-0 text-[11px] text-gray-400 whitespace-nowrap">
                    {formatTimeAgo(msg.created_at)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
