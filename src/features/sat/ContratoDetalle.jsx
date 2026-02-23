import { useParams, Link, useNavigate } from 'react-router-dom'
import { useContrato } from '@/hooks'
import {
  Button, Card, Badge, LoadingSpinner, Breadcrumb,
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui'
import {
  Edit2, User, Phone, Calendar, FileText, ClipboardList,
  AlertTriangle, CheckCircle, Clock,
} from 'lucide-react'

const ESTADO_VARIANTS = { activo: 'success', borrador: 'warning', suspendido: 'danger', finalizado: 'default' }
const TIPO_LABELS = {
  mantenimiento_preventivo: 'Preventivo',
  mantenimiento_correctivo: 'Correctivo',
  mantenimiento_integral: 'Integral',
  garantia: 'Garantía',
}
const PERIODICIDAD_LABELS = {
  mensual: 'Mensual',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

const INTERVENCION_ESTADO_VARIANTS = {
  pendiente: 'warning', asignada: 'info', programada: 'info',
  en_camino: 'primary', en_curso: 'primary',
  completada: 'success', facturada: 'success', cancelada: 'default',
}

export function ContratoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: contrato, isLoading, error } = useContrato(id)

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-red-600">Error: {error.message}</div>
  if (!contrato) return <div>Contrato no encontrado</div>

  const clienteNombre = contrato.cliente
    ? `${contrato.cliente.nombre} ${contrato.cliente.apellidos}`
    : '-'

  const intervenciones = contrato.intervenciones ?? []
  const esEditable = contrato.estado !== 'finalizado'

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'SAT', href: '/sat' },
          { label: 'Contratos', href: '/sat/contratos' },
          { label: contrato.numero_contrato },
        ]}
        className="mb-4"
      />

      <div className="page-header flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">{contrato.numero_contrato}</h1>
            <Badge variant={ESTADO_VARIANTS[contrato.estado] || 'default'} className="capitalize">
              {contrato.estado}
            </Badge>
          </div>
          <p className="page-description">{contrato.titulo}</p>
        </div>
        {esEditable && (
          <Link to={`/sat/contratos/${id}/editar`}>
            <Button variant="secondary">
              <Edit2 className="h-4 w-4 mr-1" /> Editar
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <Tabs defaultValue="datos">
          <TabsList className="px-6">
            <TabsTrigger value="datos">Datos del Contrato</TabsTrigger>
            <TabsTrigger value="intervenciones">
              Intervenciones ({intervenciones.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="datos" className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Información General</h3>
                <dl className="space-y-2">
                  <InfoRow label="Tipo" value={TIPO_LABELS[contrato.tipo] || contrato.tipo} />
                  <InfoRow label="Periodicidad" value={PERIODICIDAD_LABELS[contrato.periodicidad] || contrato.periodicidad || '-'} />
                  <InfoRow label="Fecha inicio" value={formatDate(contrato.fecha_inicio)} icon={Calendar} />
                  <InfoRow label="Fecha fin" value={formatDate(contrato.fecha_fin)} icon={Calendar} />
                  {contrato.precio_mensual != null && (
                    <InfoRow label="Precio mensual" value={`${Number(contrato.precio_mensual).toFixed(2)} €`} />
                  )}
                  {contrato.precio_anual != null && (
                    <InfoRow label="Precio anual" value={`${Number(contrato.precio_anual).toFixed(2)} €`} />
                  )}
                </dl>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Asignación</h3>
                <dl className="space-y-2">
                  <InfoRow label="Cliente" value={clienteNombre} icon={User} />
                  {contrato.cliente?.telefono && (
                    <InfoRow label="Teléfono" value={contrato.cliente.telefono} icon={Phone} />
                  )}
                  <InfoRow label="Comunidad" value={contrato.comunidad?.nombre || '-'} />
                </dl>
              </div>

              {contrato.condiciones && (
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Condiciones</h3>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                    {contrato.condiciones}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="intervenciones" className="p-6">
            {intervenciones.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No hay intervenciones vinculadas a este contrato</p>
              </div>
            ) : (
              <div className="space-y-3">
                {intervenciones.map((int) => (
                  <div
                    key={int.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => navigate(`/sat/intervenciones/${int.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-medium text-gray-900">{int.numero_parte}</span>
                      <span className="text-sm text-gray-700">{int.titulo}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={INTERVENCION_ESTADO_VARIANTS[int.estado] || 'default'} className="text-xs capitalize">
                        {int.estado?.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-gray-400">{formatDate(int.fecha_solicitud)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
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
