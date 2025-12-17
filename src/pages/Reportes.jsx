import { Routes, Route } from 'react-router-dom'
import ReportesDashboard from './ReportesDashboard'
import GenerarReporte from './GenerarReporte'

export function ReportesPage() {
  return (
    <Routes>
      <Route index element={<ReportesDashboard />} />
      <Route path="generar" element={<GenerarReporte />} />
    </Routes>
  )
}
