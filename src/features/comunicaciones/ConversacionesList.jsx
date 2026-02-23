import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, Badge, SearchInput, EmptyState } from '@/components/ui'
import {
  MessageSquare,
  Mail,
  Phone,
  MessageCircle,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  RefreshCw,
  ExternalLink,
  Archive,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react'
import {
  useConversaciones,
  useMensajesConversacion,
  useArchivarComunicacion,
  useArchivarConversacion,
} from '@/hooks/useComunicaciones'
import { ClienteQuickViewModal } from './ClienteQuickViewModal'
import { UsarPlantillaModal } from './UsarPlantillaModal'

/* ── Mapas de configuración visual ─────────────────────────── */

const CANAL_ICONS = {
  whatsapp: MessageSquare,
  email: Mail,
  telefono: Phone,
  chat: MessageCircle,
  sms: MessageSquare,
}

const CANAL_BORDER = {
  whatsapp: 'border-l-emerald-500',
  email: 'border-l-blue-500',
  telefono: 'border-l-amber-500',
  chat: 'border-l-violet-500',
  sms: 'border-l-gray-400',
}

const CANAL_AVATAR_BG = {
  whatsapp: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
  email: 'bg-gradient-to-br from-blue-400 to-blue-600',
  telefono: 'bg-gradient-to-br from-amber-400 to-amber-600',
  chat: 'bg-gradient-to-br from-violet-400 to-violet-600',
  sms: 'bg-gradient-to-br from-gray-400 to-gray-500',
}

const CANAL_LABELS = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  telefono: 'Teléfono',
  chat: 'Chat',
  sms: 'SMS',
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

const PAGE_SIZE = 15

/* ── Helpers ───────────────────────────────────────────────── */

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

function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

/* ── Componente principal ──────────────────────────────────── */

export function ConversacionesList({ chatwootUrl = '', chatwootAccountId = 1, canal = null }) {
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [expandedConv, setExpandedConv] = useState(null)

  // Debounce search 400ms
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput)
      setPage(0)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data: conversaciones = [], isFetching, isLoading } = useConversaciones({
    canal,
    search: debouncedSearch,
    page,
    pageSize: PAGE_SIZE,
  })

  const hasMore = conversaciones.length >= PAGE_SIZE

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-5 bg-gray-200 rounded w-56" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 p-4 border border-gray-100 rounded-xl">
                <div className="h-10 w-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
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
    <div className="space-y-3">
      {/* Header + búsqueda */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          Conversaciones pendientes
          {conversaciones.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-red-500 text-white text-xs font-bold">
              {conversaciones.length}
            </span>
          )}
          {isFetching && (
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-gray-400" />
          )}
        </h3>
      </div>

      <SearchInput
        value={searchInput}
        onChange={setSearchInput}
        placeholder="Buscar por nombre, teléfono o contenido..."
      />

      {/* Lista de conversaciones */}
      {conversaciones.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <EmptyState
              icon={MessageSquare}
              title="Sin conversaciones pendientes"
              description={
                debouncedSearch
                  ? 'No hay conversaciones que coincidan con la búsqueda.'
                  : 'Todas las conversaciones han sido atendidas.'
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversaciones.map((conv) => (
            <ConversacionCard
              key={conv.conversation_key}
              conv={conv}
              chatwootUrl={chatwootUrl}
              chatwootAccountId={chatwootAccountId}
              isExpanded={expandedConv === conv.conversation_key}
              onToggleExpand={() =>
                setExpandedConv(
                  expandedConv === conv.conversation_key ? null : conv.conversation_key
                )
              }
              navigate={navigate}
            />
          ))}
        </div>
      )}

      {/* Paginación cursor-based */}
      {(page > 0 || hasMore) && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Anterior
          </button>
          <span className="text-xs text-gray-500">Página {page + 1}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Tarjeta de conversación ───────────────────────────────── */

function ConversacionCard({ conv, chatwootUrl, chatwootAccountId, isExpanded, onToggleExpand, navigate }) {
  const archivarConv = useArchivarConversacion()
  const [showClienteModal, setShowClienteModal] = useState(false)
  const [showPlantillaModal, setShowPlantillaModal] = useState(false)
  const Icon = CANAL_ICONS[conv.canal] || MessageSquare
  const hasConversation = !!conv.chatwoot_conversation_id
  const hasCliente = !!conv.cliente_id
  const displayName = conv.cliente_nombre || conv.remitente_nombre || conv.remitente_telefono || 'Desconocido'

  function handleChatwootClick() {
    if (!chatwootUrl) return
    if (hasConversation) {
      window.open(
        `${chatwootUrl}/app/accounts/${chatwootAccountId}/conversations/${conv.chatwoot_conversation_id}`,
        '_blank',
        'noopener,noreferrer'
      )
    } else {
      window.open(
        `${chatwootUrl}/app/accounts/${chatwootAccountId}/conversations`,
        '_blank',
        'noopener,noreferrer'
      )
    }
  }

  function handleClienteClick() {
    if (hasCliente) {
      setShowClienteModal(true)
    } else {
      navigate('/clientes')
    }
  }

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-gray-300 border-l-4 ${
        CANAL_BORDER[conv.canal] || 'border-l-gray-400'
      }`}
    >
      {/* Cuerpo principal */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Avatar */}
        <div
          className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full text-white text-sm font-bold shadow-sm ${
            CANAL_AVATAR_BG[conv.canal] || 'bg-gray-400'
          }`}
        >
          {hasCliente ? (
            getInitials(conv.cliente_nombre)
          ) : (
            <Icon className="h-5 w-5" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold text-gray-900 truncate">
              {displayName}
            </span>
            {conv.pendientes > 0 && (
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold">
                {conv.pendientes}
              </span>
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {conv.remitente_telefono}
            </span>
            <span>·</span>
            <span>{CANAL_LABELS[conv.canal] || conv.canal}</span>
            {hasConversation && (
              <>
                <span>·</span>
                <span>Conv.#{conv.chatwoot_conversation_id}</span>
              </>
            )}
            {!hasCliente && (
              <span className="text-amber-500 font-medium">(sin vincular)</span>
            )}
          </div>

          {/* Preview último mensaje */}
          <p className="mt-1.5 text-sm text-gray-600 line-clamp-1">
            {conv.ultimo_mensaje || '(sin contenido)'}
          </p>
        </div>

        {/* Lado derecho */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1 pt-0.5">
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {formatTimeAgo(conv.ultimo_mensaje_at)}
          </span>
          <span className="text-[11px] text-gray-400">
            {conv.total_mensajes} {conv.total_mensajes === 1 ? 'msg' : 'msgs'}
          </span>
        </div>
      </div>

      {/* Barra de acciones */}
      <div className="flex items-center gap-2 px-4 pb-3">
        {/* Chatwoot */}
        <button
          onClick={handleChatwootClick}
          title={
            hasConversation
              ? `Abrir conversación #${conv.chatwoot_conversation_id}`
              : 'Abrir Chatwoot'
          }
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            hasConversation
              ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {hasConversation ? `Conv. #${conv.chatwoot_conversation_id}` : 'Chatwoot'}
        </button>

        {/* Ver ficha */}
        <button
          onClick={handleClienteClick}
          title={hasCliente ? `Ver ficha de ${displayName}` : 'Buscar cliente'}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            hasCliente
              ? 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm'
              : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
          }`}
        >
          <User className="h-3.5 w-3.5" />
          {hasCliente ? 'Ver ficha' : 'Buscar cliente'}
        </button>

        {/* Plantilla — respuesta rápida */}
        <button
          onClick={() => setShowPlantillaModal(true)}
          title="Usar plantilla de respuesta rápida"
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
        >
          <FileText className="h-3.5 w-3.5" />
          Plantilla
        </button>

        {/* Archivar conversación completa */}
        <button
          onClick={() => archivarConv.mutate(conv.remitente_telefono)}
          disabled={archivarConv.isPending}
          title="Archivar toda la conversación"
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
        >
          <Archive className="h-3.5 w-3.5" />
          Archivar
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Toggle expandir */}
        {conv.total_mensajes > 1 && (
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition-all"
          >
            Ver {conv.total_mensajes} mensajes
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-300 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
        )}
      </div>

      {/* Thread expandible */}
      {isExpanded && (
        <ConversacionThread telefono={conv.remitente_telefono} />
      )}

      {/* Modal ficha cliente */}
      {hasCliente && (
        <ClienteQuickViewModal
          clienteId={conv.cliente_id}
          open={showClienteModal}
          onClose={() => setShowClienteModal(false)}
        />
      )}

      {/* Modal usar plantilla */}
      <UsarPlantillaModal
        open={showPlantillaModal}
        onClose={() => setShowPlantillaModal(false)}
        canal={conv.canal}
        clienteId={conv.cliente_id}
        chatwootUrl={chatwootUrl}
        chatwootAccountId={chatwootAccountId}
        chatwootConversationId={conv.chatwoot_conversation_id}
      />
    </div>
  )
}

/* ── Thread de mensajes expandible ─────────────────────────── */

function ConversacionThread({ telefono }) {
  const { data: mensajes = [], isLoading } = useMensajesConversacion(telefono, true)
  const archivar = useArchivarComunicacion()

  if (isLoading) {
    return (
      <div className="mx-4 mb-3 p-3 bg-gray-50 rounded-lg">
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (mensajes.length === 0) return null

  return (
    <div className="mx-4 mb-3 bg-gray-50/70 rounded-lg border border-gray-100 divide-y divide-gray-100 overflow-hidden">
      {mensajes.map((msg) => {
        const isPending = msg.estado === 'recibido'
        return (
          <div
            key={msg.id}
            className={`flex items-center gap-2.5 px-3 py-2 group transition-colors ${
              isPending
                ? 'bg-amber-50/60 hover:bg-amber-50 border-l-2 border-l-amber-400'
                : 'hover:bg-gray-100/50'
            }`}
          >
            {/* Dirección */}
            {msg.direccion === 'entrante' ? (
              <ArrowDownLeft className={`h-3.5 w-3.5 flex-shrink-0 ${isPending ? 'text-amber-500' : 'text-blue-500'}`} />
            ) : (
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
            )}

            {/* Contenido */}
            <span className={`flex-1 text-sm truncate ${isPending ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
              {msg.contenido || '(sin contenido)'}
            </span>

            {/* Estado */}
            <Badge
              variant={ESTADO_VARIANTS[msg.estado] || 'default'}
              className="text-[9px] flex-shrink-0"
            >
              {msg.estado}
            </Badge>

            {/* Hora */}
            <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">
              {formatTimeAgo(msg.created_at)}
            </span>

            {/* Archivar individual */}
            <button
              onClick={() => archivar.mutate(msg.id)}
              disabled={archivar.isPending}
              title="Archivar este mensaje"
              className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all flex-shrink-0"
            >
              <Archive className="h-3 w-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
