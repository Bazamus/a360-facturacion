import { usePortalIntervenciones } from '@/hooks/usePortal'
import { Card, CardContent, Badge, LoadingSpinner, EmptyState } from '@/components/ui'
import { Wrench } from 'lucide-react'

const ESTADO_VARIANTS = {
  pendiente: 'warning', asignada: 'info', programada: 'info',
  en_camino: 'primary', en_curso: 'primary',
  completada: 'success', facturada: 'success', cancelada: 'default',
}
const TIPO_LABELS = { correctiva: 'Correctiva', preventiva: 'Preventiva', instalacion: 'Instalación', inspeccion: 'Inspección', urgencia: 'Urgencia' }

function formatDate(d) { return d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '-' }

export function PortalIntervenciones() {
  const { data: intervenciones, isLoading } = usePortalIntervenciones()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Intervenciones</h1>
        <p className="text-sm text-gray-500">Historial de servicios técnicos realizados</p>
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
              <div key={i.id} className="px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-500">{i.numero_parte}</span>
                    <Badge variant={ESTADO_VARIANTS[i.estado] || 'default'} className="text-[10px] capitalize">
                      {i.estado?.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-gray-400">{TIPO_LABELS[i.tipo] || i.tipo}</span>
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(i.fecha_solicitud)}</span>
                </div>
                <p className="text-sm font-medium text-gray-900 mt-1">{i.titulo}</p>
                {i.diagnostico && (
                  <p className="text-xs text-gray-600 mt-1"><span className="font-medium">Diagnóstico:</span> {i.diagnostico}</p>
                )}
                {i.solucion && (
                  <p className="text-xs text-green-700 mt-0.5"><span className="font-medium">Solución:</span> {i.solucion}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
