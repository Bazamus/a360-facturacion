import { Routes, Route, Navigate } from 'react-router-dom'
import Facturas from './Facturas'
import GenerarFacturas from './GenerarFacturas'
import FacturaDetalle from './FacturaDetalle'

export function FacturacionPage() {
  return (
    <Routes>
      <Route index element={<Navigate to="facturas" replace />} />
      <Route path="facturas" element={<Facturas />} />
      <Route path="facturas/:id" element={<FacturaDetalle />} />
      <Route path="facturas/:id/pdf" element={<FacturaDetalle showPdf />} />
      <Route path="generar" element={<GenerarFacturas />} />
      <Route path="enviar" element={<EnviarFacturas />} />
      <Route path="remesas" element={<Remesas />} />
    </Routes>
  )
}

function EnviarFacturas() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Enviar Facturas</h1>
      <p className="text-gray-500 mt-2">
        Envío masivo por email - Por implementar en Fase 4
      </p>
    </div>
  )
}

function Remesas() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Remesas Bancarias</h1>
      <p className="text-gray-500 mt-2">
        Generación de ficheros SEPA - Por implementar en Fase 5
      </p>
    </div>
  )
}
