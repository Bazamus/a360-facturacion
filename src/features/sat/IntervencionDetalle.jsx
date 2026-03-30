import { useParams, Link, useNavigate } from 'react-router-dom'
import { useIntervencion, useActualizarIntervencion, useCerrarIntervencion } from '@/hooks'
import {
  Button, Card, Badge, LoadingSpinner, Breadcrumb, Modal, Textarea,
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { useState } from 'react'
import {
  Edit2, Play, Square, Truck, XCircle, RotateCcw, User, Phone, MapPin,
  Calendar, Clock, FileText, AlertTriangle,
} from 'lucide-react'
import { IntervencionTimeline } from './IntervencionTimeline'
import { MaterialesIntervencion } from './MaterialesIntervencion'
import { FirmaDigital } from './FirmaDigital'
import { FotosIntervencion } from './FotosIntervencion'
import { FacturarIntervencionModal } from './FacturarIntervencionModal'

const PRIORIDAD_VARIANTS = { urgente: 'danger', alta: 'warning', normal: 'default', baja: 'info' }
const ESTADO_VARIANTS = { pendiente: 'warning', asignada: 'info', programada: 'info', en_camino: 'primary', en_curso: 'primary', completada: 'success', facturada: 'success', cancelada: 'default' }
const TIPO_LABELS = { correctiva: 'Correctiva', preventiva: 'Preventiva', instalacion: 'Instalación', inspeccion: 'Inspección', urgencia: 'Urgencia' }

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function IntervencionDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: intervencion, isLoading, error } = useIntervencion(id)
  const actualizar = useActualizarIntervencion()
  const cerrar = useCerrarIntervencion()
  const toast = useToast()
  const [showCerrarModal, setShowCerrarModal] = useState(false)
  const [showFacturarModal, setShowFacturarModal] = useState(false)

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-red-600">Error: {error.message}</div>
  if (!intervencion) return <div>Intervención no encontrada</div>

  const estado = intervencion.estado
  const esEditable = !['completada', 'facturada', 'cancelada'].includes(estado)

  const cambiarEstado = async (nuevoEstado, extras = {}) => {
    try {
      const updates = { estado: nuevoEstado, ...extras }
      if (nuevoEstado === 'en_curso' && !intervencion.fecha_inicio) {
        updates.fecha_inicio = new Date().toISOString()
      }
      await actualizar.mutateAsync({ id, ...updates })
      toast.success(`Estado cambiado a: ${nuevoEstado.replace('_', ' ')}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const clienteNombre = intervencion.cliente
    ? `${intervencion.cliente.nombre} ${intervencion.cliente.apellidos}`
    : '-'

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'SAT', href: '/sat' },
          { label: 'Intervenciones', href: '/sat/intervenciones' },
          { label: intervencion.numero_parte },
        ]}
        className="mb-4"
      />

      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">{intervencion.numero_parte}</h1>
            <Badge variant={ESTADO_VARIANTS[estado] || 'default'} className="capitalize">
              {estado?.replace('_', ' ')}
            </Badge>
            <Badge variant={PRIORIDAD_VARIANTS[intervencion.prioridad] || 'default'} className="capitalize">
              {intervencion.prioridad}
            </Badge>
            {intervencion.tipo === 'urgencia' && (
              <Badge variant="danger"><AlertTriangle className="h-3 w-3 mr-1" /> Urgencia</Badge>
            )}
          </div>
          <p className="page-description">{intervencion.titulo}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Botones de acción según estado */}
          {estado === 'pendiente' && (
            <Button variant="primary" onClick={() => navigate(`/sat/intervenciones/${id}/editar`)}>
              <User className="h-4 w-4 mr-1" /> Asignar
            </Button>
          )}
          {estado === 'asignada' && (
            <Button variant="primary" onClick={() => cambiarEstado('en_camino')}>
              <Truck className="h-4 w-4 mr-1" /> En camino
            </Button>
          )}
          {(estado === 'asignada' || estado === 'programada' || estado === 'en_camino') && (
            <Button variant="primary" onClick={() => cambiarEstado('en_curso')}>
              <Play className="h-4 w-4 mr-1" /> Iniciar
            </Button>
          )}
          {(estado === 'en_curso' || estado === 'asignada' || estado === 'programada') && (
            <Button variant="primary" onClick={() => setShowCerrarModal(true)}>
              <Square className="h-4 w-4 mr-1" /> Cerrar
            </Button>
          )}
          {estado === 'completada' && (
            <Button variant="primary" onClick={() => setShowFacturarModal(true)}>
              <FileText className="h-4 w-4 mr-1" /> Facturar
            </Button>
          )}
          {estado === 'cancelada' && (
            <Button variant="secondary" onClick={() => cambiarEstado('pendiente')}>
              <RotateCcw className="h-4 w-4 mr-1" /> Reabrir
            </Button>
          )}
          {esEditable && (
            <>
              <Link to={`/sat/intervenciones/${id}/editar`}>
                <Button variant="secondary">
                  <Edit2 className="h-4 w-4 mr-1" /> Editar
                </Button>
              </Link>
              <Button variant="secondary" onClick={() => cambiarEstado('cancelada')}>
                <XCircle className="h-4 w-4 mr-1" /> Cancelar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Contenido con tabs */}
      <Card>
        <Tabs defaultValue="datos">
          <TabsList className="px-6">
            <TabsTrigger value="datos">Datos Generales</TabsTrigger>
            <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
            <TabsTrigger value="materiales">Materiales</TabsTrigger>
            <TabsTrigger value="fotos">Fotos{intervencion.fotos?.length ? ` (${intervencion.fotos.length})` : ''}</TabsTrigger>
            <TabsTrigger value="firma">Firma</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="datos" className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Información General</h3>
                <dl className="space-y-2">
                  <InfoRow label="Tipo" value={TIPO_LABELS[intervencion.tipo] || intervencion.tipo} />
                  <InfoRow label="Prioridad" value={intervencion.prioridad} />
                  <InfoRow label="Fecha solicitud" value={formatDate(intervencion.fecha_solicitud)} />
                  {intervencion.fecha_programada && <InfoRow label="Fecha programada" value={formatDate(intervencion.fecha_programada)} />}
                  {intervencion.fecha_inicio && <InfoRow label="Inicio" value={formatDate(intervencion.fecha_inicio)} />}
                  {intervencion.fecha_fin && <InfoRow label="Fin" value={formatDate(intervencion.fecha_fin)} />}
                  {intervencion.duracion_minutos && <InfoRow label="Duración" value={`${intervencion.duracion_minutos} min`} />}
                </dl>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Asignación</h3>
                <dl className="space-y-2">
                  <InfoRow label="Cliente" value={clienteNombre} />
                  {intervencion.cliente?.telefono && (
                    <InfoRow label="Teléfono" value={intervencion.cliente.telefono} icon={Phone} />
                  )}
                  <InfoRow label="Comunidad" value={intervencion.comunidad?.nombre || '-'} />
                  <InfoRow label="Técnico" value={intervencion.tecnico?.nombre_completo || 'Sin asignar'} icon={User} />
                  {intervencion.contrato && (
                    <InfoRow label="Contrato" value={`${intervencion.contrato.numero_contrato} - ${intervencion.contrato.titulo}`} icon={FileText} />
                  )}
                </dl>
              </div>

              {intervencion.direccion && (
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Ubicación</h3>
                  <p className="text-sm text-gray-900 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {intervencion.direccion}
                    {intervencion.codigo_postal && `, ${intervencion.codigo_postal}`}
                    {intervencion.ciudad && ` ${intervencion.ciudad}`}
                  </p>
                </div>
              )}

              {intervencion.descripcion && (
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Descripción</h3>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                    {intervencion.descripcion}
                  </p>
                </div>
              )}

              {/* Costes */}
              {estado === 'completada' || estado === 'facturada' ? (
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Costes</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <CosteCard label="Materiales" value={intervencion.coste_materiales} />
                    <CosteCard label="Mano de obra" value={intervencion.coste_mano_obra} />
                    <CosteCard label="Desplazamiento" value={intervencion.coste_desplazamiento} />
                    <CosteCard label="Total" value={intervencion.coste_total} highlight />
                  </div>
                </div>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="diagnostico" className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Diagnóstico</h3>
                <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 min-h-[60px]">
                  {intervencion.diagnostico || 'Sin diagnóstico registrado'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Solución aplicada</h3>
                <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 min-h-[60px]">
                  {intervencion.solucion || 'Sin solución registrada'}
                </p>
              </div>
              {intervencion.observaciones_internas && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="text-sm font-medium text-yellow-800 mb-1">Observaciones internas</h3>
                  <p className="text-sm text-yellow-700 whitespace-pre-wrap">{intervencion.observaciones_internas}</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="materiales" className="p-6">
            <MaterialesIntervencion intervencionId={id} editable={esEditable} />
          </TabsContent>

          <TabsContent value="fotos" className="p-6">
            <FotosIntervencion
              intervencionId={id}
              fotos={intervencion.fotos || []}
              editable={esEditable}
            />
          </TabsContent>

          <TabsContent value="firma" className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FirmaDigital
                label="Firma del cliente"
                value={intervencion.firma_cliente}
                disabled={true}
              />
              <FirmaDigital
                label="Firma del técnico"
                value={intervencion.firma_tecnico}
                disabled={true}
              />
            </div>
          </TabsContent>

          <TabsContent value="historial" className="p-6">
            <IntervencionTimeline intervencion={intervencion} />
          </TabsContent>
        </Tabs>
      </Card>

      {/* Modal cerrar intervención */}
      <CerrarIntervencionModal
        open={showCerrarModal}
        intervencionId={id}
        onClose={() => setShowCerrarModal(false)}
      />

      {/* Modal facturar intervención */}
      <FacturarIntervencionModal
        open={showFacturarModal}
        onClose={() => setShowFacturarModal(false)}
        intervencion={intervencion}
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

function CosteCard({ label, value, highlight = false }) {
  return (
    <div className={`rounded-lg p-3 text-center ${highlight ? 'bg-primary-50 border border-primary-200' : 'bg-gray-50'}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-primary-700' : 'text-gray-900'}`}>
        {Number(value || 0).toFixed(2)} €
      </p>
    </div>
  )
}

function CerrarIntervencionModal({ open, intervencionId, onClose }) {
  const [diagnostico, setDiagnostico] = useState('')
  const [solucion, setSolucion] = useState('')
  const [firmaCliente, setFirmaCliente] = useState(null)
  const [firmaTecnico, setFirmaTecnico] = useState(null)
  const cerrar = useCerrarIntervencion()
  const toast = useToast()

  const handleSubmit = async () => {
    try {
      await cerrar.mutateAsync({
        id: intervencionId,
        diagnostico: diagnostico || null,
        solucion: solucion || null,
        firma_cliente: firmaCliente,
        firma_tecnico: firmaTecnico,
      })
      toast.success('Intervención cerrada correctamente')
      onClose()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Cerrar Intervención" size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Diagnóstico</label>
          <Textarea value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} rows={3} placeholder="Problema encontrado..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Solución aplicada</label>
          <Textarea value={solucion} onChange={(e) => setSolucion(e.target.value)} rows={3} placeholder="Trabajo realizado..." />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FirmaDigital label="Firma del cliente" value={firmaCliente} onChange={setFirmaCliente} />
          <FirmaDigital label="Firma del técnico" value={firmaTecnico} onChange={setFirmaTecnico} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} loading={cerrar.isPending}>
            Cerrar Intervención
          </Button>
        </div>
      </div>
    </Modal>
  )
}
