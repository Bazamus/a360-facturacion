import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle2, Clock, User, XCircle } from 'lucide-react'
import { Modal, Button, Input, FormField, Badge, Textarea } from '@/components/ui'
import { useValidarEdicionLecturaInicial, useEditarLecturaInicial, useHistorialContadorConcepto } from '@/hooks'
import { formatNumber, formatDate, formatDateTime } from '@/lib/utils'

export function EditarLecturaInicialModal({ 
  open, 
  onClose, 
  contadorConcepto 
}) {
  const [nuevaLectura, setNuevaLectura] = useState('')
  const [nuevaFecha, setNuevaFecha] = useState('')
  const [motivo, setMotivo] = useState('')
  const [showHistorial, setShowHistorial] = useState(false)

  const { data: validacion, isLoading: validandoEdicion } = useValidarEdicionLecturaInicial(
    contadorConcepto?.id
  )
  const { data: historial } = useHistorialContadorConcepto(contadorConcepto?.id)
  const editarMutation = useEditarLecturaInicial()

  // Inicializar valores cuando se abre el modal
  useEffect(() => {
    if (open && contadorConcepto) {
      setNuevaLectura(contadorConcepto.lectura_inicial?.toString() || '')
      setNuevaFecha(contadorConcepto.fecha_lectura_inicial || '')
      setMotivo('')
      setShowHistorial(false)
    }
  }, [open, contadorConcepto])

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const cambios = {}
      
      // Solo enviar campos que cambiaron
      if (parseFloat(nuevaLectura) !== parseFloat(contadorConcepto.lectura_inicial)) {
        cambios.nuevaLectura = parseFloat(nuevaLectura)
      }
      if (nuevaFecha !== contadorConcepto.fecha_lectura_inicial) {
        cambios.nuevaFecha = nuevaFecha
      }

      // Si no hay cambios, no hacer nada
      if (Object.keys(cambios).length === 0) {
        onClose()
        return
      }

      await editarMutation.mutateAsync({
        contadorConceptoId: contadorConcepto.id,
        ...cambios,
        motivo: motivo.trim() || 'Sin motivo especificado'
      })

      onClose()
    } catch (error) {
      // El error se muestra automáticamente por el hook
      console.error('Error al editar lectura inicial:', error)
    }
  }

  if (!contadorConcepto) return null

  const puedeEditar = validacion?.puede_editar
  const razonBloqueo = validacion?.razon_bloqueo

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar Lectura Inicial"
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
        </div>

        {/* Estado de validación */}
        {validandoEdicion ? (
          <div className="flex items-center gap-2 text-gray-600 p-3 bg-gray-50 rounded">
            <Clock className="h-4 w-4 animate-spin" />
            <span>Validando permisos de edición...</span>
          </div>
        ) : !puedeEditar ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex gap-3">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-red-900 mb-1">
                  No se puede editar esta lectura inicial
                </h4>
                <p className="text-sm text-red-700 mb-3">{razonBloqueo}</p>
                
                <div className="space-y-1 text-sm text-red-600">
                  {validacion?.lecturas_posteriores > 0 && (
                    <div>• {validacion.lecturas_posteriores} lectura(s) posterior(es) registrada(s)</div>
                  )}
                  {validacion?.facturas_relacionadas > 0 && (
                    <div>• {validacion.facturas_relacionadas} factura(s) relacionada(s)</div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-red-200">
                  <p className="text-sm text-red-700 font-medium mb-2">Opciones:</p>
                  <ul className="text-sm text-red-600 space-y-1 ml-4 list-disc">
                    <li>Contactar al administrador del sistema</li>
                    <li>Crear una lectura de ajuste manual</li>
                    <li>Anular facturas relacionadas (si es necesario)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Advertencia */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900 mb-1">Advertencia</h4>
                  <p className="text-sm text-yellow-700">
                    Cambiar la lectura inicial afectará el cálculo de consumos futuros.
                    Asegúrese de que los nuevos valores son correctos.
                  </p>
                </div>
              </div>
            </div>

            {/* Estado actual */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-900 mb-2">
                    ✓ Permite edición
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-green-700">
                    <div>• Lecturas posteriores: <strong>0</strong></div>
                    <div>• Facturas relacionadas: <strong>0</strong></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Formulario de edición */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField 
                  label="Lectura Inicial" 
                  required
                  description={`Actual: ${formatNumber(contadorConcepto.lectura_inicial)} ${contadorConcepto.concepto?.unidad_medida}`}
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
                  label="Fecha Inicial" 
                  required
                  description={`Actual: ${formatDate(contadorConcepto.fecha_lectura_inicial)}`}
                >
                  <Input
                    type="date"
                    value={nuevaFecha}
                    onChange={(e) => setNuevaFecha(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </FormField>
              </div>

              <FormField 
                label="Motivo del cambio" 
                description="Opcional pero recomendado para auditoría"
              >
                <Textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej: Corrección de error en importación inicial"
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
                    loading={editarMutation.isPending}
                  >
                    Guardar Cambios
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

                  {cambio.campo_modificado === 'ambos' || cambio.campo_modificado === 'lectura_inicial' ? (
                    <div className="ml-6 text-gray-700">
                      Lectura: <span className="line-through text-gray-500">
                        {formatNumber(cambio.valor_anterior_lectura)}
                      </span> → <strong>{formatNumber(cambio.valor_nuevo_lectura)}</strong> {contadorConcepto.concepto?.unidad_medida}
                    </div>
                  ) : null}

                  {cambio.campo_modificado === 'ambos' || cambio.campo_modificado === 'fecha_lectura_inicial' ? (
                    <div className="ml-6 text-gray-700">
                      Fecha: <span className="line-through text-gray-500">
                        {formatDate(cambio.valor_anterior_fecha)}
                      </span> → <strong>{formatDate(cambio.valor_nuevo_fecha)}</strong>
                    </div>
                  ) : null}

                  {cambio.motivo && (
                    <div className="ml-6 mt-1 text-gray-600 italic">
                      "{cambio.motivo}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mensaje si no hay historial */}
        {showHistorial && (!historial || historial.length === 0) && (
          <div className="border-t pt-4">
            <p className="text-sm text-gray-500 text-center py-4">
              No hay historial de cambios para este concepto
            </p>
          </div>
        )}

        {/* Botón cerrar cuando está bloqueada la edición */}
        {!puedeEditar && !validandoEdicion && (
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
