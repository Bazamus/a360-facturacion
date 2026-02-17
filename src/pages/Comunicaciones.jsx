import { Routes, Route } from 'react-router-dom'
import { ComunicacionesDashboard } from '@/features/comunicaciones/ComunicacionesDashboard'
import { PlantillasList } from '@/features/comunicaciones/PlantillasList'
import { CanalesConfig } from '@/features/comunicaciones/CanalesConfig'

export function ComunicacionesPage() {
  return (
    <Routes>
      <Route index element={<ComunicacionesDashboard />} />
      <Route path="plantillas" element={<PlantillasList />} />
      <Route path="configuracion" element={<CanalesConfig />} />
    </Routes>
  )
}
