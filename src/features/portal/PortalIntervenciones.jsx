import { useEffect } from 'react'
import { usePortalIntervenciones } from '@/hooks/usePortal'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, Badge, LoadingSpinner, EmptyState } from '@/components/ui'
import { Wrench, MapPin, FileText, ExternalLink, Navigation } from 'lucide-react'

const ESTADO_VARIANTS = {
  pendiente: 'warning', asignada: 'info', programada: 'info',
  en_camino: 'primary', en_curso: 'primary',
  completada: 'success', facturada: 'success', cancelada: 'default',
}
const ESTADO_LABELS = {
  pendiente: 'Pendiente', asignada: 'Asignada', programada: 'Programada',
  en_camino: 'Técnico en camino', en_curso: 'En curso',
  completada: 'Completada', facturada: 'Facturada', cancelada: 'Cancelada',
}
const TIPO_LABELS = {
  correctiva: 'Correctiva', preventiva: 'Preventiva',
  instalacion: 'Instalación', inspeccion: 'Inspección', urgencia: 'Urgencia',
}

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
}

function formatDateTime(d) {
  return d ? new Date(d).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'
}

function mapsUrl(lat, lng, direccion) {
  if (lat && lng) return `https://www.google.com/maps?q=${lat},${lng}`
  if (direccion) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`
  return null
}

function EnCaminoBanner({ intervencion }) {
  if (intervencion.estado !== 'en_camino') return null

  const url = mapsUrl(
    intervencion.ubicacion_tecnico_lat,
    intervencion.ubicacion_tecnico_lng,
    intervencion.direccion,
  )

  return (
    <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg animate-pulse-slow">
      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
        <Navigation className="h-4 w-4 text-blue-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-blue-800">El técnico está en camino</p>
        {intervencion.ubicacion_tecnico_timestamp && (
          <p className="text-xs text-blue-600">
            Última ubicación: {formatDateTime(intervencion.ubicacion_tecnico_timestamp)}
          </p>
        )}
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
        >
          <MapPin className="h-3.5 w-3.5" />
          Ver en mapa
        </a>
      )}
    </div>
  )
}

function IntervencionCard({ intervencion: i }) {
  const isActive = !['completada', 'facturada', 'cancelada'].includes(i.estado)

  return (
    <div className="px-4 py-4 space-y-2">
      {/* Banner en camino */}
      <EnCaminoBanner intervencion={i} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
            {i.numero_parte}
          </span>
          <Badge variant={ESTADO_VARIANTS[i.estado] || 'default'} className="text-[10px] capitalize">
            {ESTADO_LABELS[i.estado] || i.estado?.replace('_', ' ')}
          </Badge>
          <span className="text-xs text-gray-400">{TIPO_LABELS[i.tipo] || i.tipo}</span>
        </div>
        <span className="text-xs text-gray-500 flex-shrink-0">{formatDate(i.fecha_solicitud)}</span>
      </div>

      <p className="text-sm font-medium text-gray-900">{i.titulo}</p>

      {i.descripcion && (
        <p className="text-xs text-gray-600">{i.descripcion}</p>
      )}

      {i.diagnostico && (
        <p className="text-xs text-gray-600">
          <span className="font-medium">Diagnóstico:</span> {i.diagnostico}
        </p>
      )}

      {i.solucion && (
        <p className="text-xs text-green-700">
          <span className="font-medium">Solución:</span> {i.solucion}
        </p>
      )}

      {/* Timeline de estados */}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {['pendiente', 'asignada', 'programada', 'en_camino', 'en_curso', 'completada'].map((estado, idx) => {
          const estados = ['pendiente', 'asignada', 'programada', 'en_camino', 'en_curso', 'completada']
          const currentIdx = estados.indexOf(i.estado)
          const isPast = idx <= currentIdx
          const isCurrent = idx === currentIdx
          return (
            <div key={estado} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isCurrent ? 'bg-primary-600 ring-2 ring-primary-200' :
                isPast ? 'bg-primary-400' : 'bg-gray-200'
              }`} />
              {idx < estados.length - 1 && (
                <div className={`w-4 h-px ${isPast && idx < currentIdx ? 'bg-primary-400' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
        <span className="text-[10px] text-gray-400 ml-1">
          {ESTADO_LABELS[i.estado] || i.estado}
        </span>
      </div>

      {/* Parte de trabajo */}
      {i.parte_trabajo_url && (
        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
          <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />
          <span className="text-xs text-green-800 flex-1">Parte de trabajo disponible</span>
          <a
            href={i.parte_trabajo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-medium"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Descargar
          </a>
        </div>
      )}
    </div>
  )
}

export function PortalIntervenciones() {
  const qc = useQueryClient()
  const { data: intervenciones, isLoading } = usePortalIntervenciones()

  // Realtime subscription para actualizaciones en vivo
  useEffect(() => {
    const channel = supabase
      .channel('portal-intervenciones-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'intervenciones' },
        () => {
          qc.invalidateQueries({ queryKey: ['portal-intervenciones'] })
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [qc])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Intervenciones</h1>
        <p className="text-sm text-gray-500">Historial y estado en tiempo real de los servicios técnicos</p>
      </div>

      <Card>
        {isLoading ? (
          <div className="py-12 flex justify-center"><LoadingSpinner size="lg" /></div>
        ) : !intervenciones?.length ? (
          <CardContent className="p-0">
            <EmptyState icon={Wrench} title="Sin intervenciones" description="No hay servicios registrados" />
          </CardContent>
        ) : (
          <div className="divide-y divide-gray-100">
            {intervenciones.map((i) => (
              <IntervencionCard key={i.id} intervencion={i} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
