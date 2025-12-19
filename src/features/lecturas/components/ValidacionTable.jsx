/**
 * Componente ValidacionTable para mostrar las lecturas agrupadas por contador
 * Sistema de Facturación A360
 */

import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, AlertTriangle, XCircle, User, Eye } from 'lucide-react'
import { AlertasList } from './AlertaBadge'
import { formatDate } from '../utils/dateParsers'
import { formatNumber } from '../utils/numberParsers'
import { getAlertaLabel } from '../utils/alertDetector'

/**
 * Agrupa los detalles por contador para la visualización
 */
function agruparPorContador(filas) {
  if (!filas || filas.length === 0) return []
  
  const grupos = {}
  
  filas.forEach(fila => {
    const key = fila.numero_contador || 'SIN_CONTADOR'
    
    if (!grupos[key]) {
      grupos[key] = {
        numero_contador: fila.numero_contador,
        portal: fila.datos_originales?.portal,
        vivienda: fila.datos_originales?.vivienda,
        cliente_nombre: fila.cliente ? `${fila.cliente.nombre} ${fila.cliente.apellidos || ''}`.trim() : null,
        cliente_id: fila.cliente_id,
        fecha_lectura: fila.fecha_lectura,
        estado: 'valido',
        conceptos: []
      }
    }
    
    grupos[key].conceptos.push({
      id: fila.id,
      concepto_codigo: fila.concepto_codigo,
      concepto_nombre: fila.concepto?.nombre || fila.concepto_codigo,
      unidad_medida: fila.concepto?.unidad_medida || '',
      lectura_valor: fila.lectura_valor,
      lectura_anterior: fila.lectura_anterior,
      consumo_calculado: fila.consumo_calculado,
      estado: fila.estado,
      alertas: fila.alertas || [],
      fila_completa: fila
    })
    
    // El estado del grupo es el más severo de sus conceptos
    if (fila.estado === 'error') {
      grupos[key].estado = 'error'
    } else if (fila.estado === 'alerta' && grupos[key].estado !== 'error') {
      grupos[key].estado = 'alerta'
    }
  })
  
  return Object.values(grupos)
}

export function ValidacionTable({ 
  filas = [],
  selectedIds = new Set(),
  onSelectChange,
  onSelectAll,
  onViewDetail,
  filter = 'todas'
}) {
  const [expandidos, setExpandidos] = useState(new Set())

  // Agrupar filas por contador
  const lecturasAgrupadas = useMemo(() => agruparPorContador(filas), [filas])

  // Convertir Set a Array para compatibilidad
  const seleccionados = useMemo(() => 
    selectedIds instanceof Set ? Array.from(selectedIds) : (selectedIds || []),
    [selectedIds]
  )

  // Filtrar según el estado
  const lecturasFiltradas = useMemo(() => {
    return lecturasAgrupadas.filter(grupo => {
      if (filter === 'todas' || filter === 'todos') return true
      if (filter === 'valido') return grupo.estado === 'valido'
      if (filter === 'alerta') return grupo.estado === 'alerta'
      if (filter === 'error') return grupo.estado === 'error'
      return true
    })
  }, [lecturasAgrupadas, filter])

  const toggleExpandir = (numeroContador) => {
    const newExpandidos = new Set(expandidos)
    if (newExpandidos.has(numeroContador)) {
      newExpandidos.delete(numeroContador)
    } else {
      newExpandidos.add(numeroContador)
    }
    setExpandidos(newExpandidos)
  }

  const handleSelectionChange = (newSelection) => {
    const newSet = new Set(newSelection)
    onSelectChange?.(newSet)
  }

  const toggleSeleccion = (grupo) => {
    // Solo permitir seleccionar si no tiene errores bloqueantes
    if (grupo.estado === 'error') return
    
    const ids = grupo.conceptos
      .filter(c => c.estado !== 'error')
      .map(c => c.id)
    
    const todosSeleccionados = ids.every(id => seleccionados.includes(id))
    
    if (todosSeleccionados) {
      handleSelectionChange(seleccionados.filter(id => !ids.includes(id)))
    } else {
      handleSelectionChange([...new Set([...seleccionados, ...ids])])
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
                    handleSelectionChange([...new Set([...seleccionados, ...allIds])])
                  } else {
                    handleSelectionChange(seleccionados.filter(id => !allIds.includes(id)))
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
                              handleSelectionChange([...seleccionados, concepto.id])
                            } else {
                              handleSelectionChange(seleccionados.filter(id => id !== concepto.id))
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
