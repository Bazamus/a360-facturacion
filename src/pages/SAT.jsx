import { Routes, Route, Navigate } from 'react-router-dom'
import { IntervencionesLista } from '@/features/sat/IntervencionesLista'
import { IntervencionNueva, IntervencionEditar } from '@/features/sat/IntervencionForm'
import { IntervencionDetalle } from '@/features/sat/IntervencionDetalle'
import { ContratosLista } from '@/features/sat/ContratosLista'
import { ContratoDetalle } from '@/features/sat/ContratoDetalle'
import { ContratoNuevo, ContratoEditar } from '@/features/sat/ContratoForm'
import { MaterialesCatalogo } from '@/features/sat/MaterialesCatalogo'
import { SATDashboard } from '@/features/sat/SATDashboard'
import { TecnicoDashboard } from '@/features/sat/tecnico/TecnicoDashboard'
import { TicketsLista } from '@/features/sat/tickets/TicketsLista'
import { TicketNuevo } from '@/features/sat/tickets/TicketForm'
import { TicketDetalle } from '@/features/sat/tickets/TicketDetalle'
import { EquiposLista } from '@/features/sat/equipos/EquiposLista'
import { EquipoNuevo, EquipoEditar } from '@/features/sat/equipos/EquipoForm'
import { EquipoDetalle } from '@/features/sat/equipos/EquipoDetalle'
import { PortalAdmin } from '@/features/portal/admin/PortalAdmin'
import { CargaTrabajo } from '@/features/sat/CargaTrabajo'
import { TecnicoDisponibilidad } from '@/features/sat/TecnicoDisponibilidad'
import { SLADashboard } from '@/features/sat/SLADashboard'

export function SATPage() {
  return (
    <Routes>
      <Route index element={<SATDashboard />} />

      {/* Dashboard móvil del técnico */}
      <Route path="mi-agenda" element={<TecnicoDashboard />} />

      {/* Tickets */}
      <Route path="tickets" element={<TicketsLista />} />
      <Route path="tickets/nuevo" element={<TicketNuevo />} />
      <Route path="tickets/:id" element={<TicketDetalle />} />

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

      {/* Equipos */}
      <Route path="equipos" element={<EquiposLista />} />
      <Route path="equipos/nuevo" element={<EquipoNuevo />} />
      <Route path="equipos/:id" element={<EquipoDetalle />} />
      <Route path="equipos/:id/editar" element={<EquipoEditar />} />

      {/* Materiales */}
      <Route path="materiales" element={<MaterialesCatalogo />} />

      {/* Carga trabajo y disponibilidad */}
      <Route path="carga-trabajo" element={<CargaTrabajo />} />
      <Route path="disponibilidad" element={<TecnicoDisponibilidad />} />

      {/* SLA */}
      <Route path="sla" element={<SLADashboard />} />

      {/* Gestión Portal Cliente */}
      <Route path="portal-admin" element={<PortalAdmin />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/sat" replace />} />
    </Routes>
  )
}
