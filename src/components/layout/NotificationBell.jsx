import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X, Check, CheckCheck, AlertTriangle, Wrench, Ticket, Calendar } from 'lucide-react'
import {
  useNotificaciones,
  useNotificacionesCount,
  useMarcarLeida,
  useMarcarTodasLeidas,
} from '@/hooks/useNotificaciones'

function formatRelativo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  return `hace ${d}d`
}

const TIPO_ICON = {
  ticket_creado: Ticket,
  ticket_actualizado: Ticket,
  ticket_resuelto: Ticket,
  intervencion_asignada: Wrench,
  intervencion_estado: Wrench,
  intervencion_completada: Wrench,
  cita_programada: Calendar,
  cita_modificada: Calendar,
  sla_warning: AlertTriangle,
  sla_breach: AlertTriangle,
  sistema: Bell,
}

const TIPO_COLOR = {
  ticket_creado: 'text-blue-600 bg-blue-50',
  ticket_actualizado: 'text-blue-600 bg-blue-50',
  ticket_resuelto: 'text-green-600 bg-green-50',
  intervencion_asignada: 'text-purple-600 bg-purple-50',
  intervencion_estado: 'text-indigo-600 bg-indigo-50',
  intervencion_completada: 'text-green-600 bg-green-50',
  cita_programada: 'text-orange-600 bg-orange-50',
  cita_modificada: 'text-orange-600 bg-orange-50',
  sla_warning: 'text-yellow-600 bg-yellow-50',
  sla_breach: 'text-red-600 bg-red-50',
  sistema: 'text-gray-600 bg-gray-100',
}

/**
 * Campana de notificaciones con dropdown.
 * Muestra badge con conteo de no leídas y lista desplegable.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const navigate = useNavigate()

  const { data: count = 0 } = useNotificacionesCount()
  const { data: notifs = [], isLoading } = useNotificaciones({ limit: 20 })
  const marcarLeida = useMarcarLeida()
  const marcarTodas = useMarcarTodasLeidas()

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleNotifClick = (notif) => {
    if (!notif.leida) {
      marcarLeida.mutate(notif.id)
    }
    if (notif.enlace) {
      navigate(notif.enlace)
    }
    setOpen(false)
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Botón campana */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        title="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Panel desplegable */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header panel */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              Notificaciones
              {count > 0 && (
                <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                  {count} nueva{count > 1 ? 's' : ''}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1">
              {count > 0 && (
                <button
                  onClick={() => marcarTodas.mutate()}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8 text-gray-400 text-sm">Cargando...</div>
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-gray-400">
                <Bell className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Sin notificaciones</p>
              </div>
            ) : (
              notifs.map((notif) => {
                const Icon = TIPO_ICON[notif.tipo] || Bell
                const colorClass = TIPO_COLOR[notif.tipo] || 'text-gray-600 bg-gray-100'
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${!notif.leida ? 'bg-blue-50/40' : ''}`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!notif.leida ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {notif.titulo}
                      </p>
                      {notif.mensaje && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.mensaje}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{formatRelativo(notif.created_at)}</p>
                    </div>
                    {!notif.leida && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400 text-center">
                Mostrando las últimas {notifs.length} notificaciones
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
