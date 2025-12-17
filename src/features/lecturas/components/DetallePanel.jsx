import React, { useState } from 'react'
import { X, User, Hash, Calendar, DollarSign, Edit2, Save } from 'lucide-react'
import { Button, Input, Card } from '@/components/ui'
import { AlertasList } from './AlertaBadge'
import { formatNumber, formatCurrency } from '@/lib/utils'
import { formatDateForDisplay } from '../utils/excelParser'
import { useUpdateImportacionDetalle } from '@/hooks/useLecturas'
import { useToast } from '@/components/ui/Toast'

/**
 * Panel lateral con detalle de una fila
 */
export function DetallePanel({ fila, onClose, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [lecturaCorregida, setLecturaCorregida] = useState(
    fila.lectura_corregida?.toString() || fila.lectura_valor?.toString() || ''
  )
  
  const updateDetalle = useUpdateImportacionDetalle()
  const toast = useToast()

  const handleSaveCorrection = async () => {
    try {
      const valor = parseFloat(lecturaCorregida.replace(',', '.'))
      if (isNaN(valor)) {
        toast.error('El valor introducido no es válido')
        return
      }

      await updateDetalle.mutateAsync({
        id: fila.id,
        lectura_corregida: valor
      })
      
      toast.success('Lectura corregida guardada')
      setIsEditing(false)
      if (onUpdate) onUpdate()
    } catch (error) {
      toast.error('Error al guardar la corrección')
    }
  }

  if (!fila) return null

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Detalle de Lectura</h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Ubicación */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2">
            <Hash className="w-4 h-4" />
            Contador
          </h3>
          <Card className="p-4">
            <p className="font-mono text-lg font-semibold text-gray-900">
              {fila.numero_contador || '-'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Concepto: {fila.concepto?.codigo || fila.concepto_codigo || '-'}
              {fila.concepto?.nombre && ` (${fila.concepto.nombre})`}
            </p>
            {fila.concepto?.unidad_medida && (
              <p className="text-sm text-gray-500">
                Unidad: {fila.concepto.unidad_medida}
              </p>
            )}
          </Card>
        </section>

        {/* Cliente */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2">
            <User className="w-4 h-4" />
            Cliente
          </h3>
          <Card className="p-4">
            {fila.cliente ? (
              <>
                <p className="font-medium text-gray-900">
                  {fila.cliente.nombre} {fila.cliente.apellidos}
                </p>
                <p className="text-sm text-gray-600">{fila.cliente.nif}</p>
                {fila.cliente.bloqueado && (
                  <p className="text-sm text-red-600 mt-1">⚠️ Cliente bloqueado</p>
                )}
              </>
            ) : (
              <p className="text-gray-500">Sin cliente asignado</p>
            )}
          </Card>
        </section>

        {/* Lecturas */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2">
            <Calendar className="w-4 h-4" />
            Lecturas
          </h3>
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Anterior</p>
                <p className="text-lg font-semibold text-gray-700">
                  {fila.lectura_anterior != null 
                    ? formatNumber(fila.lectura_anterior, 4)
                    : '-'}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDateForDisplay(fila.fecha_lectura_anterior)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Actual</p>
                <p className="text-lg font-semibold text-gray-900">
                  {fila.lectura_corregida != null 
                    ? formatNumber(fila.lectura_corregida, 4)
                    : formatNumber(fila.lectura_valor, 4)}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDateForDisplay(fila.fecha_lectura)}
                </p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Consumo calculado:</span>
                <span className={`text-lg font-bold ${
                  fila.consumo_calculado < 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {fila.consumo_calculado != null 
                    ? formatNumber(fila.consumo_calculado, 4)
                    : '-'}
                  {fila.concepto?.unidad_medida && ` ${fila.concepto.unidad_medida}`}
                </span>
              </div>
            </div>
          </Card>
        </section>

        {/* Alertas */}
        {fila.alertas && fila.alertas.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-amber-600 mb-2">
              ⚠️ Alertas
            </h3>
            <Card className="p-4 bg-amber-50 border-amber-200">
              <div className="space-y-2">
                {fila.alertas.map((alerta, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-sm">{alerta.mensaje}</span>
                    {alerta.bloquea && (
                      <span className="text-xs text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                        Bloquea
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </section>
        )}

        {/* Estimación económica */}
        {fila.precio_unitario != null && (
          <section>
            <h3 className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2">
              <DollarSign className="w-4 h-4" />
              Estimación
            </h3>
            <Card className="p-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Precio unitario:</span>
                <span className="text-sm">{formatCurrency(fila.precio_unitario)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-gray-900">Importe estimado:</span>
                <span className="text-gray-900">{formatCurrency(fila.importe_estimado)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">+ IVA (21%)</p>
            </Card>
          </section>
        )}

        {/* Corrección de lectura */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2">
            <Edit2 className="w-4 h-4" />
            Corregir lectura
          </h3>
          <Card className="p-4">
            {isEditing ? (
              <div className="space-y-3">
                <Input
                  type="text"
                  value={lecturaCorregida}
                  onChange={(e) => setLecturaCorregida(e.target.value)}
                  placeholder="Nueva lectura"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveCorrection}
                    isLoading={updateDetalle.isPending}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Guardar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                Corregir lectura
              </Button>
            )}
          </Card>
        </section>

        {/* Datos originales */}
        <section>
          <details className="group">
            <summary className="text-sm font-medium text-gray-500 cursor-pointer">
              Ver datos originales del Excel
            </summary>
            <Card className="mt-2 p-4 bg-gray-50">
              <pre className="text-xs text-gray-600 overflow-x-auto">
                {JSON.stringify(fila.datos_originales, null, 2)}
              </pre>
            </Card>
          </details>
        </section>
      </div>
    </div>
  )
}

