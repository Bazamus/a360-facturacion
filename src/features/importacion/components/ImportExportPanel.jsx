/**
 * Componente ImportExportPanel - Panel principal con tabs
 * Sistema de Facturación A360
 */

import React from 'react'
import { Building2, Users, Gauge, Download, Upload, FileSpreadsheet } from 'lucide-react'
import { Button, Card, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import { ImportDropzone } from './ImportDropzone'
import { ImportPreview } from './ImportPreview'
import { ImportProgress } from './ImportProgress'
import { ImportErrors } from './ImportErrors'
import { ExportButton } from './ExportButton'
import { useImportExport } from '../hooks'
import { useToast } from '@/components/ui/Toast'

const ENTIDADES = [
  { id: 'comunidades', label: 'Comunidades', icon: Building2 },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'contadores', label: 'Contadores', icon: Gauge }
]

export function ImportExportPanel() {
  const toast = useToast()
  const {
    estado,
    entidadActiva,
    setEntidadActiva,
    error,
    archivo,
    datosExcel,
    validacion,
    progreso,
    resultado,
    descargarPlantilla,
    exportarEntidad,
    cargarArchivo,
    limpiarArchivo,
    ejecutarImportacion,
    reiniciar,
    isLoading,
    isProcessing,
    isCompleted,
    canImport
  } = useImportExport()

  const handleDescargarPlantilla = (entidad) => {
    const result = descargarPlantilla(entidad, true)
    if (result.success) {
      toast.success(`Plantilla descargada: ${result.fileName}`)
    } else {
      toast.error(result.error)
    }
  }

  const handleExportar = async (entidad) => {
    const result = await exportarEntidad(entidad)
    if (result.success) {
      toast.success(`Exportados ${result.count} registros: ${result.fileName}`)
    } else {
      toast.error(result.error)
    }
  }

  const handleImportar = async () => {
    const result = await ejecutarImportacion()
    if (result.success) {
      const r = result.result
      toast.success(`Importación completada: ${r.created} creados, ${r.updated} actualizados`)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Tabs de entidad */}
      <Tabs value={entidadActiva} onValueChange={setEntidadActiva}>
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          {ENTIDADES.map(ent => (
            <TabsTrigger key={ent.id} value={ent.id} disabled={isProcessing}>
              <ent.icon className="w-4 h-4 mr-2" />
              {ent.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {ENTIDADES.map(ent => (
          <TabsContent key={ent.id} value={ent.id} className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Panel de Importación */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-medium">Importar {ent.label}</h3>
                </div>

                {!isProcessing && !isCompleted && (
                  <>
                    <ImportDropzone
                      onFileSelect={cargarArchivo}
                      file={archivo}
                      onClear={limpiarArchivo}
                      disabled={isLoading}
                    />

                    {error && !resultado && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                        {error}
                      </div>
                    )}

                    {datosExcel && (
                      <div className="mt-4 space-y-4">
                        <ImportPreview 
                          datosExcel={datosExcel} 
                          validacion={validacion}
                          maxRows={5}
                        />

                        {validacion?.errores.length > 0 && (
                          <ImportErrors errores={validacion.errores} maxVisible={3} />
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t">
                          <Button variant="outline" onClick={limpiarArchivo}>
                            Cancelar
                          </Button>
                          <Button 
                            onClick={handleImportar} 
                            disabled={!canImport}
                          >
                            Importar {validacion?.validas || 0} registros
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {isProcessing && (
                  <ImportProgress 
                    progreso={progreso} 
                    estado={estado}
                    resultado={resultado}
                  />
                )}

                {isCompleted && resultado && (
                  <>
                    <ImportProgress 
                      progreso={progreso} 
                      estado={estado}
                      resultado={resultado}
                    />

                    {resultado.errors?.length > 0 && (
                      <div className="mt-4">
                        <ImportErrors errores={resultado.errors} maxVisible={5} />
                      </div>
                    )}

                    <div className="mt-4 flex justify-end">
                      <Button onClick={reiniciar}>
                        Nueva importación
                      </Button>
                    </div>
                  </>
                )}

                {/* Botón de plantilla */}
                {!archivo && !isProcessing && !isCompleted && (
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      ¿Necesitas la plantilla?
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDescargarPlantilla(ent.id)}
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Descargar plantilla
                    </Button>
                  </div>
                )}
              </Card>

              {/* Panel de Exportación */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Download className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-medium">Exportar {ent.label}</h3>
                </div>

                <p className="text-gray-600 mb-6">
                  Descarga todos los datos de {ent.label.toLowerCase()} en un archivo Excel.
                  Puedes usar este archivo como respaldo o para modificar datos y volver a importarlos.
                </p>

                <div className="space-y-3">
                  <ExportButton
                    entidad={ent.id}
                    onExport={handleExportar}
                    variant="default"
                    label={`Exportar todos los ${ent.label.toLowerCase()}`}
                  />

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleDescargarPlantilla(ent.id)}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Descargar plantilla vacía
                  </Button>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Formato de exportación
                  </h4>
                  <p className="text-xs text-gray-500">
                    El archivo exportado contiene todos los campos de {ent.label.toLowerCase()}.
                    Las referencias a otras entidades (comunidad, ubicación) se exportan como códigos/nombres
                    que pueden ser reconocidos durante la importación.
                  </p>
                </div>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export default ImportExportPanel
