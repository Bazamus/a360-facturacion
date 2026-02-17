import { Routes, Route } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { Calendar } from 'lucide-react'

export function CalendarioPage() {
  return (
    <Routes>
      <Route index element={
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
            <p className="mt-1 text-sm text-gray-500">
              Agenda de citas y planificacion de intervenciones tecnicas
            </p>
          </div>
          <EmptyState
            icon={Calendar}
            title="Modulo en desarrollo"
            description="Proximamente: Calendario con citas, agenda de tecnicos e integracion con Google Calendar."
          />
        </div>
      } />
    </Routes>
  )
}
