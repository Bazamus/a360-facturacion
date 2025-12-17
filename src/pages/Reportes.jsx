import { Routes, Route } from 'react-router-dom'
import { BarChart3, FileSpreadsheet } from 'lucide-react'
import { Button, Card, CardContent, EmptyState } from '@/components/ui'

export function ReportesPage() {
  return (
    <Routes>
      <Route index element={<ReportesDashboard />} />
      <Route path="consumos" element={<ReporteConsumos />} />
      <Route path="facturacion" element={<ReporteFacturacion />} />
      <Route path="morosidad" element={<ReporteMorosidad />} />
    </Routes>
  )
}

function ReportesDashboard() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reportes</h1>
        <p className="page-description">
          Análisis y exportación de datos
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={BarChart3}
            title="Reportes en desarrollo"
            description="El sistema de reportes estará disponible una vez completadas las fases de facturación."
            action={
              <Button variant="secondary">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Ver documentación
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}

function ReporteConsumos() {
  return (
    <div>
      <h1 className="page-title">Reporte de Consumos</h1>
      <p className="text-gray-500 mt-2">
        Por implementar en Fase 5
      </p>
    </div>
  )
}

function ReporteFacturacion() {
  return (
    <div>
      <h1 className="page-title">Reporte de Facturación</h1>
      <p className="text-gray-500 mt-2">
        Por implementar en Fase 5
      </p>
    </div>
  )
}

function ReporteMorosidad() {
  return (
    <div>
      <h1 className="page-title">Reporte de Morosidad</h1>
      <p className="text-gray-500 mt-2">
        Por implementar en Fase 5
      </p>
    </div>
  )
}




