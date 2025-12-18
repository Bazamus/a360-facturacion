import React from 'react'
import { Eye, FileText, Mail, Pencil, Trash2, CreditCard } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { EstadoBadge } from './EstadoBadge'
import { formatCurrency, formatDate } from '../utils/calculos'

export function FacturasTable({ 
  facturas = [], 
  onView, 
  onEdit, 
  onDelete, 
  onPDF, 
  onEmail,
  onMarcarPagada,
  isLoading 
}) {
  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-500">Cargando facturas...</span>
        </div>
      </Card>
    )
  }

  if (facturas.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No hay facturas que mostrar</p>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nº Factura
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Comunidad
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {facturas.map(factura => (
              <tr key={factura.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-mono font-medium text-gray-900">
                    {factura.numero_completo || '— Borrador —'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(factura.fecha_factura)}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">
                    {factura.cliente_nombre}
                  </div>
                  <div className="text-xs text-gray-500">
                    {factura.cliente_nif}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900">
                    {factura.comunidad_nombre || factura.comunidad?.nombre}
                  </div>
                  <div className="text-xs text-gray-500">
                    {factura.comunidad_codigo || factura.comunidad?.codigo}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(factura.total)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <EstadoBadge estado={factura.estado} size="sm" />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1">
                    {/* Ver */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView?.(factura)}
                      title="Ver detalle"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>

                    {/* PDF - solo para emitidas/pagadas */}
                    {['emitida', 'pagada', 'anulada'].includes(factura.estado) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPDF?.(factura)}
                        title="Descargar PDF"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                    )}

                    {/* Email - solo para emitidas con email */}
                    {factura.estado === 'emitida' && factura.cliente_email && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEmail?.(factura)}
                        title="Enviar por email"
                      >
                        <Mail className="w-4 h-4" />
                      </Button>
                    )}

                    {/* Editar - solo borradores */}
                    {factura.estado === 'borrador' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit?.(factura)}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}

                    {/* Marcar pagada - solo emitidas */}
                    {factura.estado === 'emitida' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onMarcarPagada?.(factura)}
                        title="Marcar como pagada"
                        className="text-green-600 hover:text-green-700"
                      >
                        <CreditCard className="w-4 h-4" />
                      </Button>
                    )}

                    {/* Eliminar - solo borradores */}
                    {factura.estado === 'borrador' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete?.(factura)}
                        title="Eliminar"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}



