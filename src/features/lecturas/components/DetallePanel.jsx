/**
 * Panel de Detalle y Corrección Manual de Lecturas
 * Sistema de Facturación A360
 */

import React, { useState } from 'react'
import { X, Save, AlertTriangle, Check, Calendar, Gauge, User, MapPin } from 'lucide-react'
import { Button } from '@/components/ui'
import { AlertasList } from './AlertaBadge'
import { useUpdateImportacionDetalle } from '@/hooks/useLecturas'
import { useToast } from '@/components/ui/Toast'
import { formatDate, formatNumber } from '@/lib/utils'

export function DetallePanel({ fila, onClose, onUpdate }) {
  const toast = useToast()
  const updateDetalle = useUpdateImportacionDetalle()
  
  // Estado editable
  const [lecturaValor, setLecturaValor] = useState(fila.lectura_valor?.toString() || '')
  const [fechaLectura, setFechaLectura] = useState(
    fila.fecha_lectura ? new Date(fila.fecha_lectura).toISOString().split('T')[0] : ''
  )
  const [notas, setNotas] = useState(fila.notas || '')
  const [isSaving, setIsSaving] = useState(false)

  const hasChanges = 
    lecturaValor !== (fila.lectura_valor?.toString() || '') ||
    fechaLectura !== (fila.fecha_lectura ? new Date(fila.fecha_lectura).toISOString().split('T')[0] : '') ||
    notas !== (fila.notas || '')

  // Calcular nuevo consumo
  const nuevoConsumo = lecturaValor && fila.lectura_anterior != null
    ? parseFloat(lecturaValor) - fila.lectura_anterior
    : null

  const handleSave = async () => {
    if (!hasChanges) return

    setIsSaving(true)
    try {
      const nuevoValor = parseFloat(lecturaValor)
      
      // Recalcular consumo e importe
      const consumoCalculado = fila.lectura_anterior != null
        ? nuevoValor - fila.lectura_anterior
        : null
      
      const importeEstimado = consumoCalculado != null && fila.precio_unitario
        ? consumoCalculado * fila.precio_unitario
        : null

      // Determinar nuevo estado basado en el nuevo consumo
      let nuevoEstado = 'valido'
      let nuevasAlertas = []
      
      if (consumoCalculado != null) {
        if (consumoCalculado < 0) {
          nuevasAlertas.push({
            tipo: 'consumo_negativo',
            severidad: 'warning',
            mensaje: 'El consumo calculado es negativo',
            bloquea: false
          })
          nuevoEstado = 'alerta'
        } else if (consumoCalculado === 0) {
          nuevasAlertas.push({
            tipo: 'consumo_cero',
            severidad: 'info',
            mensaje: 'No hay consumo en este período',
            bloquea: false
          })
        }
      }

      await updateDetalle.mutateAsync({
        id: fila.id,
        lectura_valor: nuevoValor,
        fecha_lectura: fechaLectura,
        notas,
        consumo_calculado: consumoCalculado,
        importe_estimado: importeEstimado,
        estado: nuevoEstado,
        alertas: nuevasAlertas.length > 0 ? nuevasAlertas : null,
        correccion_manual: true,
        fecha_correccion: new Date().toISOString()
      })

      toast.success('Lectura actualizada correctamente')
      onUpdate()
    } catch (error) {
      toast.error(`Error al guardar: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'valido': return 'bg-green-100 text-green-700 border-green-200'
      case 'alerta': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'error': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Detalle de Lectura
          </h2>
          <p className="text-sm text-gray-500">Fila #{fila.fila_numero}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Estado actual */}
        <div className={`px-4 py-3 rounded-lg border ${getEstadoColor(fila.estado)}`}>
          <div className="flex items-center gap-2">
            {fila.estado === 'valido' && <Check className="w-5 h-5" />}
            {fila.estado === 'alerta' && <AlertTriangle className="w-5 h-5" />}
            {fila.estado === 'error' && <X className="w-5 h-5" />}
            <span className="font-medium capitalize">{fila.estado}</span>
          </div>
        </div>

        {/* Alertas */}
        {fila.alertas && fila.alertas.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Alertas</h3>
            <AlertasList alertas={fila.alertas} />
          </div>
        )}

        {/* Información del contador */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Gauge className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Contador</p>
              <p className="font-medium">{fila.numero_contador}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Ubicación</p>
              <p className="font-medium">
                Portal {fila.datos_originales?.portal || '—'}, 
                {' '}{fila.datos_originales?.vivienda || '—'}
              </p>
            </div>
          </div>

          {fila.cliente_id && (
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Cliente</p>
                <p className="font-medium">{fila.cliente_nombre || 'Cliente asignado'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Concepto */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Concepto</h3>
          <p className="text-lg font-semibold text-primary-600">
            {fila.concepto_codigo}
          </p>
        </div>

        {/* Lectura anterior */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Lectura anterior</p>
            <p className="text-lg font-semibold">
              {fila.lectura_anterior != null ? formatNumber(fila.lectura_anterior, 2) : '—'}
            </p>
            <p className="text-xs text-gray-400">
              {fila.fecha_lectura_anterior ? formatDate(fila.fecha_lectura_anterior) : '—'}
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600 mb-1">Consumo calculado</p>
            <p className={`text-lg font-semibold ${
              nuevoConsumo != null && nuevoConsumo < 0 ? 'text-red-600' : 'text-blue-700'
            }`}>
              {nuevoConsumo != null ? formatNumber(nuevoConsumo, 2) : '—'}
            </p>
            {nuevoConsumo != null && nuevoConsumo < 0 && (
              <p className="text-xs text-red-500">⚠️ Consumo negativo</p>
            )}
          </div>
        </div>

        {/* Campos editables */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">
            Corrección Manual
          </h3>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              <Gauge className="w-4 h-4 inline mr-1" />
              Valor de lectura
            </label>
            <input
              type="number"
              step="0.01"
              value={lecturaValor}
              onChange={(e) => setLecturaValor(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Ingresa el valor correcto"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Fecha de lectura
            </label>
            <input
              type="date"
              value={fechaLectura}
              onChange={(e) => setFechaLectura(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Notas de corrección
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Explica el motivo de la corrección..."
            />
          </div>
        </div>

        {/* Precio e importe */}
        {fila.precio_unitario && (
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500">Precio unitario</p>
                <p className="font-medium">{formatNumber(fila.precio_unitario, 4)} €</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Importe estimado</p>
                <p className="text-lg font-bold text-green-700">
                  {nuevoConsumo != null 
                    ? formatNumber(nuevoConsumo * fila.precio_unitario, 2) 
                    : '—'} €
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Marcador de corrección */}
        {fila.correccion_manual && (
          <div className="text-xs text-gray-500 bg-gray-100 rounded px-3 py-2">
            ✏️ Corregido manualmente el {formatDate(fila.fecha_correccion)}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSave}
          disabled={!hasChanges}
          isLoading={isSaving}
        >
          <Save className="w-4 h-4 mr-2" />
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}

export default DetallePanel



