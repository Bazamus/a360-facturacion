import { Modal, Badge, Button, Tabs, TabsList, TabsTrigger, TabsContent, EmptyState } from '@/components/ui'
import {
  ExternalLink,
  AlertTriangle,
  Edit2,
  ArrowDownLeft,
  ArrowUpRight,
  MessageSquare,
} from 'lucide-react'
import { useCliente } from '@/hooks/useClientes'
import { useFacturas } from '@/hooks/useFacturas'
import { useComentarios } from '@/hooks/useComentarios'
import { useHistorialCliente } from '@/hooks/useComunicaciones'
import { FacturasEmbedded } from '@/features/facturacion/components/FacturasEmbedded'
import { ComentariosTab } from '@/features/comentarios/ComentariosTab'

/* ── Modal ficha cliente completa (con pestañas) ───────────── */

export function ClienteQuickViewModal({ clienteId, open, onClose }) {
  const { data: cliente, isLoading, error } = useCliente(clienteId)
  const { data: facturasCliente } = useFacturas({ clienteId, limit: 500 })
  const { data: notasCliente } = useComentarios('cliente', clienteId)

  const numFacturas = Array.isArray(facturasCliente) ? facturasCliente.length : 0
  const numNotas = notasCliente?.length || 0
  const notasAbiertas = notasCliente?.filter(n => n.estado !== 'resuelto').length || 0

  function handleVerDetalle() {
    window.open(`/clientes/${clienteId}`, '_blank', 'noopener,noreferrer')
  }

  function handleEditar() {
    window.open(`/clientes/${clienteId}/editar`, '_blank', 'noopener,noreferrer')
  }

  const titulo = isLoading
    ? 'Cargando...'
    : cliente
      ? `${cliente.nombre} ${cliente.apellidos}`
      : 'Cliente'

  const descripcion = cliente?.nif || undefined

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titulo}
      description={descripcion}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button variant="secondary" onClick={handleEditar}>
            <Edit2 className="h-4 w-4 mr-1.5" />
            Editar
          </Button>
          <Button onClick={handleVerDetalle}>
            <ExternalLink className="h-4 w-4 mr-1.5" />
            Ver detalle completo
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className="space-y-4 py-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-64" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-600 text-sm py-4">
          <AlertTriangle className="h-4 w-4" />
          Error al cargar el cliente
        </div>
      ) : cliente ? (
        <div>
          {/* Badges de estado */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {cliente.tipo && (
              <Badge variant={cliente.tipo === 'propietario' ? 'primary' : 'info'}>
                {cliente.tipo}
              </Badge>
            )}
            {cliente.estado && (
              <Badge
                style={cliente.estado.color ? { backgroundColor: cliente.estado.color, color: '#fff' } : undefined}
                variant={!cliente.estado.color ? 'primary' : undefined}
              >
                {cliente.estado.nombre}
              </Badge>
            )}
            {cliente.bloqueado && (
              <Badge variant="danger" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Bloqueado
              </Badge>
            )}
          </div>

          {/* Bloqueo motivo */}
          {cliente.bloqueado && cliente.motivo_bloqueo && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 mb-4">
              {cliente.motivo_bloqueo}
            </div>
          )}

          {/* Pestañas */}
          <Tabs defaultValue="datos">
            <TabsList>
              <TabsTrigger value="datos">Datos Personales</TabsTrigger>
              <TabsTrigger value="ubicaciones">Ubicaciones</TabsTrigger>
              <TabsTrigger value="facturas">
                Facturas{numFacturas > 0 ? ` (${numFacturas})` : ''}
              </TabsTrigger>
              <TabsTrigger value="notas">
                Notas{notasAbiertas > 0 ? ` (${notasAbiertas})` : numNotas > 0 ? ` (${numNotas})` : ''}
              </TabsTrigger>
              <TabsTrigger value="comunicaciones">
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                Comunicaciones
              </TabsTrigger>
              <TabsTrigger value="bancarios">Datos Bancarios</TabsTrigger>
            </TabsList>

            <TabsContent value="datos">
              <DatosPersonalesTab cliente={cliente} />
            </TabsContent>

            <TabsContent value="ubicaciones">
              <UbicacionesTab cliente={cliente} />
            </TabsContent>

            <TabsContent value="facturas">
              <FacturasEmbedded clienteId={clienteId} showComunidad />
            </TabsContent>

            <TabsContent value="notas">
              <ComentariosTab entidadTipo="cliente" entidadId={clienteId} />
            </TabsContent>

            <TabsContent value="comunicaciones">
              <ComunicacionesClienteTab clienteId={clienteId} />
            </TabsContent>

            <TabsContent value="bancarios">
              <DatosBancariosTab cliente={cliente} />
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </Modal>
  )
}

/* ── Pestaña Datos Personales ─────────────────────────────────── */

function DatosPersonalesTab({ cliente }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Contacto</h3>
        <dl className="space-y-2">
          <DlRow label="Código Cliente" value={cliente.codigo_cliente} mono />
          <DlRow
            label="Email"
            value={
              cliente.email ? (
                <a href={`mailto:${cliente.email}`} className="text-primary-600 hover:underline">
                  {cliente.email}
                </a>
              ) : null
            }
          />
          <DlRow label="Teléfono" value={cliente.telefono} />
          <DlRow label="Teléfono secundario" value={cliente.telefono_secundario} />
        </dl>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Dirección de Correspondencia</h3>
        {cliente.direccion_correspondencia ? (
          <address className="text-sm text-gray-900 not-italic">
            {cliente.direccion_correspondencia}<br />
            {cliente.cp_correspondencia} {cliente.ciudad_correspondencia}<br />
            {cliente.provincia_correspondencia}
          </address>
        ) : (
          <p className="text-sm text-gray-500 italic">
            Usa la dirección de la ubicación asignada
          </p>
        )}
      </div>

      {cliente.observaciones && (
        <div className="md:col-span-2">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Observaciones</h3>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{cliente.observaciones}</p>
        </div>
      )}
    </div>
  )
}

/* ── Pestaña Ubicaciones ──────────────────────────────────────── */

function UbicacionesTab({ cliente }) {
  const ubicaciones = cliente.ubicaciones_clientes || []

  if (!ubicaciones.length) {
    return (
      <EmptyState
        title="Sin ubicaciones asignadas"
        description="Este cliente no tiene ubicaciones asignadas"
      />
    )
  }

  return (
    <div className="space-y-4">
      {ubicaciones.map(uc => (
        <div
          key={uc.id}
          className={`p-4 rounded-lg border ${
            uc.es_actual ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">
                {uc.ubicacion?.agrupacion?.comunidad?.nombre}
              </p>
              <p className="text-sm text-gray-600">
                {uc.ubicacion?.agrupacion?.nombre} - {uc.ubicacion?.nombre}
              </p>
            </div>
            <div className="text-right">
              {uc.es_actual ? (
                <Badge variant="success">Actual</Badge>
              ) : (
                <Badge variant="default">Histórico</Badge>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {formatDate(uc.fecha_inicio)}
                {uc.fecha_fin && ` - ${formatDate(uc.fecha_fin)}`}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Pestaña Datos Bancarios ──────────────────────────────────── */

function DatosBancariosTab({ cliente }) {
  return (
    <div className="max-w-md">
      <h3 className="text-sm font-medium text-gray-500 mb-3">Datos para Domiciliación SEPA</h3>
      <dl className="space-y-4">
        <div>
          <dt className="text-sm text-gray-600 mb-1">IBAN</dt>
          <dd className="text-lg font-mono font-medium text-gray-900">
            {cliente.iban ? formatIBAN(cliente.iban) : '-'}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-gray-600 mb-1">Titular de la cuenta</dt>
          <dd className="text-sm font-medium text-gray-900">
            {cliente.titular_cuenta || '-'}
          </dd>
        </div>
      </dl>

      {!cliente.iban && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Este cliente no tiene datos bancarios configurados.
            No podrá incluirse en remesas SEPA.
          </p>
        </div>
      )}
    </div>
  )
}

/* ── Helpers internos ─────────────────────────────────────────── */

function DlRow({ label, value, mono }) {
  return (
    <div className="flex justify-between">
      <dt className="text-sm text-gray-600">{label}</dt>
      <dd className={`text-sm font-medium text-gray-900 ${mono ? 'font-mono' : ''}`}>
        {value || '-'}
      </dd>
    </div>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-ES')
}

function formatIBAN(iban) {
  if (!iban) return ''
  const clean = iban.replace(/\s/g, '')
  return clean.replace(/(.{4})/g, '$1 ').trim()
}

/* ── Pestaña Comunicaciones del Cliente ───────────────────────── */

const ESTADO_VARIANTS = {
  recibido: 'warning',
  leido: 'info',
  respondido: 'success',
  archivado: 'default',
  enviado: 'primary',
  entregado: 'success',
  fallido: 'danger',
}

function ComunicacionesClienteTab({ clienteId }) {
  const { data: mensajes = [], isLoading } = useHistorialCliente(clienteId, true)

  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-10 bg-gray-100 rounded" />
        ))}
      </div>
    )
  }

  if (mensajes.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Sin comunicaciones"
        description="No hay mensajes registrados para este cliente"
      />
    )
  }

  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto">
      {mensajes.map((msg) => (
        <div
          key={msg.id}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
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
            {msg.created_at
              ? new Date(msg.created_at).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''}
          </span>
        </div>
      ))}
    </div>
  )
}
