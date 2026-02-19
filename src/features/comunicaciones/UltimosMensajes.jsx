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
      window.open(
        `${chatwootUrl}/app/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${msg.chatwoot_conversation_id}`,
        '_blank',
        'noopener,noreferrer'
      )
    } else {
      window.open(chatwootUrl, '_blank', 'noopener,noreferrer')
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
              return (
                <div
                  key={msg.id}
                  className="group relative flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-primary-50 hover:border-primary-100 cursor-pointer transition-colors"
                  onClick={() => handleMessageClick(msg)}
                >
                  {/* Indicador de enlace externo en hover */}
                  <ExternalLink className="absolute top-2 right-2 h-3 w-3 text-transparent group-hover:text-primary-400 transition-colors" />

                  {/* Icono de canal */}
                  <div
                    className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg ${
                      CANAL_COLORS[msg.canal] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0 pr-5">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {msg.cliente_id ? (
                        <button
                          className="text-sm font-medium text-primary-600 hover:underline truncate"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/clientes/${msg.cliente_id}`)
                          }}
                        >
                          {msg.cliente_nombre ||
                            msg.remitente_nombre ||
                            msg.remitente_telefono ||
                            'Desconocido'}
                        </button>
                      ) : (
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {msg.remitente_nombre || msg.remitente_telefono || 'Desconocido'}
                        </span>
                      )}
                      <Badge
                        variant={ESTADO_VARIANTS[msg.estado] || 'default'}
                        className="text-[10px]"
                      >
                        {msg.estado}
                      </Badge>
                      {msg.direccion === 'entrante' ? (
                        <ArrowDownLeft className="h-3 w-3 text-blue-500 flex-shrink-0" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3 text-green-500 flex-shrink-0" />
                      )}
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2">
                      {msg.contenido || '(sin contenido)'}
                    </p>

                    <div className="flex items-center gap-2 mt-1">
                      {msg.remitente_telefono && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {msg.remitente_telefono}
                        </span>
                      )}
                      {msg.cliente_id && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Cliente vinculado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hora */}
                  <div className="flex-shrink-0 text-[11px] text-gray-400 whitespace-nowrap">
                    {formatTimeAgo(msg.created_at)}
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
