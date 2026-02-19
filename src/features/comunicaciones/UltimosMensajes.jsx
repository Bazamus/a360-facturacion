import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, Badge, SearchInput, Pagination, EmptyState } from '@/components/ui'
import {
  MessageSquare,
  Mail,
  Phone,
  MessageCircle,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Clock,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { useComunicaciones } from '@/hooks/useComunicaciones'

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

const CANAL_ACCENT = {
  whatsapp: 'bg-green-500',
  email: 'bg-blue-500',
  telefono: 'bg-orange-500',
  chat: 'bg-purple-500',
  sms: 'bg-gray-400',
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

const PAGE_SIZE = 10
const CHATWOOT_ACCOUNT_ID = 1

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

export function UltimosMensajes({ chatwootUrl = '' }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const { data: resultado, isFetching, isLoading } = useComunicaciones({
    estado: 'recibido',
    search,
    page,
    pageSize: PAGE_SIZE,
  })

  const mensajes = resultado?.data ?? []
  const totalCount = resultado?.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  function handleSearchChange(value) {
    setSearch(value)
    setPage(0)
  }

  function handleMessageClick(msg) {
    if (!chatwootUrl) return
    if (msg.chatwoot_conversation_id) {
      // Deep link directo a la conversación específica
      window.open(
        `${chatwootUrl}/app/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${msg.chatwoot_conversation_id}`,
        '_blank',
        'noopener,noreferrer'
      )
    } else {
      // Sin ID de conversación: abrir lista de conversaciones (mejor que el dashboard)
      window.open(
        `${chatwootUrl}/app/accounts/${CHATWOOT_ACCOUNT_ID}/conversations`,
        '_blank',
        'noopener,noreferrer'
      )
    }
  }

  if (isLoading) {
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
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            Mensajes pendientes de respuesta
          </h3>
          <div className="flex items-center gap-2">
            {isFetching && (
              <RefreshCw className="h-3 w-3 animate-spin text-gray-400" />
            )}
            {totalCount > 0 && (
              <Badge variant="warning">{totalCount}</Badge>
            )}
          </div>
        </div>

        {/* Búsqueda */}
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Buscar por nombre, teléfono o contenido..."
          className="mb-4"
        />

        {/* Lista */}
        {mensajes.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Sin mensajes pendientes"
            description={
              search
                ? 'No hay mensajes que coincidan con la búsqueda.'
                : 'No hay comunicaciones pendientes de respuesta.'
            }
          />
        ) : (
          <div className="space-y-2">
            {mensajes.map((msg) => {
              const Icon = CANAL_ICONS[msg.canal] || MessageSquare
              const hasConversation = !!msg.chatwoot_conversation_id
              const hasCliente = !!msg.cliente_id
              const displayName =
                msg.cliente_nombre ||
                msg.remitente_nombre ||
                msg.remitente_telefono ||
                'Desconocido'

              function handleClienteClick() {
                if (hasCliente) {
                  navigate(`/clientes/${msg.cliente_id}`)
                } else {
                  navigate('/clientes')
                }
              }

              return (
                <div
                  key={msg.id}
                  className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-gray-300"
                >
                  {/* Franja de color del canal */}
                  <div className={`h-1 ${CANAL_ACCENT[msg.canal] || 'bg-gray-400'}`} />

                  {/* Cuerpo */}
                  <div className="flex items-start gap-3 px-4 pt-3 pb-2">
                    {/* Icono de canal */}
                    <div
                      className={`flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg ${
                        CANAL_COLORS[msg.canal] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      {/* Fila superior: nombre + estado + dirección */}
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {displayName}
                        </span>
                        <Badge
                          variant={ESTADO_VARIANTS[msg.estado] || 'default'}
                          className="text-[10px]"
                        >
                          {msg.estado}
                        </Badge>
                        {msg.direccion === 'entrante' ? (
                          <span className="flex items-center gap-0.5 text-[10px] font-medium text-blue-600">
                            <ArrowDownLeft className="h-3 w-3" />
                            Entrante
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-[10px] font-medium text-green-600">
                            <ArrowUpRight className="h-3 w-3" />
                            Saliente
                          </span>
                        )}
                      </div>

                      {/* Mensaje */}
                      <p className="text-xs text-gray-600 line-clamp-2 bg-gray-50 rounded-md px-2.5 py-1.5 border border-gray-100">
                        {msg.contenido || '(sin contenido)'}
                      </p>

                      {/* Teléfono */}
                      {msg.remitente_telefono && (
                        <span className="text-[11px] text-gray-400 flex items-center gap-1 mt-1.5">
                          <Phone className="h-3 w-3" />
                          {msg.remitente_telefono}
                          {!hasCliente && (
                            <span className="ml-1 text-amber-500 font-medium">(sin vincular)</span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Hora */}
                    <div className="flex-shrink-0 text-[11px] text-gray-400 whitespace-nowrap pt-0.5">
                      {formatTimeAgo(msg.created_at)}
                    </div>
                  </div>

                  {/* Barra de acciones */}
                  <div className="flex gap-2 px-3 pb-3 pt-1">
                    {/* Botón Chatwoot */}
                    <button
                      onClick={() => handleMessageClick(msg)}
                      title={
                        hasConversation
                          ? `Abrir conversación #${msg.chatwoot_conversation_id} en Chatwoot`
                          : 'Abrir lista de conversaciones en Chatwoot'
                      }
                      className={`flex flex-1 items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                        hasConversation
                          ? 'bg-primary-600 text-white hover:bg-primary-700'
                          : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                      }`}
                    >
                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                      {hasConversation
                        ? `Conv. #${msg.chatwoot_conversation_id}`
                        : 'Ver en Chatwoot'}
                    </button>

                    {/* Botón cliente — siempre visible si hay teléfono o cliente_id */}
                    {(hasCliente || msg.remitente_telefono) && (
                      <button
                        onClick={handleClienteClick}
                        title={hasCliente ? `Ver ficha de ${displayName}` : 'Ir a lista de clientes'}
                        className={`flex flex-1 items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                          hasCliente
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-primary-700'
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        <User className="h-3.5 w-3.5 flex-shrink-0" />
                        {hasCliente ? 'Ver ficha' : 'Buscar cliente'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="mt-4 pt-2 border-t border-gray-100">
            <Pagination
              currentPage={page + 1}
              totalPages={totalPages}
              totalItems={totalCount}
              itemsPerPage={PAGE_SIZE}
              onPageChange={(p) => setPage(p - 1)}
              showPageSizeSelector={false}
              showInfo={true}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
