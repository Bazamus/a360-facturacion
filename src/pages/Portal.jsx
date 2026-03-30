import { Routes, Route, Navigate } from 'react-router-dom'
import { PortalLayout } from '@/components/layout/PortalLayout'
import { PortalDashboard } from '@/features/portal/PortalDashboard'
import { PortalFacturas } from '@/features/portal/PortalFacturas'
import { PortalTickets } from '@/features/portal/PortalTickets'
import { PortalIntervenciones } from '@/features/portal/PortalIntervenciones'
import { PortalContratos } from '@/features/portal/PortalContratos'
import { PortalEquipos } from '@/features/portal/PortalEquipos'
import { PortalPerfil } from '@/features/portal/PortalPerfil'

export function PortalPage() {
  return (
    <Routes>
      <Route element={<PortalLayout />}>
        <Route index element={<Navigate to="inicio" replace />} />
        <Route path="inicio" element={<PortalDashboard />} />
        <Route path="facturas" element={<PortalFacturas />} />
        <Route path="tickets" element={<PortalTickets />} />
        <Route path="intervenciones" element={<PortalIntervenciones />} />
        <Route path="contratos" element={<PortalContratos />} />
        <Route path="equipos" element={<PortalEquipos />} />
        <Route path="perfil" element={<PortalPerfil />} />
      </Route>
      <Route path="*" element={<Navigate to="/portal/inicio" replace />} />
    </Routes>
  )
}
