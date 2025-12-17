import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { Checkbox } from '../../../components/ui'

export function FacturasRemesaTable({ 
  facturas = [], 
  seleccionadas = [], 
  onSeleccionar,
  onSeleccionarTodas 
}) {
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

  const formatIBAN = (iban) => {
    if (!iban) return '-'
    return `${iban.slice(0, 4)}...${iban.slice(-4)}`
  }

  const facturasValidas = facturas.filter(f => f.estado_remesa === 'valido')
  const todasSeleccionadas = facturasValidas.length > 0 && 
    facturasValidas.every(f => seleccionadas.includes(f.id))

  const handleSeleccionarTodas = (checked) => {
    if (checked) {
      onSeleccionarTodas?.(facturasValidas.map(f => f.id))
    } else {
      onSeleccionarTodas?.([])
    }
  }

  const handleSeleccionar = (facturaId, checked) => {
    if (checked) {
      onSeleccionar?.([...seleccionadas, facturaId])
    } else {
      onSeleccionar?.(seleccionadas.filter(id => id !== facturaId))
    }
  }

  const renderEstadoIcon = (estadoRemesa) => {
    switch (estadoRemesa) {
      case 'valido':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'sin_mandato':
        return <XCircle className="w-4 h-4 text-red-500" title="Sin mandato SEPA" />
      case 'mandato_inactivo':
        return <AlertTriangle className="w-4 h-4 text-amber-500" title="Mandato inactivo" />
      case 'sin_iban':
        return <XCircle className="w-4 h-4 text-red-500" title="Sin IBAN" />
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-400" />
    }
  }

  if (facturas.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <p className="text-gray-500">No hay facturas pendientes de remesa</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-4 py-3 text-left">
              <Checkbox 
                checked={todasSeleccionadas}
                onChange={(e) => handleSeleccionarTodas(e.target.checked)}
              />
            </th>
            <th className="px-4 py-3 text-left font-medium">Factura</th>
            <th className="px-4 py-3 text-left font-medium">Cliente</th>
            <th className="px-4 py-3 text-left font-medium">IBAN</th>
            <th className="px-4 py-3 text-right font-medium">Importe</th>
            <th className="px-4 py-3 text-center font-medium">Valid.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {facturas.map((factura) => {
            const esValida = factura.estado_remesa === 'valido'
            const estaSeleccionada = seleccionadas.includes(factura.id)

            return (
              <tr 
                key={factura.id}
                className={`${esValida ? 'hover:bg-gray-50' : 'bg-gray-50 opacity-60'}`}
              >
                <td className="px-4 py-3">
                  <Checkbox
                    checked={estaSeleccionada}
                    disabled={!esValida}
                    onChange={(e) => handleSeleccionar(factura.id, e.target.checked)}
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-sm">{factura.numero_completo}</span>
                  <div className="text-xs text-gray-500">{formatDate(factura.fecha_factura)}</div>
                </td>
                <td className="px-4 py-3">
                  <div>{factura.cliente_nombre}</div>
                  <div className="text-xs text-gray-500">{factura.cliente_nif}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {esValida ? formatIBAN(factura.mandato_iban) : (
                    <span className="text-red-600">
                      {factura.estado_remesa === 'sin_mandato' && 'Sin mandato'}
                      {factura.estado_remesa === 'sin_iban' && 'Sin IBAN'}
                      {factura.estado_remesa === 'mandato_inactivo' && 'Inactivo'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(factura.total)}
                </td>
                <td className="px-4 py-3 text-center">
                  {renderEstadoIcon(factura.estado_remesa)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

