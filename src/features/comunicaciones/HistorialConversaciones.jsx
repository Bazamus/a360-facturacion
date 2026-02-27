import { useState, useEffect } from 'react'
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
  RotateCcw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  History,
  Calendar,
} from 'lucide-react'
import {
  useConversacionesArchivadas,
  useRestaurarConversacion,
  useMensajesArchivados,
  useComunicacionesConfig,
} from '@/hooks/useComunicaciones'

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

const CANAL_TABS = [
  { key: null, label: 'Todos', icon: MessageSquare },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'chat', label: 'Chat', icon: MessageCircle },
  { key: 'telefono', label: 'Teléfono', icon: Phone },
]

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

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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

export function HistorialConversaciones() {
  const { chatwootUrl, chatwootAccountId } = useComunicacionesConfig()
  const [canalFilter, setCanalFilter] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [expandedConv, setExpandedConv] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput)
      setPage(0)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data: conversaciones = [], isFetching, isLoading } = useConversacionesArchivadas({
    canal: canalFilter,
    search: debouncedSearch,
    page,
    pageSize: PAGE_SIZE,
  })

  const hasMore = conversaciones.length >= PAGE_SIZE

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gray-100">
            <History className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Historial de Conversaciones</h1>
            <p className="text-sm text-gray-500">Conversaciones archivadas y resueltas</p>
          </div>
        </div>
      </div>

      {/* Filtros canal */}
      <div className="flex items-center gap-2 flex-wrap">
        {CANAL_TABS.map((tab) => {
          const TabIcon = tab.icon
          const isActive = canalFilter === tab.key
          return (
            <button
              key={tab.label}
              onClick={() => { setCanalFilter(tab.key); setPage(0) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <TabIcon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Búsqueda */}
      <SearchInput
        value={searchInput}
        onChange={setSearchInput}
        placeholder="Buscar por nombre, teléfono o cliente..."
      />

      {/* Lista */}
      {isLoading ? (
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
      ) : conversaciones.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <EmptyState
              icon={History}
              title="Sin conversaciones archivadas"
              description={
                debouncedSearch
                  ? 'No hay conversaciones archivadas que coincidan con la búsqueda.'
                  : 'Aún no se han archivado conversaciones.'
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {isFetching && (
            <div className="flex items-center gap-2 text-xs text-gray-400 px-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Actualizando...
            </div>
          )}
          {conversaciones.map((conv) => (
            <ArchivedCard
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
            />
          ))}
        </div>
      )}

      {/* Paginación */}
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

/* ── Tarjeta de conversación archivada ────────────────────── */

function ArchivedCard({ conv, chatwootUrl, chatwootAccountId, isExpanded, onToggleExpand }) {
  const restaurar = useRestaurarConversacion()
  const [showConfirmRestore, setShowConfirmRestore] = useState(false)
  const Icon = CANAL_ICONS[conv.canal] || MessageSquare
  const hasConversation = !!conv.chatwoot_conversation_id
  const hasCliente = !!conv.cliente_id
  const displayName = conv.cliente_nombre || conv.remitente_nombre || conv.remitente_telefono || 'Desconocido'

  function handleRestore() {
    restaurar.mutate(conv.remitente_telefono, {
      onSuccess: () => setShowConfirmRestore(false),
    })
  }

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-gray-300 border-l-4 ${
        CANAL_BORDER[conv.canal] || 'border-l-gray-400'
      } opacity-90`}
    >
      {/* Cuerpo principal */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Avatar */}
        <div
          className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full text-white text-sm font-bold shadow-sm ${
            CANAL_AVATAR_BG[conv.canal] || 'bg-gray-400'
          } opacity-70`}
        >
          {hasCliente ? getInitials(conv.cliente_nombre) : <Icon className="h-5 w-5" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold text-gray-700 truncate">
              {displayName}
            </span>
            <Badge variant="default" className="text-[9px]">Archivada</Badge>
          </div>

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
          </div>

          <p className="mt-1.5 text-sm text-gray-500 line-clamp-1">
            {conv.ultimo_mensaje || '(sin contenido)'}
          </p>
        </div>

        {/* Lado derecho */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1 pt-0.5">
          <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(conv.archivado_at)}
          </span>
          <span className="text-[11px] text-gray-400">
            {conv.total_mensajes} {conv.total_mensajes === 1 ? 'msg' : 'msgs'}
          </span>
        </div>
      </div>

      {/* Barra de acciones */}
      <div className="flex items-center gap-2 px-4 pb-3">
        {/* Chatwoot */}
        {hasConversation && (
          <a
            href={`${chatwootUrl}/app/accounts/${chatwootAccountId}/conversations/${conv.chatwoot_conversation_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Conv. #{conv.chatwoot_conversation_id}
          </a>
        )}

        {/* Restaurar */}
        {showConfirmRestore ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Restaurar?</span>
            <button
              onClick={handleRestore}
              disabled={restaurar.isPending}
              className="py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-40 transition-all"
            >
              {restaurar.isPending ? 'Restaurando...' : 'Sí'}
            </button>
            <button
              onClick={() => setShowConfirmRestore(false)}
              className="py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirmRestore(true)}
            title="Restaurar conversación a pendientes"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar
          </button>
        )}

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
        <ArchivedThread telefono={conv.remitente_telefono} />
      )}
    </div>
  )
}

/* ── Thread de mensajes archivados (solo lectura) ──────────── */

function ArchivedThread({ telefono }) {
  // Reutilizar get_mensajes_conversacion pero necesitamos incluir archivados
  // Por ahora usa el hook existente que excluye archivados — los mensajes archivados
  // ya se ven a través del RPC que filtra estado IN ('archivado', 'respondido')
  // Para el thread usamos una query directa
  const { data: mensajes = [], isLoading } = useMensajesArchivados(telefono)

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
      {mensajes.map((msg) => (
        <div
          key={msg.id}
          className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-100/50 transition-colors"
        >
          {msg.direccion === 'entrante' ? (
            <ArrowDownLeft className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
          ) : (
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
          )}

          <span className="flex-1 text-sm text-gray-700 truncate">
            {msg.contenido || '(sin contenido)'}
          </span>

          <Badge
            variant={ESTADO_VARIANTS[msg.estado] || 'default'}
            className="text-[9px] flex-shrink-0"
          >
            {msg.estado}
          </Badge>

          <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">
            {formatTimeAgo(msg.created_at)}
          </span>
        </div>
      ))}
    </div>
  )
}

