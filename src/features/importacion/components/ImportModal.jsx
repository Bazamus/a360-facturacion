/**
 * Componente ImportModal - Modal para importación rápida desde listados
 * Sistema de Facturación A360
 */

import React, { useState, useCallback, useEffect } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Download, X, AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button, Badge } from '@/components/ui'
import { ImportDropzone } from './ImportDropzone'
import { ImportPreview } from './ImportPreview'
import { ImportProgress } from './ImportProgress'
import { ImportErrors } from './ImportErrors'
import { useImportExport } from '../hooks'
import { useToast } from '@/components/ui/Toast'

const ENTIDAD_LABELS = {
  comunidades: 'Comunidades',
  clientes: 'Clientes',
  contadores: 'Contadores'
}

export function ImportModal({ 
  open, 
  onClose, 
  entidad,
  onSuccess
}) {
  const toast = useToast()
  
  const {
    estado,
    error,
    archivo,
    datosExcel,
    validacion,
    progreso,
    resultado,
    descargarPlantilla,
    cargarArchivo,
    limpiarArchivo,
    ejecutarImportacion,
    reiniciar,
    isLoading,
    isProcessing,
    isCompleted,
    canImport,
    setEntidadActiva
  } = useImportExport()

  // Sincronizar entidad cuando se abre el modal
  useEffect(() => {
    if (open && entidad) {
      setEntidadActiva(entidad)
    }
  }, [open, entidad, setEntidadActiva])

  // Limpiar al cerrar
  useEffect(() => {
    if (!open) {
      limpiarArchivo()
    }
  }, [open])

  const handleDescargarPlantilla = () => {
    const result = descargarPlantilla(entidad, true)
    if (result.success) {
      toast.success(`Plantilla descargada: ${result.fileName}`)
    } else {
      toast.error(result.error)
    }
  }

  const handleImportar = async () => {
    const result = await ejecutarImportacion()
    if (result.success) {
      const r = result.result
      toast.success(`Importación completada: ${r.created} creados, ${r.updated} actualizados`)
      // Notificar éxito al padre
      if (onSuccess) {
        onSuccess(result.result)
      }
    } else {
      toast.error(result.error)
    }
  }

  const handleClose = () => {
    if (isProcessing) return // No cerrar mientras se procesa
    reiniciar()
    onClose()
  }

  const handleNuevaImportacion = () => {
    reiniciar()
  }

  const entidadLabel = ENTIDAD_LABELS[entidad] || entidad

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Importar ${entidadLabel}`}
      description={`Carga un archivo Excel con los datos de ${entidadLabel.toLowerCase()} a importar`}
      size="xl"
    >
      <div className="space-y-4">
        {/* Estado inicial - Dropzone */}
        {!isProcessing && !isCompleted && (
          <>
            {/* Botón de plantilla */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileSpreadsheet className="w-4 h-4" />
                <span>¿Necesitas la plantilla de importación?</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDescargarPlantilla}
              >
                <Download className="w-4 h-4 mr-1" />
                Descargar
              </Button>
            </div>

            {/* Dropzone */}
            <ImportDropzone
              onFileSelect={cargarArchivo}
              file={archivo}
              onClear={limpiarArchivo}
              disabled={isLoading}
            />

            {/* Error */}
            {error && !resultado && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 text-sm">Error al procesar archivo</p>
                  <p className="text-red-600 text-sm mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Preview compacto */}
            {datosExcel && (
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-2 border-b flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Vista previa
                    </span>
                    <div className="flex items-center gap-2">
                      {validacion && (
                        <>
                          <Badge variant="success" className="text-xs">
                            {validacion.validas} válidos
                          </Badge>
                          {validacion.errores.length > 0 && (
                            <Badge variant="danger" className="text-xs">
                              {validacion.errores.length} errores
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="max-h-64 overflow-auto">
                    <ImportPreview 
                      datosExcel={datosExcel} 
                      validacion={validacion}
                      maxRows={8}
                    />
                  </div>
                </div>

                {/* Errores de validación */}
                {validacion?.errores.length > 0 && (
                  <ImportErrors errores={validacion.errores} maxVisible={3} />
                )}

                {/* Aviso de errores */}
                {validacion?.invalidas > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
                    <AlertCircle className="w-4 h-4" />
                    {validacion.invalidas} registros con errores serán omitidos
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t">
                  <Button variant="outline" onClick={limpiarArchivo}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleImportar} 
                    disabled={!canImport}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Importar {validacion?.validas || 0} registros
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Procesando */}
        {isProcessing && (
          <div className="py-8">
            <ImportProgress 
              progreso={progreso} 
              estado={estado}
              resultado={resultado}
            />
          </div>
        )}

        {/* Completado */}
        {isCompleted && resultado && (
          <div className="space-y-4">
            <div className="p-6 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-800">Importación completada</p>
                  <p className="text-sm text-green-600">
                    {resultado.created} registros creados, {resultado.updated} actualizados
                  </p>
                </div>
              </div>

              {resultado.errors?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-green-200">
                  <p className="text-sm font-medium text-amber-700 mb-2">
                    {resultado.errors.length} registros con errores fueron omitidos
                  </p>
                  <ImportErrors errores={resultado.errors} maxVisible={5} />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t">
              <Button variant="outline" onClick={handleNuevaImportacion}>
                Nueva importación
              </Button>
              <Button onClick={handleClose}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default ImportModal
