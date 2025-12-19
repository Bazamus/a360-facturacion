/**
 * Componente ValidacionTable para mostrar las lecturas agrupadas por contador
 * Sistema de Facturación A360
 */

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, AlertTriangle, XCircle, User } from 'lucide-react'
import { AlertaBadge, AlertasList } from './AlertaBadge'
import { formatDate } from '../utils/dateParsers'
import { formatNumber } from '../utils/numberParsers'

export function ValidacionTable({ 
  lecturasAgrupadas = [], 
  seleccionados = [],
  onSeleccionChange,
  onDetalleClick,
  filter = 'todos'
}) {
  const [expandidos, setExpandidos] = useState(new Set())

  // Filtrar según el estado
  const lecturasFiltradas = lecturasAgrupadas.filter(grupo => {
    if (filter === 'todos') return true
    return grupo.estado === filter
  })

  const toggleExpandir = (numeroContador) => {
    const newExpandidos = new Set(expandidos)
    if (newExpandidos.has(numeroContador)) {
      newExpandidos.delete(numeroContador)
    } else {
      newExpandidos.add(numeroContador)
    }
    setExpandidos(newExpandidos)
  }

  const toggleSeleccion = (grupo) => {
    // Solo permitir seleccionar si no tiene errores bloqueantes
    if (grupo.estado === 'error') return
    
    const ids = grupo.conceptos
      .filter(c => c.estado !== 'error')
      .map(c => c.id)
    
    const todosSeleccionados = ids.every(id => seleccionados.includes(id))
    
    if (todosSeleccionados) {
      onSeleccionChange?.(seleccionados.filter(id => !ids.includes(id)))
    } else {
      onSeleccionChange?.([...new Set([...seleccionados, ...ids])])
    }
  }

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'valido':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'alerta':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return null
    }
  }

  if (lecturasFiltradas.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No hay lecturas que mostrar</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-10 px-3 py-3"></th>
            <th className="w-10 px-3 py-3">
              <input
                type="checkbox"
                className="rounded border-gray-300"
                checked={lecturasFiltradas
                  .filter(g => g.estado !== 'error')
                  .every(g => g.conceptos
                    .filter(c => c.estado !== 'error')
                    .every(c => seleccionados.includes(c.id))
                  )
                }
                onChange={(e) => {
                  const allIds = lecturasFiltradas
                    .flatMap(g => g.conceptos)
                    .filter(c => c.estado !== 'error')
                    .map(c => c.id)
                  
                  if (e.target.checked) {
                    onSeleccionChange?.([...new Set([...seleccionados, ...allIds])])
                  } else {
                    onSeleccionChange?.(seleccionados.filter(id => !allIds.includes(id)))
                  }
                }}
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Portal
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Vivienda
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Cliente
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Contador
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Conceptos
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Estado
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {lecturasFiltradas.map((grupo) => {
            const isExpandido = expandidos.has(grupo.numero_contador)
            const grupoSeleccionado = grupo.conceptos
              .filter(c => c.estado !== 'error')
              .every(c => seleccionados.includes(c.id))
            
            return (
              <React.Fragment key={grupo.numero_contador}>
                {/* Fila principal del contador */}
                <tr 
                  className={`hover:bg-gray-50 cursor-pointer ${
                    grupo.estado === 'error' ? 'bg-red-50' : ''
                  }`}
                  onClick={() => toggleExpandir(grupo.numero_contador)}
                >
                  <td className="px-3 py-3">
                    <button className="p-1 hover:bg-gray-100 rounded">
                      {isExpandido 
                        ? <ChevronDown className="w-4 h-4 text-gray-400" />
                        : <ChevronRight className="w-4 h-4 text-gray-400" />
                      }
                    </button>
                  </td>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={grupoSeleccionado}
                      disabled={grupo.estado === 'error'}
                      onChange={() => toggleSeleccion(grupo)}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {grupo.portal || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {grupo.vivienda || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {grupo.cliente_nombre ? (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{grupo.cliente_nombre}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-medium">
                      {grupo.numero_contador}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {grupo.conceptos.map((concepto) => (
                        <ConceptoBadge 
                          key={concepto.concepto_codigo} 
                          concepto={concepto} 
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getEstadoIcon(grupo.estado)}
                  </td>
                </tr>

                {/* Filas expandidas con detalle de conceptos */}
                {isExpandido && grupo.conceptos.map((concepto) => (
                  <tr 
                    key={`${grupo.numero_contador}-${concepto.concepto_codigo}`}
                    className="bg-gray-50"
                  >
                    <td></td>
                    <td className="px-3 py-2">
                      {concepto.estado !== 'error' && (
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={seleccionados.includes(concepto.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              onSeleccionChange?.([...seleccionados, concepto.id])
                            } else {
                              onSeleccionChange?.(seleccionados.filter(id => id !== concepto.id))
                            }
                          }}
                        />
                      )}
                    </td>
                    <td colSpan="2" className="px-4 py-2">
                      <span className="text-sm font-medium text-blue-600">
                        {concepto.concepto_codigo}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        {concepto.concepto_nombre}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-sm">
                        <span className="text-gray-500">Lectura: </span>
                        <span className="font-mono font-medium">
                          {formatNumber(concepto.lectura_valor, 2)} {concepto.unidad_medida}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-sm">
                        <span className="text-gray-500">Consumo: </span>
                        <span className={`font-mono font-medium ${
                          concepto.consumo_calculado < 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {concepto.consumo_calculado >= 0 ? '+' : ''}
                          {formatNumber(concepto.consumo_calculado, 2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2" colSpan="2">
                      {concepto.alertas?.length > 0 && (
                        <AlertasList alertas={concepto.alertas} compact />
                      )}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ConceptoBadge({ concepto }) {
  const bgColor = {
    'valido': 'bg-green-100 text-green-700',
    'alerta': 'bg-amber-100 text-amber-700',
    'error': 'bg-red-100 text-red-700'
  }[concepto.estado] || 'bg-gray-100 text-gray-700'

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${bgColor}`}>
      <span>{concepto.concepto_codigo}</span>
      <span className="opacity-70">
        {concepto.consumo_calculado >= 0 ? '+' : ''}
        {formatNumber(concepto.consumo_calculado, 1)}
      </span>
    </span>
  )
}

export default ValidacionTable
