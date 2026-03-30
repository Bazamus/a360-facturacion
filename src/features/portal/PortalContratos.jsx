import { usePortalContratos } from '@/hooks/usePortal'
import { Card, CardContent, Badge, LoadingSpinner, EmptyState } from '@/components/ui'
import { FileText, Calendar } from 'lucide-react'

const TIPO_LABELS = { mantenimiento: 'Mantenimiento', garantia: 'Garantía', servicio_completo: 'Servicio Completo', puntual: 'Puntual' }

function formatDate(d) { return d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '-' }

export function PortalContratos() {
  const { data: contratos, isLoading } = usePortalContratos()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mis Contratos</h1>
        <p className="text-sm text-gray-500">Contratos de mantenimiento activos</p>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><LoadingSpinner size="lg" /></div>
      ) : !contratos?.length ? (
        <Card><CardContent className="p-0">
          <EmptyState icon={FileText} title="Sin contratos" description="No tienes contratos de mantenimiento activos" />
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contratos.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs text-gray-500">{c.numero_contrato}</span>
                    <h3 className="text-sm font-medium text-gray-900 mt-0.5">{c.titulo}</h3>
                  </div>
                  <Badge variant="success" className="text-xs capitalize">{c.estado}</Badge>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="font-medium">Tipo:</span> {TIPO_LABELS[c.tipo] || c.tipo}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(c.fecha_inicio)} — {formatDate(c.fecha_fin)}
                  </div>
                  {c.periodicidad && (
                    <div className="text-xs text-gray-500">
                      Periodicidad: <span className="capitalize">{c.periodicidad}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
