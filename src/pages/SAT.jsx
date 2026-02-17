import { Routes, Route } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { Wrench } from 'lucide-react'

export function SATPage() {
  return (
    <Routes>
      <Route index element={
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Servicio de Asistencia Tecnica</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestion de intervenciones, partes de trabajo y contratos de mantenimiento
            </p>
          </div>
          <EmptyState
            icon={Wrench}
            title="Modulo en desarrollo"
            description="Proximamente: Intervenciones, partes de trabajo, contratos y materiales."
          />
        </div>
      } />
    </Routes>
  )
}
