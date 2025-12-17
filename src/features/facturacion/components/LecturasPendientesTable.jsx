import React, { useState, useMemo } from 'react'
import { Card, Checkbox } from '@/components/ui'
import { AlertTriangle } from 'lucide-react'
import { formatCurrency, formatDate, formatCantidad } from '../utils/calculos'

export function LecturasPendientesTable({ 
  lecturas = [], 
  selectedIds = [], 
  onSelectionChange,
  groupByContador = true 
}) {
  // Agrupar por contador si está habilitado
  const grupos = useMemo(() => {
    if (!groupByContador) {
      return [{ 
        key: 'all', 
        contador: null, 
        lecturas 
      }]
    }

    const grouped = {}
    lecturas.forEach(l => {
      const key = l.contador_id
      if (!grouped[key]) {
        grouped[key] = {
          key,
          contador_id: l.contador_id,
          contador_numero_serie: l.contador_numero_serie,
          cliente_nombre: l.cliente_nombre,
          cliente_nif: l.cliente_nif,
          ubicacion_nombre: l.ubicacion_nombre,
          agrupacion_nombre: l.agrupacion_nombre,
          comunidad_nombre: l.comunidad_nombre,
          comunidad_codigo: l.comunidad_codigo,
          lecturas: []
        }
      }
      grouped[key].lecturas.push(l)
    })

    return Object.values(grouped)
  }, [lecturas, groupByContador])

  // Calcular totales
  const totales = useMemo(() => {
    const selected = lecturas.filter(l => selectedIds.includes(l.id))
    return {
      total: selected.length,
      contadores: new Set(selected.map(l => l.contador_id)).size,
      importe: selected.reduce((sum, l) => sum + (Number(l.importe_estimado) || 0), 0)
    }
  }, [lecturas, selectedIds])

  // Toggle selección de todas
  const allSelected = lecturas.length > 0 && selectedIds.length === lecturas.length
  const someSelected = selectedIds.length > 0 && selectedIds.length < lecturas.length

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange([])
    } else {
      onSelectionChange(lecturas.map(l => l.id))
    }
  }

  // Toggle selección de un grupo
  const toggleGroup = (grupo) => {
    const grupoIds = grupo.lecturas.map(l => l.id)
    const allGroupSelected = grupoIds.every(id => selectedIds.includes(id))
    
    if (allGroupSelected) {
      onSelectionChange(selectedIds.filter(id => !grupoIds.includes(id)))
    } else {
      const newIds = [...new Set([...selectedIds, ...grupoIds])]
      onSelectionChange(newIds)
    }
  }

  // Toggle selección individual
  const toggleOne = (id) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  if (lecturas.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">No hay lecturas pendientes de facturar</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Cabecera con selección global */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={toggleAll}
          />
          <span className="text-sm text-gray-600">
            Seleccionar todas ({lecturas.length} lecturas)
          </span>
        </div>
        
        {selectedIds.length > 0 && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">{totales.contadores}</span> contadores |{' '}
            <span className="font-medium">{totales.total}</span> lecturas |{' '}
            <span className="font-semibold text-blue-600">{formatCurrency(totales.importe)}</span> estimado
          </div>
        )}
      </div>

      {/* Tabla agrupada */}
      <Card className="overflow-hidden divide-y">
        {grupos.map(grupo => {
          const grupoIds = grupo.lecturas.map(l => l.id)
          const allGroupSelected = grupoIds.every(id => selectedIds.includes(id))
          const someGroupSelected = grupoIds.some(id => selectedIds.includes(id)) && !allGroupSelected
          const sinCliente = !grupo.cliente_nombre

          return (
            <div key={grupo.key}>
              {/* Cabecera del grupo */}
              {groupByContador && (
                <div className={`px-4 py-3 flex items-center gap-3 ${sinCliente ? 'bg-amber-50' : 'bg-gray-50'}`}>
                  <Checkbox
                    checked={allGroupSelected}
                    indeterminate={someGroupSelected}
                    onChange={() => toggleGroup(grupo)}
                    disabled={sinCliente}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{grupo.contador_numero_serie}</span>
                      {sinCliente && (
                        <span className="flex items-center gap-1 text-amber-600 text-xs bg-amber-100 px-2 py-0.5 rounded">
                          <AlertTriangle className="w-3 h-3" />
                          Sin cliente asignado
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {grupo.cliente_nombre || 'Sin ocupante'} · {grupo.agrupacion_nombre} {grupo.ubicacion_nombre}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium">
                      {formatCurrency(
                        grupo.lecturas.reduce((sum, l) => sum + (Number(l.importe_estimado) || 0), 0)
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {grupo.lecturas.length} lectura{grupo.lecturas.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              )}

              {/* Filas de lecturas */}
              <table className="w-full">
                <tbody className="divide-y divide-gray-100">
                  {grupo.lecturas.map(lectura => {
                    const isSelected = selectedIds.includes(lectura.id)
                    const disabled = !lectura.cliente_nombre

                    return (
                      <tr 
                        key={lectura.id}
                        className={`
                          ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                          ${disabled ? 'opacity-60' : ''}
                        `}
                      >
                        <td className="w-12 px-4 py-2">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleOne(lectura.id)}
                            disabled={disabled}
                          />
                        </td>
                        <td className="px-2 py-2 text-sm">
                          <span className="font-medium">{lectura.concepto_codigo}</span>
                          <span className="text-gray-500 ml-1">({lectura.concepto_nombre})</span>
                        </td>
                        <td className="px-2 py-2 text-sm text-right">
                          {formatCantidad(lectura.consumo, lectura.unidad_medida, 2)}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-500">
                          {formatDate(lectura.fecha_lectura)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-medium">
                          {formatCurrency(lectura.importe_estimado)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })}
      </Card>
    </div>
  )
}

