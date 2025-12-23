/**
 * Componente ImportExportPanel - Panel principal con tabs
 * Sistema de Facturación A360
 */

import React, { useState } from 'react'
import { Building2, Users, Gauge, Download, Upload, FileSpreadsheet, Layers, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button, Card, Tabs, TabsList, TabsTrigger, TabsContent, Badge } from '@/components/ui'
import { ImportDropzone } from './ImportDropzone'
import { ImportPreview } from './ImportPreview'
import { ImportProgress } from './ImportProgress'
import { ImportErrors } from './ImportErrors'
import { ExportButton } from './ExportButton'
import { useImportExport } from '../hooks'
import { useToast } from '@/components/ui/Toast'
import { useComunidades } from '@/hooks'

const ENTIDADES = [
  { id: 'comunidades', label: 'Comunidades', icon: Building2 },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'contadores', label: 'Contadores', icon: Gauge },
  { id: 'comunidad_completa', label: 'Comunidad Completa', icon: Layers }
]

export function ImportExportPanel() {
  const toast = useToast()
  const { data: comunidades } = useComunidades()
  const [comunidadExportarId, setComunidadExportarId] = useState('')
  
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
    canImport,
    // Comunidad Completa
    datosComunidadCompleta,
    resultadoComunidadCompleta,
    progresoMultiHoja,
    descargarPlantillaComunidadCompleta,
    cargarArchivoComunidadCompleta,
    ejecutarImportacionComunidadCompleta,
    exportarComunidadCompletaFn,
    limpiarComunidadCompleta,
    canImportComunidadCompleta
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

  // Handlers para Comunidad Completa
  const handleDescargarPlantillaComunidadCompleta = () => {
    const result = descargarPlantillaComunidadCompleta()
    if (result.success) {
      toast.success(`Plantilla descargada: ${result.fileName}`)
    } else {
      toast.error(result.error)
    }
  }

  const handleImportarComunidadCompleta = async () => {
    const result = await ejecutarImportacionComunidadCompleta()
    if (result.success) {
      toast.success('Importación de comunidad completa finalizada')
    } else {
      toast.error(result.error)
    }
  }

  const handleExportarComunidadCompleta = async () => {
    if (!comunidadExportarId) {
      toast.error('Selecciona una comunidad')
      return
    }
    const result = await exportarComunidadCompletaFn(comunidadExportarId)
    if (result.success) {
      toast.success(`Exportado: ${result.fileName}`)
    } else {
      toast.error(result.error)
    }
  }

  // Entidades básicas (sin comunidad completa)
  const entidadesBasicas = ENTIDADES.filter(e => e.id !== 'comunidad_completa')

  return (
    <div className="space-y-6">
      {/* Tabs de entidad */}
      <Tabs value={entidadActiva} onValueChange={setEntidadActiva}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          {ENTIDADES.map(ent => (
            <TabsTrigger key={ent.id} value={ent.id} disabled={isProcessing}>
              <ent.icon className="w-4 h-4 mr-2" />
              {ent.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {entidadesBasicas.map(ent => (
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

        {/* Tab Comunidad Completa */}
        <TabsContent value="comunidad_completa" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel de Importación Comunidad Completa */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Upload className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-medium">Importar Comunidad Completa</h3>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Importa todos los datos de una comunidad en un solo archivo: datos generales, portales, viviendas y precios.
              </p>

              {!isProcessing && !isCompleted && (
                <>
                  <ImportDropzone
                    onFileSelect={cargarArchivoComunidadCompleta}
                    file={archivo}
                    onClear={limpiarComunidadCompleta}
                    disabled={isLoading}
                  />

                  {error && !resultadoComunidadCompleta && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  {datosComunidadCompleta && (
                    <div className="mt-4 space-y-4">
                      {/* Resumen de hojas detectadas */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium mb-3">Hojas detectadas:</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <ResumenHoja 
                            label="Datos Generales" 
                            count={datosComunidadCompleta.resumen?.datosGenerales || 0}
                          />
                          <ResumenHoja 
                            label="Portales" 
                            count={datosComunidadCompleta.resumen?.portales || 0}
                          />
                          <ResumenHoja 
                            label="Viviendas" 
                            count={datosComunidadCompleta.resumen?.viviendas || 0}
                          />
                          <ResumenHoja 
                            label="Precios" 
                            count={datosComunidadCompleta.resumen?.precios || 0}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" onClick={limpiarComunidadCompleta}>
                          Cancelar
                        </Button>
                        <Button 
                          onClick={handleImportarComunidadCompleta} 
                          disabled={!canImportComunidadCompleta}
                        >
                          Importar comunidad
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {isProcessing && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-700">
                      {progresoMultiHoja.mensaje || 'Procesando...'}
                    </p>
                    <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${progresoMultiHoja.porcentaje * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {isCompleted && resultadoComunidadCompleta && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-700">Importación completada</span>
                    </div>

                    <div className="space-y-3 text-sm">
                      {resultadoComunidadCompleta.comunidad && (
                        <ResultadoSeccion
                          label="Comunidad"
                          result={resultadoComunidadCompleta.comunidad}
                        />
                      )}
                      {resultadoComunidadCompleta.portales && (
                        <ResultadoSeccion
                          label="Portales"
                          result={resultadoComunidadCompleta.portales}
                        />
                      )}
                      {resultadoComunidadCompleta.viviendas && (
                        <ResultadoSeccion
                          label="Viviendas"
                          result={resultadoComunidadCompleta.viviendas}
                        />
                      )}
                      {resultadoComunidadCompleta.precios && (
                        <ResultadoSeccion
                          label="Precios"
                          result={resultadoComunidadCompleta.precios}
                        />
                      )}
                    </div>

                    {resultadoComunidadCompleta.erroresGlobales?.length > 0 && (
                      <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded">
                        <div className="flex items-center gap-2 mb-2">
                          <XCircle className="w-4 h-4 text-red-600" />
                          <span className="font-medium text-red-700 text-sm">Errores críticos</span>
                        </div>
                        <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                          {resultadoComunidadCompleta.erroresGlobales.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={limpiarComunidadCompleta}>
                      Nueva importación
                    </Button>
                  </div>
                </div>
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
                    onClick={handleDescargarPlantillaComunidadCompleta}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Descargar plantilla
                  </Button>
                </div>
              )}
            </Card>

            {/* Panel de Exportación Comunidad Completa */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Download className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-medium">Exportar Comunidad Completa</h3>
              </div>

              <p className="text-gray-600 mb-6">
                Exporta todos los datos de una comunidad (datos generales, portales, viviendas y precios) en un único archivo Excel.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar comunidad
                  </label>
                  <select
                    value={comunidadExportarId}
                    onChange={(e) => setComunidadExportarId(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="">Seleccionar...</option>
                    {comunidades?.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.codigo} - {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  className="w-full"
                  onClick={handleExportarComunidadCompleta}
                  disabled={!comunidadExportarId || isLoading}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar comunidad seleccionada
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleDescargarPlantillaComunidadCompleta}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Descargar plantilla vacía
                </Button>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Contenido del archivo
                </h4>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• <strong>Datos Generales:</strong> Información básica de la comunidad</li>
                  <li>• <strong>Portales:</strong> Bloques/escaleras de la comunidad</li>
                  <li>• <strong>Viviendas:</strong> Ubicaciones dentro de cada portal</li>
                  <li>• <strong>Precios:</strong> Precios vigentes por concepto</li>
                </ul>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Componente auxiliar para resumen de hoja
function ResumenHoja({ label, count }) {
  return (
    <div className="flex items-center justify-between p-2 bg-white rounded border">
      <span className="text-sm text-gray-600">{label}</span>
      <Badge variant={count > 0 ? 'success' : 'default'}>
        {count} filas
      </Badge>
    </div>
  )
}

// Componente auxiliar para resultado de sección
function ResultadoSeccion({ label, result }) {
  const [expandido, setExpandido] = useState(false)
  const hasErrors = result.errors?.length > 0

  return (
    <div className="border-l-2 border-gray-300 pl-3">
      <div className="flex items-center justify-between">
        <span className="text-gray-600 font-medium">{label}:</span>
        <div className="flex items-center gap-2">
          {result.created > 0 && (
            <span className="text-green-600 text-sm">{result.created} creados</span>
          )}
          {result.updated > 0 && (
            <span className="text-blue-600 text-sm">{result.updated} actualizados</span>
          )}
          {hasErrors && (
            <button
              onClick={() => setExpandido(!expandido)}
              className="text-red-600 text-sm hover:underline flex items-center gap-1"
            >
              <AlertCircle className="w-4 h-4" />
              {result.errors.length} errores
            </button>
          )}
        </div>
      </div>

      {/* Mostrar errores expandidos */}
      {hasErrors && expandido && (
        <div className="mt-2 p-2 bg-red-50 rounded text-xs">
          <div className="max-h-40 overflow-y-auto space-y-1">
            {result.errors.slice(0, 10).map((error, idx) => (
              <div key={idx} className="text-red-700">
                <span className="font-semibold">Fila {error.fila}:</span>{' '}
                {error.errores.join(', ')}
              </div>
            ))}
            {result.errors.length > 10 && (
              <div className="text-red-600 italic mt-1">
                ... y {result.errors.length - 10} errores más
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ImportExportPanel

