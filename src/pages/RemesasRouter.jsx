import { Routes, Route } from 'react-router-dom'
import Remesas from './Remesas'
import CrearRemesa from './CrearRemesa'
import RemesaDetalle from './RemesaDetalle'

export function RemesasPage() {
  return (
    <Routes>
      <Route index element={<Remesas />} />
      <Route path="crear" element={<CrearRemesa />} />
      <Route path=":id" element={<RemesaDetalle />} />
    </Routes>
  )
}

