import { CheckCircle, XCircle, AlertTriangle, RotateCcw } from 'lucide-react'

const ESTADOS_RECIBO = {
  incluido: { label: 'Incluido', color: 'text-blue-600', icon: CheckCircle },
  cobrado: { label: 'Cobrado', color: 'text-green-600', icon: CheckCircle },
  rechazado: { label: 'Rechazado', color: 'text-red-600', icon: XCircle },
  devuelto: { label: 'Devuelto', color: 'text-amber-600', icon: RotateCcw }
}

export function RecibosTable({ recibos = [] }) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0)
  }

  const formatIBAN = (iban) => {
    if (!iban) return '-'
    return `${iban.slice(0, 4)}...${iban.slice(-4)}`
  }

  if (recibos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay recibos en esta remesa
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Factura</th>
            <th className="px-4 py-3 text-left font-medium">Cliente</th>
            <th className="px-4 py-3 text-left font-medium">IBAN</th>
            <th className="px-4 py-3 text-right font-medium">Importe</th>
            <th className="px-4 py-3 text-center font-medium">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {recibos.map((recibo) => {
            const estadoConfig = ESTADOS_RECIBO[recibo.estado] || ESTADOS_RECIBO.incluido
            const Icon = estadoConfig.icon

            return (
              <tr key={recibo.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="font-mono text-sm">
                    {recibo.factura?.numero_completo || recibo.referencia_recibo}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {recibo.deudor_nombre}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {formatIBAN(recibo.deudor_iban)}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(recibo.importe)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center gap-1 ${estadoConfig.color}`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-xs">{estadoConfig.label}</span>
                  </span>
                  {recibo.codigo_rechazo && (
                    <div className="text-xs text-red-500 mt-1">
                      {recibo.codigo_rechazo}: {recibo.motivo_rechazo}
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}



