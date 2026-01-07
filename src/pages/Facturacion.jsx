import { Routes, Route, Navigate } from 'react-router-dom'
import Facturas from './Facturas'
import GenerarFacturas from './GenerarFacturas'
import FacturaDetalle from './FacturaDetalle'
import FacturaEditar from './FacturaEditar'
import EnviarFacturas from './EnviarFacturas'
import EnviosDashboard from './EnviosDashboard'
import HistorialEnvios from './HistorialEnvios'

export function FacturacionPage() {
  return (
    <Routes>
      <Route index element={<Navigate to="facturas" replace />} />
      <Route path="facturas" element={<Facturas />} />
      <Route path="facturas/:id" element={<FacturaDetalle />} />
      <Route path="facturas/:id/pdf" element={<FacturaDetalle showPdf />} />
      <Route path="facturas/:id/editar" element={<FacturaEditar />} />
      <Route path="generar" element={<GenerarFacturas />} />
      <Route path="enviar" element={<EnviarFacturas />} />
      <Route path="envios" element={<EnviosDashboard />} />
      <Route path="envios/historial" element={<HistorialEnvios />} />
      <Route path="remesas" element={<Remesas />} />
    </Routes>
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
