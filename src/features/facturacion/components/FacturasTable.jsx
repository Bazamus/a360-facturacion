import React, { useState, useEffect } from 'react'
import { Eye, FileText, Mail, Pencil, Trash2, CreditCard, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Button, Card, Checkbox, Badge } from '@/components/ui'
import { EstadoBadge } from './EstadoBadge'
import { formatCurrency, formatDate } from '../utils/calculos'
import { getBadgeVariant } from '@/utils/estadosCliente'

// Componente helper para encabezados ordenables
function SortableHeader({ field, currentSort, currentDirection, onSort, children, align = 'left' }) {
  const isActive = currentSort === field
  const Icon = isActive 
    ? (currentDirection === 'asc' ? ArrowUp : ArrowDown)
    : ArrowUpDown

  return (
    <th 
      className={`px-2 py-3 text-${align} text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none`}
      onClick={() => onSort?.(field)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
        <span>{children}</span>
        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
      </div>
    </th>
  )
}

export function FacturasTable({
  facturas = [],
  onView,
  onEdit,
  onDelete,
  onPDF,
  onEmail,
  onMarcarPagada,
  isLoading,
  selectedIds = [],
  onSelectionChange,
  modo = 'emision', // 'emision' | 'descarga' | 'eliminar'
  sortBy = 'fecha_factura',
  sortDirection = 'desc',
  onSort
}) {
  // Estado local para checkboxes
  const [localSelectedIds, setLocalSelectedIds] = useState(selectedIds)

  // Sincronizar con prop externa
  useEffect(() => {
    setLocalSelectedIds(selectedIds)
  }, [selectedIds])

  // Facturas seleccionables según modo
  const facturasSeleccionables = facturas.filter(f =>
    modo === 'emision'
      ? f.estado === 'borrador'
      : modo === 'descarga'
        ? ['emitida', 'pagada', 'anulada'].includes(f.estado)
        : modo === 'eliminar'
          ? ['emitida', 'pagada', 'anulada'].includes(f.estado)
          : false
  )
  const facturaIds = facturasSeleccionables.map(f => f.id)

  // ¿Todas las facturas seleccionables están seleccionadas?
  const todasSeleccionadas = facturaIds.length > 0 &&
    facturaIds.every(id => localSelectedIds.includes(id))

  // Handler para seleccionar/deseleccionar todas
  const handleSelectAll = (e) => {
    const checked = e.target.checked
    const newSelection = checked ? facturaIds : []
    setLocalSelectedIds(newSelection)
    onSelectionChange?.(newSelection)
  }

  // Handler para seleccionar/deseleccionar una fila
  const handleSelectRow = (facturaId) => (e) => {
    const checked = e.target.checked
    const newSelection = checked
      ? [...localSelectedIds, facturaId]
      : localSelectedIds.filter(id => id !== facturaId)

    setLocalSelectedIds(newSelection)
    onSelectionChange?.(newSelection)
  }
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
              {/* Columna de selección */}
              {facturasSeleccionables.length > 0 && (
                <th className="px-3 py-3 w-10">
                  <Checkbox
                    checked={todasSeleccionadas}
                    onChange={handleSelectAll}
                    aria-label="Seleccionar todas las facturas en borrador"
                  />
                </th>
              )}
              <SortableHeader 
                field="numero_completo" 
                currentSort={sortBy} 
                currentDirection={sortDirection}
                onSort={onSort}
              >
                Nº Factura
              </SortableHeader>
              
              <SortableHeader 
                field="fecha_factura" 
                currentSort={sortBy} 
                currentDirection={sortDirection}
                onSort={onSort}
              >
                Fecha
              </SortableHeader>
              
              <SortableHeader 
                field="codigo_cliente" 
                currentSort={sortBy} 
                currentDirection={sortDirection}
                onSort={onSort}
              >
                Cód.
              </SortableHeader>
              
              <SortableHeader 
                field="cliente_nombre" 
                currentSort={sortBy} 
                currentDirection={sortDirection}
                onSort={onSort}
              >
                Cliente
              </SortableHeader>
              
              <SortableHeader 
                field="cliente_estado_nombre" 
                currentSort={sortBy} 
                currentDirection={sortDirection}
                onSort={onSort}
                align="center"
              >
                Estado Cliente
              </SortableHeader>
              
              <SortableHeader 
                field="comunidad_nombre" 
                currentSort={sortBy} 
                currentDirection={sortDirection}
                onSort={onSort}
              >
                Comunidad
              </SortableHeader>
              
              <SortableHeader 
                field="total" 
                currentSort={sortBy} 
                currentDirection={sortDirection}
                onSort={onSort}
                align="right"
              >
                Total
              </SortableHeader>
              
              <SortableHeader 
                field="estado" 
                currentSort={sortBy} 
                currentDirection={sortDirection}
                onSort={onSort}
                align="center"
              >
                Estado
              </SortableHeader>
              
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {facturas.map(factura => (
              <tr key={factura.id} className="hover:bg-gray-50">
                {/* Checkbox de selección */}
                {facturasSeleccionables.length > 0 && (
                  <td className="px-3 py-3 w-10">
                    {(modo === 'emision' && factura.estado === 'borrador') ||
                     (modo === 'descarga' && ['emitida', 'pagada', 'anulada'].includes(factura.estado)) ||
                     (modo === 'eliminar' && ['emitida', 'pagada', 'anulada'].includes(factura.estado)) ? (
                      <Checkbox
                        checked={localSelectedIds.includes(factura.id)}
                        onChange={handleSelectRow(factura.id)}
                        aria-label={`Seleccionar factura ${factura.numero_completo || 'borrador'}`}
                      />
                    ) : (
                      <div className="w-4"></div>
                    )}
                  </td>
                )}
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="font-mono font-medium text-gray-900 text-sm">
                    {factura.numero_completo || '— Borrador —'}
                  </span>
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(factura.fecha_factura)}
                </td>
                <td className="px-2 py-3 whitespace-nowrap">
                  <span className="font-mono text-xs text-gray-600">
                    {factura.codigo_cliente || '-'}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <div className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                    {factura.cliente_nombre}
                  </div>
                  <div className="text-xs text-gray-500">
                    {factura.cliente_nif}
                  </div>
                </td>
                <td className="px-2 py-3 text-center">
                  {factura.cliente_estado_nombre ? (
                    <Badge variant={getBadgeVariant(factura.cliente_estado_color)} className="text-xs">
                      {factura.cliente_estado_nombre}
                    </Badge>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
                <td className="px-2 py-3">
                  <div className="text-sm text-gray-900 truncate max-w-[120px]">
                    {factura.comunidad_nombre || factura.comunidad?.nombre}
                  </div>
                  <div className="text-xs text-gray-500">
                    {factura.comunidad_codigo || factura.comunidad?.codigo}
                  </div>
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-right">
                  <span className="font-semibold text-gray-900 text-sm">
                    {formatCurrency(factura.total)}
                  </span>
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-center">
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

                    {/* Email - para emitidas y pagadas */}
                    {factura.estado === 'emitida' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEmail?.(factura)}
                        disabled={!factura.cliente_email}
                        title={
                          !factura.cliente_email
                            ? 'Cliente sin email configurado'
                            : factura.email_enviado
                              ? `Enviada el ${formatDate(factura.fecha_email_enviado)}`
                              : 'Enviar por email'
                        }
                      >
                        <Mail className={`w-4 h-4 ${
                          !factura.cliente_email
                            ? 'text-amber-500'
                            : factura.email_enviado
                              ? 'text-green-500'
                              : 'text-gray-400'
                        }`} />
                      </Button>
                    )}

                    {/* Indicador de email enviado para facturas pagadas */}
                    {factura.estado === 'pagada' && factura.email_enviado && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled
                        title={`Enviada el ${formatDate(factura.fecha_email_enviado)}`}
                      >
                        <Mail className="w-4 h-4 text-green-500" />
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



