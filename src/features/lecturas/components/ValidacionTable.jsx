import React, { useState, useMemo } from 'react'
import { Check, AlertTriangle, XCircle, Eye, Edit2 } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { AlertasList } from './AlertaBadge'
import { formatDateForDisplay } from '../utils/excelParser'

const estadoIcons = {
  valido: { icon: Check, color: 'text-green-500', bg: 'bg-green-50' },
  alerta: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' },
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
  confirmado: { icon: Check, color: 'text-blue-500', bg: 'bg-blue-50' },
  descartado: { icon: XCircle, color: 'text-gray-400', bg: 'bg-gray-50' }
}

/**
 * Tabla de validación de lecturas
 */
export function ValidacionTable({ 
  filas, 
  selectedIds,
  onSelectChange,
  onSelectAll,
  onViewDetail,
  filter = 'todas'
}) {
  // Filtrar filas
  const filteredFilas = useMemo(() => {
    if (filter === 'todas') return filas
    return filas.filter(f => f.estado === filter)
  }, [filas, filter])

  // Filas seleccionables (válidas o con alertas no bloqueantes)
  const selectableFilas = useMemo(() => {
    return filteredFilas.filter(f => 
      f.estado === 'valido' || 
      (f.estado === 'alerta' && !f.alertas?.some(a => a.bloquea))
    )
  }, [filteredFilas])

  const allSelected = selectableFilas.length > 0 && 
    selectableFilas.every(f => selectedIds.has(f.id))

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectAll(new Set())
    } else {
      onSelectAll(new Set(selectableFilas.map(f => f.id)))
    }
  }

  const handleSelectRow = (id, canSelect) => {
    if (!canSelect) return
    
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    onSelectChange(newSelected)
  }

  if (filteredFilas.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay lecturas que coincidan con el filtro
      </div>
    )
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              #
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Contador
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Concepto
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Cliente
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Lectura
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
              Consumo
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Fecha
            </th>
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Estado
            </th>
            <th className="px-3 py-3"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredFilas.map((fila) => {
            const estadoConfig = estadoIcons[fila.estado] || estadoIcons.error
            const Icon = estadoConfig.icon
            const canSelect = fila.estado === 'valido' || 
              (fila.estado === 'alerta' && !fila.alertas?.some(a => a.bloquea))
            const isSelected = selectedIds.has(fila.id)

            return (
              <tr 
                key={fila.id} 
                className={cn(
                  'hover:bg-gray-50 transition-colors',
                  isSelected && 'bg-blue-50',
                  fila.estado === 'descartado' && 'opacity-50'
                )}
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectRow(fila.id, canSelect)}
                    disabled={!canSelect}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                </td>
                <td className="px-3 py-3 text-sm text-gray-500">
                  {fila.fila_numero}
                </td>
                <td className="px-3 py-3">
                  <div className="text-sm font-medium text-gray-900">
                    {fila.numero_contador || '-'}
                  </div>
                  {fila.contador && (
                    <div className="text-xs text-gray-500">
                      {fila.contador.ubicacion_id ? 'Encontrado' : ''}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span className="text-sm text-gray-900">
                    {fila.concepto?.codigo || fila.concepto_codigo || '-'}
                  </span>
                </td>
                <td className="px-3 py-3">
                  {fila.cliente ? (
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {fila.cliente.nombre} {fila.cliente.apellidos}
                      </div>
                      <div className="text-xs text-gray-500">
                        {fila.cliente.nif}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {fila.lectura_corregida != null 
                      ? formatNumber(fila.lectura_corregida, 4)
                      : formatNumber(fila.lectura_valor, 4)}
                  </div>
                  {fila.lectura_corregida != null && (
                    <div className="text-xs text-gray-500 line-through">
                      {formatNumber(fila.lectura_valor, 4)}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  <span className={cn(
                    'text-sm font-medium',
                    fila.consumo_calculado < 0 ? 'text-red-600' : 'text-gray-900'
                  )}>
                    {fila.consumo_calculado != null 
                      ? formatNumber(fila.consumo_calculado, 4) 
                      : '-'}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm text-gray-900">
                  {formatDateForDisplay(fila.fecha_lectura)}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col items-center gap-1">
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs',
                      estadoConfig.bg, estadoConfig.color
                    )}>
                      <Icon className="w-3 h-3" />
                      {fila.estado}
                    </span>
                    {fila.alertas && fila.alertas.length > 0 && (
                      <AlertasList alertas={fila.alertas} compact />
                    )}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => onViewDetail(fila)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Ver detalle"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

