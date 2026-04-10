import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  useIntervencion,
  useActualizarIntervencion,
  useCerrarIntervencion,
  useMaterialesIntervencion,
  useGenerarParteTrabajo,
  useDescargarParteTrabajo,
  useEliminarIntervencion,
} from '@/hooks'
import { useAuth } from '@/features/auth/AuthContext'
import {
  Button, Card, Badge, LoadingSpinner, Breadcrumb, Modal, Textarea, Input,
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { useState } from 'react'
import {
  Edit2, Play, Truck, XCircle, RotateCcw, User, Phone, MapPin,
  Calendar, FileText, AlertTriangle, ChevronDown, Download, ExternalLink,
  CheckCircle, Clock,
} from 'lucide-react'
import { IntervencionTimeline } from './IntervencionTimeline'
import { MaterialesIntervencion } from './MaterialesIntervencion'
import { FirmaDigital } from './FirmaDigital'
import { FotosIntervencion } from './FotosIntervencion'
import { FacturarIntervencionModal } from './FacturarIntervencionModal'
import { canTransition } from '@/constants/stateMachine'
import { SLAPanel } from './SLABadge'

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
  const { data: materiales = [] } = useMaterialesIntervencion(id)
  const actualizar = useActualizarIntervencion()
  const cerrar = useCerrarIntervencion()
  const generarParte = useGenerarParteTrabajo()
  const descargarParte = useDescargarParteTrabajo()
  const eliminar = useEliminarIntervencion()
  const { isAdmin, isEncargado } = useAuth()
  const toast = useToast()
  const [showCerrarModal, setShowCerrarModal] = useState(false)
  const [showFacturarModal, setShowFacturarModal] = useState(false)
  const [showSecundarias, setShowSecundarias] = useState(false)
  const [showEliminarModal, setShowEliminarModal] = useState(false)

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-red-600">Error: {error.message}</div>
  if (!intervencion) return <div>Intervención no encontrada</div>

  const estado = intervencion.estado
  const esEditable = !['completada', 'facturada', 'cancelada'].includes(estado)

  const cambiarEstado = async (nuevoEstado, extras = {}) => {
    if (!canTransition(estado, nuevoEstado)) {
      toast.error(`Transición no permitida: ${estado} → ${nuevoEstado}`)
      return
    }
    try {
      const updates = { estado: nuevoEstado, ...extras }
      if (nuevoEstado === 'en_curso' && !intervencion.fecha_inicio) {
        updates.fecha_inicio = new Date().toISOString()
      }
      if (nuevoEstado === 'en_camino') {
        // Capturar GPS si está disponible
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              actualizar.mutate({
                id,
                estado: nuevoEstado,
                ubicacion_tecnico_lat: pos.coords.latitude,
                ubicacion_tecnico_lng: pos.coords.longitude,
                ubicacion_tecnico_timestamp: new Date().toISOString(),
                ...extras,
              })
              toast.success('En camino — ubicación registrada')
            },
            () => {
              actualizar.mutate({ id, ...updates })
              toast.success(`Estado: en camino`)
            },
          )
          return
        }
      }
      await actualizar.mutateAsync({ id, ...updates })
      toast.success(`Estado: ${nuevoEstado.replace(/_/g, ' ')}`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleGenerarParte = async () => {
    try {
      const url = await generarParte.mutateAsync({ intervencion, materiales })
      toast.success('Parte de trabajo generado y guardado')
      window.open(url, '_blank')
    } catch (err) {
      toast.error(`Error al generar parte: ${err.message}`)
    }
  }

  const handleDescargarParte = () => {
    descargarParte.mutate({ intervencion, materiales })
  }

  const clienteNombre = intervencion.cliente
    ? `${intervencion.cliente.nombre} ${intervencion.cliente.apellidos}`
    : '-'

  // Acción principal según estado (one-click CTA)
  const renderAccionPrincipal = () => {
    if (estado === 'pendiente') {
      return (
        <Button variant="primary" size="lg" onClick={() => navigate(`/sat/intervenciones/${id}/editar`)}>
          <User className="h-4 w-4 mr-2" /> Asignar Técnico
        </Button>
      )
    }
    if (estado === 'asignada' || estado === 'programada') {
      return (
        <Button variant="primary" size="lg" onClick={() => cambiarEstado('en_camino')} loading={actualizar.isPending}>
          <Truck className="h-4 w-4 mr-2" /> En Camino
        </Button>
      )
    }
    if (estado === 'en_camino') {
      return (
        <Button variant="primary" size="lg" onClick={() => cambiarEstado('en_curso')} loading={actualizar.isPending}>
          <Play className="h-4 w-4 mr-2" /> Iniciar Trabajo
        </Button>
      )
    }
    if (estado === 'en_curso') {
      return (
        <Button variant="primary" size="lg" onClick={() => setShowCerrarModal(true)}>
          <CheckCircle className="h-4 w-4 mr-2" /> Completar Trabajo
        </Button>
      )
    }
    if (estado === 'completada') {
      return (
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={handleGenerarParte}
            loading={generarParte.isPending}
          >
            <FileText className="h-4 w-4 mr-2" />
            {intervencion.parte_trabajo_url ? 'Regenerar Parte' : 'Generar Parte'}
          </Button>
          <Button variant="secondary" onClick={() => setShowFacturarModal(true)}>
            <FileText className="h-4 w-4 mr-2" /> Facturar
          </Button>
        </div>
      )
    }
    if (estado === 'cancelada') {
      return (
        <Button variant="secondary" onClick={() => cambiarEstado('pendiente')} loading={actualizar.isPending}>
          <RotateCcw className="h-4 w-4 mr-2" /> Reabrir
        </Button>
      )
    }
    return null
  }

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
      <div className="page-header flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">{intervencion.numero_parte}</h1>
            <Badge variant={ESTADO_VARIANTS[estado] || 'default'} className="capitalize">
              {estado?.replace(/_/g, ' ')}
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

        {/* Botones de acción */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Acción principal (one-click) */}
          {renderAccionPrincipal()}

          {/* Descarga parte si ya existe */}
          {intervencion.parte_trabajo_url && estado !== 'pendiente' && (
            <Button variant="secondary" size="sm" onClick={handleDescargarParte} loading={descargarParte.isPending}>
              <Download className="h-4 w-4 mr-1" /> Parte PDF
            </Button>
          )}

          {/* Acciones secundarias */}
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowSecundarias((v) => !v)}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            {showSecundarias && (
              <div
                className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[160px] py-1"
                onBlur={() => setShowSecundarias(false)}
              >
                {esEditable && (
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => { setShowSecundarias(false); navigate(`/sat/intervenciones/${id}/editar`) }}
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Editar
                  </button>
                )}
                {canTransition(estado, 'asignada') && estado !== 'pendiente' && (
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => { setShowSecundarias(false); cambiarEstado('asignada') }}
                  >
                    <Calendar className="h-3.5 w-3.5" /> Volver a asignada
                  </button>
                )}
                {canTransition(estado, 'cancelada') && (
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    onClick={() => { setShowSecundarias(false); cambiarEstado('cancelada') }}
                  >
                    <XCircle className="h-3.5 w-3.5" /> Cancelar
                  </button>
                )}
                {intervencion.parte_trabajo_url && (
                  <a
                    href={intervencion.parte_trabajo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => setShowSecundarias(false)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Ver parte online
                  </a>
                )}
              </div>
            )}
          </div>
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
                    {intervencion.ubicacion_tecnico_lat && (
                      <a
                        href={`https://maps.google.com/?q=${intervencion.ubicacion_tecnico_lat},${intervencion.ubicacion_tecnico_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-600 hover:underline text-xs flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" /> Ver en mapa
                      </a>
                    )}
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
              {(estado === 'completada' || estado === 'facturada') && (
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Costes</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <CosteCard label="Materiales" value={intervencion.coste_materiales} />
                    <CosteCard label="Mano de obra" value={intervencion.coste_mano_obra} />
                    <CosteCard label="Desplazamiento" value={intervencion.coste_desplazamiento} />
                    <CosteCard label="Total" value={intervencion.coste_total} highlight />
                  </div>
                </div>
              )}

              {/* SLA */}
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-500 mb-3">SLA</h3>
                <SLAPanel intervencionId={intervencion.id} />
              </div>

              {/* Parte de trabajo */}
              {intervencion.parte_trabajo_url && (
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Parte de Trabajo</h3>
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <FileText className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-green-800 flex-1">Parte de trabajo generado</span>
                    <a
                      href={intervencion.parte_trabajo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="secondary" size="sm">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir
                      </Button>
                    </a>
                    <Button variant="secondary" size="sm" onClick={handleDescargarParte}>
                      <Download className="h-3.5 w-3.5 mr-1" /> Descargar
                    </Button>
                  </div>
                </div>
              )}
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
        intervencion={intervencion}
        materiales={materiales}
        onClose={() => setShowCerrarModal(false)}
      />

      {/* Modal facturar intervención */}
      <FacturarIntervencionModal
        open={showFacturarModal}
        onClose={() => setShowFacturarModal(false)}
        intervencion={intervencion}
      />

      {/* Zona de peligro — solo admin/encargado, solo estados eliminables */}
      {(isAdmin || isEncargado) && ['pendiente', 'cancelada'].includes(intervencion.estado) && (
        <div className="mt-8 border border-red-200 rounded-xl p-4 bg-red-50">
          <h3 className="text-sm font-semibold text-red-800 mb-1">Zona de peligro</h3>
          <p className="text-xs text-red-600 mb-3">
            Elimina permanentemente esta intervención y todos sus datos asociados. Solo disponible en estado <strong>pendiente</strong> o <strong>cancelada</strong>.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEliminarModal(true)}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <XCircle className="h-4 w-4 mr-1.5" />
            Eliminar intervención
          </Button>
        </div>
      )}

      {/* Modal confirmación eliminación */}
      <Modal open={showEliminarModal} onClose={() => setShowEliminarModal(false)} title="Eliminar intervención" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-semibold mb-1">Esta acción es irreversible</p>
              <p>Se eliminarán permanentemente la intervención <strong>{intervencion.numero_parte}</strong> y todos sus datos: materiales, historial y documentos asociados.</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={() => setShowEliminarModal(false)}>Cancelar</Button>
            <Button
              variant="primary"
              className="bg-red-600 hover:bg-red-700 border-red-600"
              loading={eliminar.isPending}
              onClick={async () => {
                try {
                  await eliminar.mutateAsync(id)
                  toast.success('Intervención eliminada')
                  navigate('/sat/intervenciones')
                } catch (err) {
                  toast.error(err.message)
                  setShowEliminarModal(false)
                }
              }}
            >
              Eliminar permanentemente
            </Button>
          </div>
        </div>
      </Modal>
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

function formatLocalDatetime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function CerrarIntervencionModal({ open, intervencionId, intervencion, materiales, onClose }) {
  const now = new Date()
  const [diagnostico, setDiagnostico] = useState('')
  const [solucion, setSolucion] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [firmaCliente, setFirmaCliente] = useState(null)
  const [firmaTecnico, setFirmaTecnico] = useState(null)
  const cerrar = useCerrarIntervencion()
  const generarParte = useGenerarParteTrabajo()
  const toast = useToast()

  // Pre-rellenar fechas cuando se abre el modal
  useState(() => {
    if (!open) return
    setDiagnostico(intervencion?.diagnostico || '')
    setSolucion(intervencion?.solucion || '')
    setFechaInicio(intervencion?.fecha_inicio ? formatLocalDatetime(intervencion.fecha_inicio) : formatLocalDatetime(now))
    setFechaFin(formatLocalDatetime(now))
    setFirmaCliente(null)
    setFirmaTecnico(null)
  })

  const handleSubmit = async () => {
    if (!fechaInicio || !fechaFin) {
      toast.error('Las fechas de inicio y fin son obligatorias')
      return
    }
    if (new Date(fechaFin) < new Date(fechaInicio)) {
      toast.error('La fecha de fin no puede ser anterior a la de inicio')
      return
    }
    try {
      await cerrar.mutateAsync({
        id: intervencionId,
        diagnostico: diagnostico || null,
        solucion: solucion || null,
        firma_cliente: firmaCliente,
        firma_tecnico: firmaTecnico,
        fecha_inicio: new Date(fechaInicio).toISOString(),
        fecha_fin: new Date(fechaFin).toISOString(),
      })

      // Auto-generar parte de trabajo al cerrar
      try {
        const intervencionActualizada = {
          ...intervencion,
          diagnostico: diagnostico || intervencion.diagnostico,
          solucion: solucion || intervencion.solucion,
          firma_cliente: firmaCliente || intervencion.firma_cliente,
          firma_tecnico: firmaTecnico || intervencion.firma_tecnico,
          fecha_inicio: new Date(fechaInicio).toISOString(),
          fecha_fin: new Date(fechaFin).toISOString(),
        }
        await generarParte.mutateAsync({ intervencion: intervencionActualizada, materiales })
        toast.success('Intervención completada y parte de trabajo generado')
      } catch (_) {
        toast.success('Intervención completada correctamente')
      }

      onClose()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Completar Intervención" size="xl">
      <div className="space-y-5">

        {/* 1. Fechas */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary-600" /> Tiempos de trabajo
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Inicio trabajo *</label>
              <Input type="datetime-local" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fin trabajo *</label>
              <Input type="datetime-local" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
          </div>
          {fechaInicio && fechaFin && new Date(fechaFin) > new Date(fechaInicio) && (
            <p className="text-xs text-gray-500 mt-1">
              Duración: {Math.round((new Date(fechaFin) - new Date(fechaInicio)) / 60000)} min
            </p>
          )}
        </div>

        {/* 2. Diagnóstico y Solución */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Diagnóstico</label>
            <Textarea value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} rows={3} placeholder="Problema encontrado..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Solución aplicada</label>
            <Textarea value={solucion} onChange={(e) => setSolucion(e.target.value)} rows={3} placeholder="Trabajo realizado..." />
          </div>
        </div>

        {/* 3. Materiales (solo lectura) */}
        {materiales.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Materiales utilizados</h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <MaterialesIntervencion intervencionId={intervencionId} editable={false} compact />
            </div>
          </div>
        )}

        {/* 4. Fotos */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Fotos del trabajo <span className="text-xs font-normal text-gray-400">(máx. 4)</span></h4>
          <FotosIntervencion
            intervencionId={intervencionId}
            fotos={intervencion?.fotos || []}
            editable
            maxFotos={4}
          />
        </div>

        {/* 5. Firmas */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Firmas de conformidad</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FirmaDigital label="Firma del cliente" value={firmaCliente} onChange={setFirmaCliente} />
            <FirmaDigital label="Firma del técnico" value={firmaTecnico} onChange={setFirmaTecnico} />
          </div>
        </div>

        <p className="text-xs text-gray-500">Al completar, se generará automáticamente el parte de trabajo en PDF incluyendo fotos y firmas.</p>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={cerrar.isPending || generarParte.isPending}
          >
            <CheckCircle className="h-4 w-4 mr-2" /> Completar y Generar Parte
          </Button>
        </div>
      </div>
    </Modal>
  )
}
