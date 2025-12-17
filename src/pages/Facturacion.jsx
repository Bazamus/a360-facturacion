import { Routes, Route } from 'react-router-dom'
import { Receipt, Plus } from 'lucide-react'
import { Button, Card, CardContent, EmptyState } from '@/components/ui'

export function FacturacionPage() {
  return (
    <Routes>
      <Route index element={<FacturasList />} />
      <Route path="generar" element={<GenerarFacturas />} />
      <Route path=":id" element={<FacturaDetail />} />
      <Route path="enviar" element={<EnviarFacturas />} />
      <Route path="remesas" element={<Remesas />} />
    </Routes>
  )
}

function FacturasList() {
  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Facturación</h1>
          <p className="page-description">
            Genera y gestiona las facturas de gestión energética
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Generar Facturas
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={Receipt}
            title="Sin facturas"
            description="Aún no hay facturas emitidas. Genera las primeras facturas desde las lecturas validadas."
            action={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Generar Facturas
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}

function GenerarFacturas() {
  return (
    <div>
      <h1 className="page-title">Generar Facturas</h1>
      <p className="text-gray-500 mt-2">
        Motor de facturación - Por implementar en Fase 3
      </p>
    </div>
  )
}

function FacturaDetail() {
  return (
    <div>
      <h1 className="page-title">Detalle de Factura</h1>
      <p className="text-gray-500 mt-2">
        Vista detalle - Por implementar en Fase 3
      </p>
    </div>
  )
}

function EnviarFacturas() {
  return (
    <div>
      <h1 className="page-title">Enviar Facturas</h1>
      <p className="text-gray-500 mt-2">
        Envío masivo - Por implementar en Fase 4
      </p>
    </div>
  )
}

function Remesas() {
  return (
    <div>
      <h1 className="page-title">Remesas Bancarias</h1>
      <p className="text-gray-500 mt-2">
        Generación SEPA - Por implementar en Fase 5
      </p>
    </div>
  )
}


