import { Routes, Route } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { Globe } from 'lucide-react'

export function PortalPage() {
  return (
    <Routes>
      <Route index element={
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Portal de Cliente</h1>
            <p className="mt-1 text-sm text-gray-500">
              Acceso para clientes a sus facturas, contratos y citas
            </p>
          </div>
          <EmptyState
            icon={Globe}
            title="Modulo en desarrollo"
            description="Proximamente: Portal web donde los clientes podran consultar sus facturas, contratos, citas y comunicarse con soporte."
          />
        </div>
      } />
    </Routes>
  )
}
