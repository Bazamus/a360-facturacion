import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthContext'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { ToastProvider } from '@/components/ui/Toast'
import { MainLayout } from '@/components/layout/MainLayout'
import { LoginPage } from '@/pages/Login'
import { DashboardPage } from '@/pages/Dashboard'
import { ComunidadesPage } from '@/pages/Comunidades'
import { ClientesPage } from '@/pages/Clientes'
import { ContadoresPage } from '@/pages/Contadores'
import { LecturasPage } from '@/pages/Lecturas'
import { FacturacionPage } from '@/pages/Facturacion'
import { ReportesPage } from '@/pages/Reportes'
import { RemesasPage } from '@/pages/RemesasRouter'
import { ConfiguracionPage } from '@/pages/Configuracion'
import { ImportarExportarPage } from '@/pages/ImportarExportar'
import { NotasPage } from '@/pages/Notas'
import { RoleProtectedRoute } from '@/features/auth/RoleProtectedRoute'
import { ComunicacionesPage } from '@/pages/Comunicaciones'
import { SATPage } from '@/pages/SAT'
import { CalendarioPage } from '@/pages/Calendario'
import { PortalPage } from '@/pages/Portal'

function App() {
  return (
    <AuthProvider>
    <ToastProvider>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Rutas protegidas */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="comunidades/*" element={<ComunidadesPage />} />
          <Route path="clientes/*" element={<ClientesPage />} />
          <Route path="contadores/*" element={<ContadoresPage />} />
          <Route path="importar-exportar" element={<ImportarExportarPage />} />
          <Route path="lecturas/*" element={<LecturasPage />} />
          <Route path="facturacion/*" element={<FacturacionPage />} />
          <Route path="remesas/*" element={<RemesasPage />} />
          <Route path="reportes/*" element={<ReportesPage />} />
          <Route path="notas" element={<NotasPage />} />
          <Route path="configuracion/*" element={<ConfiguracionPage />} />

          {/* Rutas CRM / SAT - protegidas por rol */}
          <Route path="comunicaciones/*" element={
            <RoleProtectedRoute roles={['admin', 'encargado']}>
              <ComunicacionesPage />
            </RoleProtectedRoute>
          } />
          <Route path="sat/*" element={
            <RoleProtectedRoute roles={['admin', 'tecnico', 'encargado']}>
              <SATPage />
            </RoleProtectedRoute>
          } />
          <Route path="calendario/*" element={
            <RoleProtectedRoute roles={['admin', 'tecnico', 'encargado']}>
              <CalendarioPage />
            </RoleProtectedRoute>
          } />
          <Route path="portal/*" element={
            <RoleProtectedRoute roles={['admin', 'cliente']}>
              <PortalPage />
            </RoleProtectedRoute>
          } />
        </Route>
        
        {/* Ruta por defecto */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ToastProvider>
    </AuthProvider>
  )
}

export default App

