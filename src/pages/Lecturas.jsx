import { Routes, Route } from 'react-router-dom'
import ImportarLecturas from './ImportarLecturas'
import ValidarLecturas from './ValidarLecturas'
import HistorialImportaciones from './HistorialImportaciones'

export function LecturasPage() {
  return (
    <Routes>
      <Route index element={<HistorialImportaciones />} />
      <Route path="importar" element={<ImportarLecturas />} />
      <Route path="validar/:id" element={<ValidarLecturas />} />
      <Route path="historial" element={<HistorialImportaciones />} />
    </Routes>
  )
}
