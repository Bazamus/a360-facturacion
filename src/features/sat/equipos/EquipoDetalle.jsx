import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEquipo } from '@/hooks/useEquipos'
import {
  Button, Card, Badge, LoadingSpinner, Breadcrumb,
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui'
import { Edit2, User, Phone, Calendar, Shield, Wrench, FileText, MapPin } from 'lucide-react'

const ESTADO_VARIANTS = { activo: 'success', inactivo: 'default', en_reparacion: 'warning', retirado: 'danger' }
const TIPO_LABELS = {
  caldera: 'Caldera', grupo_presion: 'Grupo de Presión', aerotermia: 'Aerotermia',
  aire_acondicionado: 'Aire Acondicionado', bomba_calor: 'Bomba de Calor',
  calentador: 'Calentador', radiador: 'Radiador', termostato: 'Termostato',
  ascensor: 'Ascensor', sistema_solar: 'Sistema Solar', otro: 'Otro',
}
const INTERVENCION_ESTADO_VARIANTS = {
  pendiente: 'warning', asignada: 'info', programada: 'info',
  en_camino: 'primary', en_curso: 'primary',
  completada: 'success', facturada: 'success', cancelada: 'default',
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function EquipoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: equipo, isLoading, error } = useEquipo(id)

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-red-600">Error: {error.message}</div>
  if (!equipo) return <div>Equipo no encontrado</div>

  const clienteNombre = equipo.cliente ? `${equipo.cliente.nombre} ${equipo.cliente.apellidos}` : '-'
  const intervenciones = equipo.intervenciones ?? []
  const enGarantia = equipo.fecha_garantia_fin && new Date(equipo.fecha_garantia_fin) >= new Date()

  return (
    <div>
      <Breadcrumb items={[{ label: 'SAT', href: '/sat' }, { label: 'Equipos', href: '/sat/equipos' }, { label: equipo.nombre }]} className="mb-4" />

      <div className="page-header flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">{equipo.nombre}</h1>
            <Badge variant={ESTADO_VARIANTS[equipo.estado] || 'default'} className="capitalize">
              {equipo.estado?.replace('_', ' ')}
            </Badge>
            {enGarantia && (
              <Badge variant="success"><Shield className="h-3 w-3 mr-1" /> En garantía</Badge>
            )}
          </div>
          <p className="page-description">
            {TIPO_LABELS[equipo.tipo] || equipo.tipo}
            {equipo.marca && ` — ${equipo.marca}`}
            {equipo.modelo && ` ${equipo.modelo}`}
          </p>
        </div>
        <Link to={`/sat/equipos/${id}/editar`}>
          <Button variant="secondary"><Edit2 className="h-4 w-4 mr-1" /> Editar</Button>
        </Link>
      </div>

      <Card>
        <Tabs defaultValue="datos">
          <TabsList className="px-6">
            <TabsTrigger value="datos">Datos del Equipo</TabsTrigger>
            <TabsTrigger value="intervenciones">Intervenciones ({intervenciones.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="datos" className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Identificación</h3>
                <dl className="space-y-2">
                  <InfoRow label="Tipo" value={TIPO_LABELS[equipo.tipo] || equipo.tipo} />
                  <InfoRow label="Marca" value={equipo.marca || '-'} />
                  <InfoRow label="Modelo" value={equipo.modelo || '-'} />
                  <InfoRow label="Nº Serie" value={equipo.numero_serie || '-'} />
                  {equipo.qr_code && <InfoRow label="Código QR" value={equipo.qr_code} />}
                  {equipo.ubicacion_descripcion && (
                    <InfoRow label="Ubicación" value={equipo.ubicacion_descripcion} icon={MapPin} />
                  )}
                </dl>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Asignación</h3>
                <dl className="space-y-2">
                  <InfoRow label="Cliente" value={clienteNombre} icon={User} />
                  {equipo.cliente?.telefono && <InfoRow label="Teléfono" value={equipo.cliente.telefono} icon={Phone} />}
                  <InfoRow label="Comunidad" value={equipo.comunidad?.nombre || '-'} />
                  {equipo.contrato && (
                    <InfoRow label="Contrato" value={`${equipo.contrato.numero_contrato} - ${equipo.contrato.titulo}`} icon={FileText} />
                  )}
                </dl>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Fechas</h3>
                <dl className="space-y-2">
                  <InfoRow label="Instalación" value={formatDate(equipo.fecha_instalacion)} icon={Calendar} />
                  <InfoRow label="Fin garantía" value={formatDate(equipo.fecha_garantia_fin)} />
                  <InfoRow label="Última revisión" value={formatDate(equipo.ultima_revision)} />
                  <InfoRow label="Próxima revisión" value={formatDate(equipo.proxima_revision)} />
                </dl>
              </div>

              {equipo.notas && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Notas</h3>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                    {equipo.notas}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="intervenciones" className="p-6">
            {intervenciones.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Wrench className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No hay intervenciones para este equipo</p>
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
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </dt>
      <dd className="text-sm font-medium text-gray-900">{value}</dd>
    </div>
  )
}
