import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTicket, useActualizarTicket, useCrearIntervencionDesdeTicket, useUsuarios } from '@/hooks'
import {
  Button, Card, Badge, LoadingSpinner, Breadcrumb, Select, Modal,
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import {
  Edit2, User, Phone, Mail, FileText, Wrench, Clock,
  CheckCircle, XCircle, AlertTriangle, ArrowRight,
} from 'lucide-react'
import { TicketComentarios } from './TicketComentarios'

const ESTADO_VARIANTS = {
  abierto: 'warning', en_progreso: 'info',
  esperando_cliente: 'default', esperando_material: 'default',
  resuelto: 'success', cerrado: 'default',
}
const PRIORIDAD_VARIANTS = {
  baja: 'default', normal: 'info', alta: 'warning', urgente: 'danger', critica: 'danger',
}
const TIPO_LABELS = {
  incidencia: 'Incidencia', consulta: 'Consulta', solicitud: 'Solicitud', queja: 'Queja',
}
const ORIGEN_LABELS = {
  interno: 'Interno', telefono: 'Teléfono', email: 'Email',
  whatsapp: 'WhatsApp', portal_cliente: 'Portal Cliente',
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function TicketDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: ticket, isLoading, error } = useTicket(id)
  const actualizar = useActualizarTicket()
  const crearIntervencion = useCrearIntervencionDesdeTicket()
  const { data: usuarios } = useUsuarios()
  const toast = useToast()
  const [showAsignarModal, setShowAsignarModal] = useState(false)

  const tecnicos = usuarios?.filter((u) => u.rol === 'tecnico' || u.rol === 'encargado' || u.rol === 'admin') ?? []

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-red-600">Error: {error.message}</div>
  if (!ticket) return <div>Ticket no encontrado</div>

  const estado = ticket.estado
  const estaAbierto = !['resuelto', 'cerrado'].includes(estado)

  const cambiarEstado = async (nuevoEstado) => {
    try {
      await actualizar.mutateAsync({ id, estado: nuevoEstado })
      toast.success(`Estado cambiado a: ${nuevoEstado.replace('_', ' ')}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleAsignar = async (userId) => {
    try {
      await actualizar.mutateAsync({ id, asignado_a: userId || null })
      toast.success(userId ? 'Ticket asignado' : 'Asignación eliminada')
      setShowAsignarModal(false)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleGenerarIntervencion = async () => {
    try {
      const intervencionId = await crearIntervencion.mutateAsync(id)
      toast.success('Intervención creada desde ticket')
      navigate(`/sat/intervenciones/${intervencionId}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const clienteNombre = ticket.cliente
    ? `${ticket.cliente.nombre} ${ticket.cliente.apellidos}`
    : '-'

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'SAT', href: '/sat' },
          { label: 'Tickets', href: '/sat/tickets' },
          { label: ticket.numero_ticket },
        ]}
        className="mb-4"
      />

      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">{ticket.numero_ticket}</h1>
            <Badge variant={ESTADO_VARIANTS[estado] || 'default'} className="capitalize">
              {estado?.replace('_', ' ')}
            </Badge>
            <Badge variant={PRIORIDAD_VARIANTS[ticket.prioridad] || 'default'} className="capitalize">
              {ticket.prioridad}
            </Badge>
            {ticket.prioridad === 'critica' && (
              <Badge variant="danger"><AlertTriangle className="h-3 w-3 mr-1" /> Crítico</Badge>
            )}
          </div>
          <p className="page-description">{ticket.asunto}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Acciones según estado */}
          {estaAbierto && !ticket.intervencion_id && (
            <Button variant="primary" onClick={handleGenerarIntervencion} loading={crearIntervencion.isPending}>
              <Wrench className="h-4 w-4 mr-1" /> Generar Intervención
            </Button>
          )}
          {estaAbierto && (
            <Button variant="secondary" onClick={() => setShowAsignarModal(true)}>
              <User className="h-4 w-4 mr-1" /> Asignar
            </Button>
          )}
          {estado === 'abierto' && (
            <Button variant="secondary" onClick={() => cambiarEstado('en_progreso')}>
              <ArrowRight className="h-4 w-4 mr-1" /> En progreso
            </Button>
          )}
          {estaAbierto && (
            <Button variant="secondary" onClick={() => cambiarEstado('resuelto')}>
              <CheckCircle className="h-4 w-4 mr-1" /> Resolver
            </Button>
          )}
          {estado === 'resuelto' && (
            <Button variant="secondary" onClick={() => cambiarEstado('cerrado')}>
              <XCircle className="h-4 w-4 mr-1" /> Cerrar
            </Button>
          )}
          {estado === 'cerrado' && (
            <Button variant="secondary" onClick={() => cambiarEstado('abierto')}>
              Reabrir
            </Button>
          )}
        </div>
      </div>

      {/* Contenido con tabs */}
      <Card>
        <Tabs defaultValue="datos">
          <TabsList className="px-6">
            <TabsTrigger value="datos">Datos del Ticket</TabsTrigger>
            <TabsTrigger value="comentarios">Comentarios</TabsTrigger>
          </TabsList>

          <TabsContent value="datos" className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Información</h3>
                <dl className="space-y-2">
                  <InfoRow label="Tipo" value={TIPO_LABELS[ticket.tipo] || ticket.tipo} />
                  <InfoRow label="Prioridad" value={ticket.prioridad} />
                  <InfoRow label="Origen" value={ORIGEN_LABELS[ticket.origen] || ticket.origen} />
                  {ticket.categoria && <InfoRow label="Categoría" value={ticket.categoria} />}
                  <InfoRow label="Creado" value={formatDate(ticket.created_at)} icon={Clock} />
                  <InfoRow label="Actualizado" value={formatDate(ticket.updated_at)} />
                </dl>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Asignación</h3>
                <dl className="space-y-2">
                  <InfoRow label="Cliente" value={clienteNombre} icon={User} />
                  {ticket.cliente?.telefono && (
                    <InfoRow label="Teléfono" value={ticket.cliente.telefono} icon={Phone} />
                  )}
                  {ticket.cliente?.email && (
                    <InfoRow label="Email" value={ticket.cliente.email} icon={Mail} />
                  )}
                  <InfoRow label="Comunidad" value={ticket.comunidad?.nombre || '-'} />
                  <InfoRow label="Asignado a" value={ticket.asignado?.nombre_completo || 'Sin asignar'} icon={User} />
                </dl>
              </div>

              {/* Descripción */}
              {ticket.descripcion && (
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Descripción</h3>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                    {ticket.descripcion}
                  </p>
                </div>
              )}

              {/* Resolución */}
              {ticket.resolucion && (
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Resolución</h3>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap bg-green-50 border border-green-200 rounded-lg p-3">
                    {ticket.resolucion}
                  </p>
                </div>
              )}

              {/* Intervención vinculada */}
              {ticket.intervencion && (
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Intervención Vinculada</h3>
                  <Link
                    to={`/sat/intervenciones/${ticket.intervencion.id}`}
                    className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div>
                      <span className="font-mono text-sm font-medium text-blue-900">
                        {ticket.intervencion.numero_parte}
                      </span>
                      <span className="text-sm text-blue-700 ml-2">{ticket.intervencion.titulo}</span>
                    </div>
                    <Badge variant={ticket.intervencion.estado === 'completada' ? 'success' : 'info'} className="ml-auto capitalize text-xs">
                      {ticket.intervencion.estado?.replace('_', ' ')}
                    </Badge>
                  </Link>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="comentarios" className="p-6">
            <TicketComentarios ticketId={id} />
          </TabsContent>
        </Tabs>
      </Card>

      {/* Modal asignar */}
      <AsignarModal
        open={showAsignarModal}
        onClose={() => setShowAsignarModal(false)}
        tecnicos={tecnicos}
        asignadoActual={ticket.asignado_a}
        onAsignar={handleAsignar}
        loading={actualizar.isPending}
      />
    </div>
  )
}

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="flex justify-between">
      <dt className="text-sm text-gray-600 flex items-center gap-1">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </dt>
      <dd className="text-sm font-medium text-gray-900">{value}</dd>
    </div>
  )
}

function AsignarModal({ open, onClose, tecnicos, asignadoActual, onAsignar, loading }) {
  const [selectedUser, setSelectedUser] = useState(asignadoActual || '')

  return (
    <Modal open={open} onClose={onClose} title="Asignar Ticket">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a</label>
          <Select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
            <option value="">Sin asignar</option>
            {tecnicos.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre_completo} ({t.rol})</option>
            ))}
          </Select>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={() => onAsignar(selectedUser)} loading={loading}>
            Asignar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
