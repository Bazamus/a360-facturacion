/**
 * Componente ImportExportPanel - Panel principal con tabs
 * Sistema de Facturación A360
 * Rediseñado con layout vertical para mejor UX
 */

import React, { useState } from 'react'
import { Building2, Users, Gauge, Download, Upload, FileSpreadsheet, Layers, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
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
  { id: 'comunidades', label: 'Comunidades', icon: Building2, description: 'Datos básicos de comunidades de propietarios' },
  { id: 'clientes', label: 'Clientes', icon: Users, description: 'Información de clientes y propietarios' },
  { id: 'contadores', label: 'Contadores', icon: Gauge, description: 'Contadores y sus conceptos asignados' },
  { id: 'comunidad_completa', label: 'Comunidad Completa', icon: Layers, description: 'Todos los datos de una comunidad en un solo archivo' }
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
  const entidadActual = ENTIDADES.find(e => e.id === entidadActiva)

  return (
    <div className="space-y-6">
      {/* Header de la página */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Importar / Exportar Datos</h1>
        <p className="mt-1 text-gray-500">
          Gestiona la importación y exportación masiva de datos mediante archivos Excel
        </p>
      </div>

      {/* Tabs de entidad - ancho completo */}
      <Tabs value={entidadActiva} onValueChange={setEntidadActiva}>
        <div className="bg-white rounded-lg border shadow-sm">
          <TabsList className="flex w-full border-b bg-gray-50 rounded-t-lg p-0 h-auto">
            {ENTIDADES.map(ent => (
              <TabsTrigger 
                key={ent.id} 
                value={ent.id} 
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 py-4 px-6 text-sm font-medium rounded-none first:rounded-tl-lg last:rounded-tr-lg border-b-2 border-transparent data-[state=active]:border-primary-500 data-[state=active]:bg-white data-[state=active]:text-primary-600 hover:bg-gray-100 transition-colors"
              >
                <ent.icon className="w-5 h-5" />
                <span className="hidden sm:inline">{ent.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Descripción de la entidad activa */}
          {entidadActual && (
            <div className="px-6 py-3 bg-gray-50 border-b">
              <p className="text-sm text-gray-600">
                <entidadActual.icon className="w-4 h-4 inline mr-2" />
                {entidadActual.description}
              </p>
            </div>
          )}
        </div>

        {/* Contenido para entidades básicas */}
        {entidadesBasicas.map(ent => (
          <TabsContent key={ent.id} value={ent.id} className="mt-6 space-y-6">
            {/* Sección de IMPORTACIÓN - Ancho completo */}
            <Card className="overflow-hidden">
              <div className="bg-blue-50 border-b border-blue-100 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Upload className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900">Importar {ent.label}</h3>
                      <p className="text-sm text-blue-600">Carga un archivo Excel con los datos a importar</p>
                    </div>
                  </div>
                  {!archivo && !isProcessing && !isCompleted && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDescargarPlantilla(ent.id)}
                      className="border-blue-200 text-blue-700 hover:bg-blue-100"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Descargar plantilla
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-6">
                {!isProcessing && !isCompleted && (
                  <>
                    <ImportDropzone
                      onFileSelect={cargarArchivo}
                      file={archivo}
                      onClear={limpiarArchivo}
                      disabled={isLoading}
                    />

                    {error && !resultado && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                          <div>
                            <p className="font-medium text-red-800">Error al procesar archivo</p>
                            <p className="text-sm text-red-600 mt-1">{error}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {datosExcel && (
                      <div className="mt-6 space-y-6">
                        {/* Preview con ancho completo */}
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                              Vista previa de datos
                            </span>
                            <Badge variant={validacion?.validas > 0 ? 'success' : 'default'}>
                              {validacion?.validas || 0} de {datosExcel?.length || 0} válidos
                            </Badge>
                          </div>
                          <ImportPreview 
                            datosExcel={datosExcel} 
                            validacion={validacion}
                            maxRows={15}
                          />
                        </div>

                        {validacion?.errores.length > 0 && (
                          <ImportErrors errores={validacion.errores} maxVisible={5} />
                        )}

                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="text-sm text-gray-500">
                            {validacion?.invalidas > 0 && (
                              <span className="text-amber-600">
                                ⚠️ {validacion.invalidas} registros con errores serán omitidos
                              </span>
                            )}
                          </div>
                          <div className="flex gap-3">
                            <Button variant="outline" onClick={limpiarArchivo}>
                              Cancelar
                            </Button>
                            <Button 
                              onClick={handleImportar} 
                              disabled={!canImport}
                              className="min-w-[200px]"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Importar {validacion?.validas || 0} registros
                            </Button>
                          </div>
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
                  <div className="space-y-4">
                    <ImportProgress 
                      progreso={progreso} 
                      estado={estado}
                      resultado={resultado}
                    />

                    {resultado.errors?.length > 0 && (
                      <ImportErrors errores={resultado.errors} maxVisible={10} />
                    )}

                    <div className="flex justify-end pt-4 border-t">
                      <Button onClick={reiniciar}>
                        Nueva importación
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Sección de EXPORTACIÓN - Ancho completo */}
            <Card className="overflow-hidden">
              <div className="bg-green-50 border-b border-green-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Download className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-900">Exportar {ent.label}</h3>
                    <p className="text-sm text-green-600">Descarga los datos actuales en formato Excel</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                  <p className="text-gray-600">
                    Descarga todos los datos de {ent.label.toLowerCase()} en un archivo Excel.
                    Puedes usar este archivo como respaldo o para modificar datos y volver a importarlos.
                  </p>
                  <div className="flex gap-3 shrink-0">
                    <Button
                      variant="outline"
                      onClick={() => handleDescargarPlantilla(ent.id)}
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Plantilla vacía
                    </Button>
                    <ExportButton
                      entidad={ent.id}
                      onExport={handleExportar}
                      variant="default"
                      label={`Exportar ${ent.label.toLowerCase()}`}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        ))}

        {/* Tab Comunidad Completa */}
        <TabsContent value="comunidad_completa" className="mt-6 space-y-6">
          {/* Sección de IMPORTACIÓN Comunidad Completa */}
          <Card className="overflow-hidden">
            <div className="bg-purple-50 border-b border-purple-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Upload className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-900">Importar Comunidad Completa</h3>
                    <p className="text-sm text-purple-600">Carga todos los datos de una comunidad en un solo archivo</p>
                  </div>
                </div>
                {!archivo && !isProcessing && !isCompleted && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDescargarPlantillaComunidadCompleta}
                    className="border-purple-200 text-purple-700 hover:bg-purple-100"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Descargar plantilla
                  </Button>
                )}
              </div>
            </div>

            <div className="p-6">
              {!isProcessing && !isCompleted && (
                <>
                  <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <h4 className="text-sm font-medium text-purple-800 mb-2">El archivo debe contener las siguientes hojas:</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-purple-700">
                        <div className="w-2 h-2 bg-purple-400 rounded-full" />
                        Datos Generales
                      </div>
                      <div className="flex items-center gap-2 text-purple-700">
                        <div className="w-2 h-2 bg-purple-400 rounded-full" />
                        Portales
                      </div>
                      <div className="flex items-center gap-2 text-purple-700">
                        <div className="w-2 h-2 bg-purple-400 rounded-full" />
                        Viviendas
                      </div>
                      <div className="flex items-center gap-2 text-purple-700">
                        <div className="w-2 h-2 bg-purple-400 rounded-full" />
                        Precios
                      </div>
                    </div>
                  </div>

                  <ImportDropzone
                    onFileSelect={cargarArchivoComunidadCompleta}
                    file={archivo}
                    onClear={limpiarComunidadCompleta}
                    disabled={isLoading}
                  />

                  {error && !resultadoComunidadCompleta && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-800">Error al procesar archivo</p>
                          <p className="text-sm text-red-600 mt-1">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {datosComunidadCompleta && (
                    <div className="mt-6 space-y-6">
                      {/* Resumen de hojas detectadas */}
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b">
                          <span className="text-sm font-medium text-gray-700">Hojas detectadas en el archivo</span>
                        </div>
                        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <ResumenHoja 
                            label="Datos Generales" 
                            count={datosComunidadCompleta.resumen?.datosGenerales || 0}
                            icon={Building2}
                          />
                          <ResumenHoja 
                            label="Portales" 
                            count={datosComunidadCompleta.resumen?.portales || 0}
                            icon={Layers}
                          />
                          <ResumenHoja 
                            label="Viviendas" 
                            count={datosComunidadCompleta.resumen?.viviendas || 0}
                            icon={Users}
                          />
                          <ResumenHoja 
                            label="Precios" 
                            count={datosComunidadCompleta.resumen?.precios || 0}
                            icon={FileSpreadsheet}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-gray-500">
                          Total de registros a procesar: {
                            (datosComunidadCompleta.resumen?.datosGenerales || 0) +
                            (datosComunidadCompleta.resumen?.portales || 0) +
                            (datosComunidadCompleta.resumen?.viviendas || 0) +
                            (datosComunidadCompleta.resumen?.precios || 0)
                          }
                        </div>
                        <div className="flex gap-3">
                          <Button variant="outline" onClick={limpiarComunidadCompleta}>
                            Cancelar
                          </Button>
                          <Button 
                            onClick={handleImportarComunidadCompleta} 
                            disabled={!canImportComunidadCompleta}
                            className="min-w-[200px]"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Importar comunidad
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {isProcessing && (
                <div className="space-y-4">
                  <div className="p-6 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                      <div>
                        <p className="font-medium text-purple-800">
                          {progresoMultiHoja.mensaje || 'Procesando...'}
                        </p>
                        <p className="text-sm text-purple-600">Por favor espera mientras se procesan los datos</p>
                      </div>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-3">
                      <div 
                        className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${progresoMultiHoja.porcentaje * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-purple-600 mt-2 text-right">
                      {Math.round(progresoMultiHoja.porcentaje * 100)}% completado
                    </p>
                  </div>
                </div>
              )}

              {isCompleted && resultadoComunidadCompleta && (
                <div className="space-y-4">
                  <div className="p-6 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-green-100 rounded-full">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <span className="font-semibold text-green-800 text-lg">Importación completada</span>
                        <p className="text-sm text-green-600">Los datos han sido procesados correctamente</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {resultadoComunidadCompleta.comunidad && (
                        <ResultadoSeccion
                          label="Comunidad"
                          result={resultadoComunidadCompleta.comunidad}
                          icon={Building2}
                        />
                      )}
                      {resultadoComunidadCompleta.portales && (
                        <ResultadoSeccion
                          label="Portales"
                          result={resultadoComunidadCompleta.portales}
                          icon={Layers}
                        />
                      )}
                      {resultadoComunidadCompleta.viviendas && (
                        <ResultadoSeccion
                          label="Viviendas"
                          result={resultadoComunidadCompleta.viviendas}
                          icon={Users}
                        />
                      )}
                      {resultadoComunidadCompleta.precios && (
                        <ResultadoSeccion
                          label="Precios"
                          result={resultadoComunidadCompleta.precios}
                          icon={FileSpreadsheet}
                        />
                      )}
                    </div>
                  </div>

                  {resultadoComunidadCompleta.erroresGlobales?.length > 0 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span className="font-semibold text-red-800">Errores críticos detectados</span>
                      </div>
                      <ul className="text-sm text-red-700 space-y-1">
                        {resultadoComunidadCompleta.erroresGlobales.map((e, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-red-400">•</span>
                            {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-end pt-4 border-t">
                    <Button onClick={limpiarComunidadCompleta}>
                      Nueva importación
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Sección de EXPORTACIÓN Comunidad Completa */}
          <Card className="overflow-hidden">
            <div className="bg-green-50 border-b border-green-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Download className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-900">Exportar Comunidad Completa</h3>
                  <p className="text-sm text-green-600">Descarga todos los datos de una comunidad en un único archivo</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seleccionar comunidad a exportar
                    </label>
                    <select
                      value={comunidadExportarId}
                      onChange={(e) => setComunidadExportarId(e.target.value)}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                      <option value="">Seleccionar comunidad...</option>
                      {comunidades?.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.codigo} - {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleDescargarPlantillaComunidadCompleta}
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Plantilla vacía
                    </Button>
                    <Button
                      onClick={handleExportarComunidadCompleta}
                      disabled={!comunidadExportarId || isLoading}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Exportar comunidad
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">El archivo exportado contendrá:</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-gray-600">
                    <div>• Datos Generales</div>
                    <div>• Portales</div>
                    <div>• Viviendas</div>
                    <div>• Precios vigentes</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Componente auxiliar para resumen de hoja - Rediseñado
function ResumenHoja({ label, count, icon: Icon }) {
  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-lg border text-center">
      {Icon && <Icon className="w-6 h-6 text-gray-400 mb-2" />}
      <span className="text-xs text-gray-500 mb-1">{label}</span>
      <Badge variant={count > 0 ? 'success' : 'default'} className="text-lg px-3 py-1">
        {count}
      </Badge>
      <span className="text-xs text-gray-400 mt-1">filas</span>
    </div>
  )
}

// Componente auxiliar para resultado de sección - Rediseñado
function ResultadoSeccion({ label, result, icon: Icon }) {
  const [expandido, setExpandido] = useState(false)
  const hasErrors = result.errors?.length > 0
  const hasResults = result.created > 0 || result.updated > 0

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-gray-400" />}
          <span className="font-medium text-gray-700">{label}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {result.created > 0 && (
            <Badge variant="success">{result.created} creados</Badge>
          )}
          {result.updated > 0 && (
            <Badge variant="info">{result.updated} actualizados</Badge>
          )}
          {hasErrors && (
            <button
              onClick={() => setExpandido(!expandido)}
              className="inline-flex items-center gap-1 text-red-600 hover:text-red-800"
            >
              <Badge variant="danger">{result.errors.length} errores</Badge>
              {expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          {!hasResults && !hasErrors && (
            <Badge variant="default">Sin cambios</Badge>
          )}
        </div>
      </div>

      {/* Mostrar errores expandidos */}
      {hasErrors && expandido && (
        <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
          <div className="max-h-48 overflow-y-auto space-y-2">
            {result.errors.slice(0, 10).map((error, idx) => (
              <div key={idx} className="text-sm">
                <span className="font-medium text-red-800">Fila {error.fila}:</span>{' '}
                <span className="text-red-600">{error.errores.join(', ')}</span>
              </div>
            ))}
            {result.errors.length > 10 && (
              <div className="text-sm text-red-500 italic pt-2 border-t border-red-100">
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
