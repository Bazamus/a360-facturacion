import { useNavigate } from 'react-router-dom'
import { Eye, Download } from 'lucide-react'
import { EstadoRemesaBadge } from './EstadoRemesaBadge'
import { Button } from '../../../components/ui'

export function RemesasTable({ remesas = [], onDescargar }) {
  const navigate = useNavigate()

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0)
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('es-ES')
  }

  if (remesas.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <p className="text-gray-500">No hay remesas que mostrar</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Referencia</th>
            <th className="px-4 py-3 text-left font-medium">Fecha Cobro</th>
            <th className="px-4 py-3 text-right font-medium">Recibos</th>
            <th className="px-4 py-3 text-right font-medium">Importe</th>
            <th className="px-4 py-3 text-center font-medium">Estado</th>
            <th className="px-4 py-3 text-right font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {remesas.map((remesa) => (
            <tr 
              key={remesa.id} 
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => navigate(`/remesas/${remesa.id}`)}
            >
              <td className="px-4 py-3">
                <span className="font-mono text-sm">{remesa.referencia}</span>
              </td>
              <td className="px-4 py-3 text-gray-600">
                {formatDate(remesa.fecha_cobro)}
              </td>
              <td className="px-4 py-3 text-right">
                {remesa.num_recibos}
              </td>
              <td className="px-4 py-3 text-right font-medium">
                {formatCurrency(remesa.importe_total)}
              </td>
              <td className="px-4 py-3 text-center">
                <EstadoRemesaBadge estado={remesa.estado} />
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/remesas/${remesa.id}`)}
                    title="Ver detalle"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  {remesa.fichero_xml && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDescargar?.(remesa)}
                      title="Descargar XML"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}



