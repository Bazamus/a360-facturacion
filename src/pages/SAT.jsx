import { Routes, Route, Navigate } from 'react-router-dom'
import { IntervencionesLista } from '@/features/sat/IntervencionesLista'
import { IntervencionNueva, IntervencionEditar } from '@/features/sat/IntervencionForm'
import { IntervencionDetalle } from '@/features/sat/IntervencionDetalle'
import { ContratosLista } from '@/features/sat/ContratosLista'
import { ContratoDetalle } from '@/features/sat/ContratoDetalle'
import { ContratoNuevo, ContratoEditar } from '@/features/sat/ContratoForm'
import { MaterialesCatalogo } from '@/features/sat/MaterialesCatalogo'
import { SATDashboard } from '@/features/sat/SATDashboard'

export function SATPage() {
  return (
    <Routes>
      <Route index element={<SATDashboard />} />

      {/* Intervenciones */}
      <Route path="intervenciones" element={<IntervencionesLista />} />
      <Route path="intervenciones/nueva" element={<IntervencionNueva />} />
      <Route path="intervenciones/:id" element={<IntervencionDetalle />} />
      <Route path="intervenciones/:id/editar" element={<IntervencionEditar />} />

      {/* Contratos */}
      <Route path="contratos" element={<ContratosLista />} />
      <Route path="contratos/nuevo" element={<ContratoNuevo />} />
      <Route path="contratos/:id" element={<ContratoDetalle />} />
      <Route path="contratos/:id/editar" element={<ContratoEditar />} />

      {/* Materiales */}
      <Route path="materiales" element={<MaterialesCatalogo />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/sat" replace />} />
    </Routes>
  )
}
