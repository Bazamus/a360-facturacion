import { usePortalEquipos } from '@/hooks/usePortal'
import { Card, CardContent, Badge, LoadingSpinner, EmptyState } from '@/components/ui'
import { Cpu, Shield, Calendar } from 'lucide-react'

const TIPO_LABELS = {
  caldera: 'Caldera', grupo_presion: 'Grupo Presión', aerotermia: 'Aerotermia',
  aire_acondicionado: 'Aire Acond.', bomba_calor: 'Bomba Calor', calentador: 'Calentador',
  ascensor: 'Ascensor', sistema_solar: 'Solar', otro: 'Otro',
}

function formatDate(d) { return d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '-' }

export function PortalEquipos() {
  const { data: equipos, isLoading } = usePortalEquipos()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mis Equipos</h1>
        <p className="text-sm text-gray-500">Equipos e instalaciones registrados</p>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><LoadingSpinner size="lg" /></div>
      ) : !equipos?.length ? (
        <Card><CardContent className="p-0">
          <EmptyState icon={Cpu} title="Sin equipos" description="No tienes equipos registrados" />
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipos.map((e) => {
            const enGarantia = e.fecha_garantia_fin && new Date(e.fecha_garantia_fin) >= new Date()
            return (
              <Card key={e.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Cpu className="h-4.5 w-4.5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{e.nombre}</h3>
                        <p className="text-xs text-gray-500">{TIPO_LABELS[e.tipo] || e.tipo}</p>
                      </div>
                    </div>
                    {enGarantia && (
                      <Badge variant="success" className="text-[10px]">
                        <Shield className="h-3 w-3 mr-0.5" /> Garantía
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 space-y-1">
                    {e.marca && <p className="text-xs text-gray-600">{e.marca} {e.modelo || ''}</p>}
                    {e.numero_serie && <p className="text-xs text-gray-500 font-mono">SN: {e.numero_serie}</p>}
                    {e.proxima_revision && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" /> Próx. revisión: {formatDate(e.proxima_revision)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
