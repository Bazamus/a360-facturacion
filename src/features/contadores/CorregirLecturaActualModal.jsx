import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle2, Clock, User, XCircle, FileText, RefreshCw } from 'lucide-react'
import { Modal, Button, Input, FormField, Badge, Textarea } from '@/components/ui'
import { useValidarCorreccionLecturaActual, useCorregirLecturaActual, useHistorialContadorConcepto } from '@/hooks'
import { formatNumber, formatDate, formatDateTime } from '@/lib/utils'

export function CorregirLecturaActualModal({ 
  open, 
  onClose, 
  contadorConcepto 
}) {
  const [nuevaLectura, setNuevaLectura] = useState('')
  const [motivo, setMotivo] = useState('')
  const [showHistorial, setShowHistorial] = useState(false)

  const { data: validacion, isLoading: validando } = useValidarCorreccionLecturaActual(
    open ? contadorConcepto?.id : null
  )
  const { data: historial } = useHistorialContadorConcepto(contadorConcepto?.id)
  const corregirMutation = useCorregirLecturaActual()

  // Inicializar valores cuando se abre el modal
  useEffect(() => {
    if (open && contadorConcepto) {
      setNuevaLectura(contadorConcepto.lectura_actual?.toString() || '')
      setMotivo('')
      setShowHistorial(false)
    }
  }, [open, contadorConcepto])

  const handleSubmit = async (e) => {
    e.preventDefault()

    const nuevaLecturaNum = parseFloat(nuevaLectura)
    if (nuevaLecturaNum === parseFloat(contadorConcepto.lectura_actual)) {
      onClose()
      return
    }

    try {
      await corregirMutation.mutateAsync({
        contadorConceptoId: contadorConcepto.id,
        nuevaLectura: nuevaLecturaNum,
        motivo: motivo.trim() || 'Corrección de lectura actual'
      })
      onClose()
    } catch (error) {
      console.error('Error al corregir lectura actual:', error)
    }
  }

  if (!contadorConcepto) return null

  const puedeCorregir = validacion?.puede_corregir
  const razonBloqueo = validacion?.razon_bloqueo
  const tieneFacturaBorrador = validacion?.estado_factura === 'borrador'
  const consumoPreview = nuevaLectura 
    ? (parseFloat(nuevaLectura) - (validacion?.lectura_anterior || 0)).toFixed(4)
    : null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Corregir Lectura Actual"
      size="lg"
    >
      <div className="space-y-4">
        {/* Información del concepto */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="primary">{contadorConcepto.concepto?.codigo}</Badge>
            <span className="font-medium">{contadorConcepto.concepto?.nombre}</span>
            <span className="text-sm text-gray-500">
              ({contadorConcepto.concepto?.unidad_medida})
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
            <div>
              <span className="text-gray-500">Lectura anterior:</span>{' '}
              <span className="font-medium">
                {formatNumber(validacion?.lectura_anterior || contadorConcepto.lectura_inicial)} {contadorConcepto.concepto?.unidad_medida}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Lectura actual (incorrecta):</span>{' '}
              <span className="font-medium text-red-600">
                {formatNumber(contadorConcepto.lectura_actual)} {contadorConcepto.concepto?.unidad_medida}
              </span>
            </div>
          </div>
        </div>

        {/* Estado de validación */}
        {validando ? (
          <div className="flex items-center gap-2 text-gray-600 p-3 bg-gray-50 rounded">
            <Clock className="h-4 w-4 animate-spin" />
            <span>Validando permisos de corrección...</span>
          </div>
        ) : !puedeCorregir ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex gap-3">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-red-900 mb-1">
                  No se puede corregir esta lectura
                </h4>
                <p className="text-sm text-red-700 mb-3">{razonBloqueo}</p>
                
                {validacion?.estado_factura && validacion.estado_factura !== 'sin_factura' && (
                  <div className="text-sm text-red-600">
                    <FileText className="h-4 w-4 inline mr-1" />
                    Estado de factura: <strong>{validacion.estado_factura}</strong>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-red-200">
                  <p className="text-sm text-red-700 font-medium mb-2">Opciones:</p>
                  <ul className="text-sm text-red-600 space-y-1 ml-4 list-disc">
                    <li>Anular la factura emitida antes de corregir</li>
                    <li>Contactar al administrador del sistema</li>
                    <li>Crear una lectura de ajuste manual</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Indicador de factura borrador */}
            {tieneFacturaBorrador && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Factura en borrador detectada</h4>
                    <p className="text-sm text-blue-700">
                      La factura borrador asociada se actualizará automáticamente con el nuevo valor 
                      de lectura, consumo y totales recalculados.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Estado permitido */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-900 mb-1">
                    Corrección permitida
                  </h4>
                  <p className="text-sm text-green-700">
                    {tieneFacturaBorrador 
                      ? 'Factura en borrador - se actualizará automáticamente'
                      : 'Sin factura asociada o lectura sin facturar'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Formulario de corrección */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField 
                  label="Nueva Lectura Actual" 
                  required
                  description={`Valor actual: ${formatNumber(contadorConcepto.lectura_actual)} ${contadorConcepto.concepto?.unidad_medida}`}
                >
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={nuevaLectura}
                    onChange={(e) => setNuevaLectura(e.target.value)}
                    required
                  />
                </FormField>

                <FormField 
                  label="Consumo resultante" 
                  description="Calculado automáticamente"
                >
                  <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium">
                    {consumoPreview && parseFloat(consumoPreview) >= 0 ? (
                      <span className="text-green-700">
                        {formatNumber(parseFloat(consumoPreview))} {contadorConcepto.concepto?.unidad_medida}
                      </span>
                    ) : consumoPreview && parseFloat(consumoPreview) < 0 ? (
                      <span className="text-red-600">
                        {formatNumber(parseFloat(consumoPreview))} (negativo - no válido)
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </FormField>
              </div>

              <FormField 
                label="Motivo de la corrección" 
                description="Recomendado para auditoría"
              >
                <Textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej: Error de transcripción en lectura importada"
                  rows={2}
                />
              </FormField>

              {/* Botones */}
              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHistorial(!showHistorial)}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  {showHistorial ? 'Ocultar' : 'Ver'} Historial
                  {historial?.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {historial.length}
                    </Badge>
                  )}
                </Button>

                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="secondary"
                    onClick={onClose}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    loading={corregirMutation.isPending}
                    disabled={!nuevaLectura || parseFloat(nuevaLectura) === parseFloat(contadorConcepto.lectura_actual) || (consumoPreview && parseFloat(consumoPreview) < 0)}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Corregir Lectura
                  </Button>
                </div>
              </div>
            </form>
          </>
        )}

        {/* Historial de cambios */}
        {showHistorial && historial && historial.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Historial de Cambios</h4>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {historial.map((cambio) => (
                <div 
                  key={cambio.id} 
                  className="bg-gray-50 p-3 rounded-lg text-sm"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {formatDateTime(cambio.created_at)}
                      </div>
                      {cambio.usuario_nombre && (
                        <div className="text-gray-600 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {cambio.usuario_nombre}
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary" size="sm">
                      {cambio.tipo_modificacion}
                    </Badge>
                  </div>

                  {(cambio.campo_modificado === 'lectura_actual' || cambio.campo_modificado === 'lectura_inicial' || cambio.campo_modificado === 'ambos') && (
                    <div className="ml-6 text-gray-700">
                      {cambio.campo_modificado === 'lectura_actual' ? 'Lectura actual' : 'Lectura'}: <span className="line-through text-gray-500">
                        {formatNumber(cambio.valor_anterior_lectura)}
                      </span> &rarr; <strong>{formatNumber(cambio.valor_nuevo_lectura)}</strong> {contadorConcepto.concepto?.unidad_medida}
                    </div>
                  )}

                  {(cambio.campo_modificado === 'ambos' || cambio.campo_modificado === 'fecha_lectura_inicial') && (
                    <div className="ml-6 text-gray-700">
                      Fecha: <span className="line-through text-gray-500">
                        {formatDate(cambio.valor_anterior_fecha)}
                      </span> &rarr; <strong>{formatDate(cambio.valor_nuevo_fecha)}</strong>
                    </div>
                  )}

                  {cambio.motivo && (
                    <div className="ml-6 mt-1 text-gray-600 italic">
                      &ldquo;{cambio.motivo}&rdquo;
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {showHistorial && (!historial || historial.length === 0) && (
          <div className="border-t pt-4">
            <p className="text-sm text-gray-500 text-center py-4">
              No hay historial de cambios para este concepto
            </p>
          </div>
        )}

        {/* Botón cerrar cuando está bloqueada la corrección */}
        {!puedeCorregir && !validando && (
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={onClose}>
              Cerrar
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
