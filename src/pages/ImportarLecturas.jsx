import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Check, Download } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { FileDropzone, ColumnMapper, ExcelPreview } from '@/features/lecturas/components'
import { 
  readExcel, 
  analyzeExcelStructure,
  formatDateForDB 
} from '@/features/lecturas/utils/excelParser'
import { parseDate } from '@/features/lecturas/utils/dateParsers'
import { parseNumber } from '@/features/lecturas/utils/numberParsers'
import { detectarAlertas, determinarEstadoFila, contarPorEstado } from '@/features/lecturas/utils/alertDetector'
import { generarPlantillaMaestra } from '@/features/lecturas/utils/templateGenerator'
import { useComunidades } from '@/hooks/useComunidades'
import { useConceptos } from '@/hooks/useConceptos'
import { 
  useCreateImportacion, 
  useCreateImportacionDetalle,
  useUpdateImportacion,
  useAlertasConfiguracion 
} from '@/hooks/useLecturas'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'

const STEPS = [
  { id: 'select', label: 'Seleccionar archivo' },
  { id: 'map', label: 'Mapear columnas' },
  { id: 'process', label: 'Procesando...' }
]

export default function ImportarLecturas() {
  const navigate = useNavigate()
  const toast = useToast()
  
  const [step, setStep] = useState(0)
  const [comunidadId, setComunidadId] = useState('')
  const [file, setFile] = useState(null)
  const [excelData, setExcelData] = useState(null)
  const [analisis, setAnalisis] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const { data: comunidades, isLoading: loadingComunidades } = useComunidades({ activa: true })
  const { data: conceptos, isLoading: loadingConceptos } = useConceptos({ activo: true })
  const { data: alertasConfig } = useAlertasConfiguracion()
  const createImportacion = useCreateImportacion()
  const createDetalles = useCreateImportacionDetalle()
  const updateImportacion = useUpdateImportacion()

  // Descargar plantilla maestra
  const handleDescargarPlantilla = () => {
    if (!conceptos || conceptos.length === 0) {
      toast.error('No hay conceptos configurados')
      return
    }
    
    const comunidadSeleccionada = comunidades?.find(c => c.id === comunidadId)
    const nombreComunidad = comunidadSeleccionada?.nombre || ''
    
    try {
      const nombreArchivo = generarPlantillaMaestra(conceptos, nombreComunidad)
      toast.success(`Plantilla descargada: ${nombreArchivo}`)
    } catch (error) {
      toast.error(`Error al generar plantilla: ${error.message}`)
    }
  }

  // Paso 1: Manejar selección de archivo
  const handleFileSelect = useCallback(async (selectedFile) => {
    if (!conceptos || conceptos.length === 0) {
      toast.error('Esperando carga de conceptos...')
      return
    }
    
    try {
      const data = await readExcel(selectedFile)
      const estructuraAnalizada = analyzeExcelStructure(data.headers, conceptos)
      
      setFile(selectedFile)
      setExcelData(data)
      setAnalisis(estructuraAnalizada)
      setStep(1)
      
      if (estructuraAnalizada.isValid) {
        toast.success(`Archivo cargado: ${data.totalRows} filas, ${estructuraAnalizada.summary.conceptColumnsFound} conceptos detectados`)
      } else {
        toast.warning('Archivo cargado con errores de estructura')
      }
    } catch (error) {
      toast.error(`Error al leer el archivo: ${error.message}`)
    }
  }, [toast, conceptos])

  const handleClearFile = () => {
    setFile(null)
    setExcelData(null)
    setAnalisis(null)
    setStep(0)
  }

  // Paso 2: Procesar archivo (nuevo formato multiconcepto)
  const handleProcess = async () => {
    if (!comunidadId) {
      toast.error('Selecciona una comunidad')
      return
    }

    if (!analisis?.isValid) {
      toast.error('La estructura del archivo no es válida')
      return
    }

    setIsProcessing(true)
    setStep(2)
    setProgress({ current: 0, total: excelData.rows.length })

    try {
      console.log('Iniciando proceso de importación (formato multiconcepto)...')
      
      // 1. Crear registro de importación
      let importacion
      try {
        importacion = await createImportacion.mutateAsync({
          comunidad_id: comunidadId,
          nombre_archivo: file.name,
          total_filas: excelData.rows.length,
          estado: 'procesando'
        })
        console.log('Importación creada:', importacion)
      } catch (err) {
        console.error('Error al crear importación:', err)
        throw new Error(`No se pudo crear la importación: ${err.message}`)
      }

      const { fixedColumns, conceptColumns } = analisis
      const detalles = []
      
      // 2. Procesar cada fila del Excel
      for (let i = 0; i < excelData.rows.length; i++) {
        const row = excelData.rows[i]
        
        // Extraer datos fijos de la fila
        const fechaRaw = fixedColumns.fecha_lectura >= 0 ? row[fixedColumns.fecha_lectura] : null
        const numeroContador = fixedColumns.numero_contador >= 0 ? row[fixedColumns.numero_contador] : null
        const portal = fixedColumns.portal >= 0 ? row[fixedColumns.portal] : null
        const vivienda = fixedColumns.vivienda >= 0 ? row[fixedColumns.vivienda] : null
        
        const fechaParsed = parseDate(fechaRaw)
        const numeroContadorStr = numeroContador ? String(numeroContador).trim() : null

        // Buscar contador
        let contador = null
        let ubicacionInfo = null
        let cliente = null
        
        if (numeroContadorStr) {
          const { data: contadores } = await supabase
            .from('contadores')
            .select(`
              *,
              ubicacion:ubicaciones(
                *,
                agrupacion:agrupaciones(
                  *,
                  comunidad:comunidades(id, nombre)
                )
              )
            `)
            .eq('numero_serie', numeroContadorStr)
          
          if (contadores && contadores.length > 0) {
            contador = contadores[0]
            ubicacionInfo = contador.ubicacion
          }
        }

        // Obtener cliente actual de la ubicación
        if (contador?.ubicacion_id) {
          // Paso 1: Obtener la relación ubicación-cliente
          const { data: ubicacionCliente, error: errorUC } = await supabase
            .from('ubicaciones_clientes')
            .select('*')
            .eq('ubicacion_id', contador.ubicacion_id)
            .eq('es_actual', true)
            .maybeSingle()

          // Paso 2: Si hay relación, obtener datos del cliente
          if (ubicacionCliente?.cliente_id) {
            const { data: clienteData } = await supabase
              .from('clientes')
              .select('id, nombre, apellidos, nif, email, telefono, estado_id, estado:estados_cliente(*)')
              .eq('id', ubicacionCliente.cliente_id)
              .single()

            if (clienteData) {
              // Mapear estado bloqueado desde estados_cliente
              cliente = {
                ...clienteData,
                bloqueado: clienteData.estado?.bloquea_facturacion || false,
                motivo_bloqueo: clienteData.estado?.bloquea_facturacion ? clienteData.estado.nombre : null
              }
            }
          }
        }

        // 3. Procesar cada columna de concepto que tenga valor
        for (const [colIndexStr, conceptoInfo] of Object.entries(conceptColumns)) {
          const colIndex = parseInt(colIndexStr)
          const valorRaw = row[colIndex]
          
          // Saltar si la celda está vacía o es un guion
          if (valorRaw === null || valorRaw === undefined || valorRaw === '' || 
              valorRaw === '—' || valorRaw === '-' || valorRaw === '–') {
            continue
          }
          
          const lecturaValor = parseNumber(valorRaw)
          if (lecturaValor === null) continue
          
          // Verificar que el contador tiene el concepto asignado
          let contadorConcepto = null
          let lecturaAnterior = null
          let precio = null
          
          if (contador) {
            const { data: cc } = await supabase
              .from('contadores_conceptos')
              .select('*')
              .eq('contador_id', contador.id)
              .eq('concepto_id', conceptoInfo.concepto_id)
              .eq('activo', true)
              .maybeSingle()
            
            contadorConcepto = cc
            
            // Obtener última lectura confirmada de la tabla lecturas
            const { data: lecturas } = await supabase
              .from('lecturas')
              .select('lectura_valor, fecha_lectura')
              .eq('contador_id', contador.id)
              .eq('concepto_id', conceptoInfo.concepto_id)
              .order('fecha_lectura', { ascending: false })
              .limit(1)

            if (lecturas && lecturas.length > 0) {
              lecturaAnterior = lecturas[0]
            } else if (contadorConcepto) {
              // Si no hay lecturas confirmadas, usar lectura_actual del contador_concepto
              // (que representa la última lectura conocida, puede ser igual a lectura_inicial)
              lecturaAnterior = {
                lectura_valor: contadorConcepto.lectura_actual,
                fecha_lectura: contadorConcepto.fecha_lectura_actual
              }
            }
          }

          // Obtener precio vigente
          const { data: precios } = await supabase
            .from('precios')
            .select('*')
            .eq('comunidad_id', comunidadId)
            .eq('concepto_id', conceptoInfo.concepto_id)
            .eq('activo', true)
            .limit(1)
          
          if (precios && precios.length > 0) {
            precio = precios[0]
          }

          // Calcular consumo
          const consumoCalculado = lecturaValor != null && lecturaAnterior?.lectura_valor != null
            ? lecturaValor - lecturaAnterior.lectura_valor
            : null

          // Preparar resultado para detección de alertas
          const resultado = {
            lectura_valor: lecturaValor,
            lectura_anterior: lecturaAnterior?.lectura_valor,
            fecha_lectura: fechaParsed,
            fecha_lectura_anterior: lecturaAnterior?.fecha_lectura,
            consumo_calculado: consumoCalculado,
            cliente_bloqueado: cliente?.bloqueado,
            motivo_bloqueo: cliente?.motivo_bloqueo
          }

          // Detectar alertas y determinar estado
          let alertas = []
          let estado = 'valido'

          if (!numeroContadorStr || !fechaParsed) {
            alertas.push({
              tipo: 'formato_invalido',
              severidad: 'error',
              mensaje: 'Falta número de contador o fecha',
              bloquea: true
            })
            estado = 'error'
          } else if (!contador) {
            alertas.push({
              tipo: 'contador_no_encontrado',
              severidad: 'error',
              mensaje: `Contador ${numeroContadorStr} no encontrado`,
              bloquea: true
            })
            estado = 'error'
          } else if (!contadorConcepto) {
            alertas.push({
              tipo: 'concepto_no_asignado',
              severidad: 'error',
              mensaje: `El contador no tiene asignado el concepto ${conceptoInfo.concepto_codigo}`,
              bloquea: true
            })
            estado = 'error'
          } else if (!cliente) {
            alertas.push({
              tipo: 'sin_cliente',
              severidad: 'warning',
              mensaje: 'No hay cliente ocupante actual en la ubicación',
              bloquea: false
            })
            estado = 'alerta'
            
            // Añadir alertas de consumo si aplica
            if (alertasConfig) {
              const alertasDetectadas = detectarAlertas(resultado, alertasConfig)
              alertas = [...alertas, ...alertasDetectadas]
              estado = determinarEstadoFila(alertas)
            }
          } else {
            // Detectar alertas normales
            if (alertasConfig) {
              alertas = detectarAlertas(resultado, alertasConfig)
              estado = determinarEstadoFila(alertas)
            }
          }

          // Crear registro de detalle
          detalles.push({
            importacion_id: importacion.id,
            fila_numero: i + 1,
            datos_originales: {
              fecha: fechaRaw,
              numero_contador: numeroContador,
              portal,
              vivienda,
              concepto: conceptoInfo.concepto_codigo,
              lectura: valorRaw
            },
            numero_contador: numeroContadorStr,
            concepto_codigo: conceptoInfo.concepto_codigo,
            lectura_valor: lecturaValor,
            fecha_lectura: formatDateForDB(fechaParsed),
            contador_id: contador?.id || null,
            concepto_id: conceptoInfo.concepto_id,
            ubicacion_id: contador?.ubicacion_id || null,
            cliente_id: cliente?.id || null,
            comunidad_id: comunidadId,
            lectura_anterior: lecturaAnterior?.lectura_valor || null,
            fecha_lectura_anterior: lecturaAnterior?.fecha_lectura || null,
            consumo_calculado: consumoCalculado,
            precio_unitario: precio?.precio_unitario || null,
            importe_estimado: consumoCalculado != null && precio?.precio_unitario
              ? consumoCalculado * precio.precio_unitario
              : null,
            estado,
            alertas: alertas.length > 0 ? alertas : null,
            error_mensaje: null
          })
        }

        setProgress({ current: i + 1, total: excelData.rows.length })
      }

      console.log(`Total de registros generados: ${detalles.length}`)

      // 4. Insertar todos los detalles
      if (detalles.length > 0) {
        await createDetalles.mutateAsync(detalles)
      }

      // 5. Actualizar estadísticas de la importación
      const stats = contarPorEstado(detalles)
      await updateImportacion.mutateAsync({
        id: importacion.id,
        estado: 'validado',
        filas_validas: stats.validas,
        filas_con_alertas: stats.conAlertas,
        filas_error: stats.errores,
        fecha_procesado: new Date().toISOString()
      })

      toast.success(`Archivo procesado: ${detalles.length} lecturas generadas`)
      
      // Navegar a la pantalla de validación
      navigate(`/lecturas/validar/${importacion.id}`)

    } catch (error) {
      console.error('Error al procesar:', error)
      toast.error(`Error al procesar: ${error.message}`)
      setStep(1)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importar Lecturas</h1>
          <p className="text-gray-500 mt-1">
            Sube un archivo Excel con las lecturas de contadores
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-4 py-4">
        {STEPS.map((s, index) => (
          <React.Fragment key={s.id}>
            <div className={`flex items-center gap-2 ${
              index === step ? 'text-blue-600' : 
              index < step ? 'text-green-600' : 'text-gray-400'
            }`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index === step ? 'bg-blue-100 text-blue-700' :
                index < step ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {index < step ? <Check className="w-4 h-4" /> : index + 1}
              </span>
              <span className="hidden sm:inline text-sm font-medium">{s.label}</span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`w-16 h-0.5 ${
                index < step ? 'bg-green-300' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Content */}
      <Card className="p-6">
        {/* Selector de comunidad (siempre visible) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comunidad
          </label>
          <select
            value={comunidadId}
            onChange={(e) => setComunidadId(e.target.value)}
            className="w-full max-w-md rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            disabled={isProcessing}
          >
            <option value="">Selecciona una comunidad</option>
            {comunidades?.map(c => (
              <option key={c.id} value={c.id}>
                {c.codigo} - {c.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Paso 0: Subir archivo */}
        {step === 0 && (
          <FileDropzone
            onFileSelect={handleFileSelect}
            file={file}
            onClear={handleClearFile}
            disabled={loadingConceptos}
          />
        )}

        {/* Paso 1: Mapeo y preview */}
        {step === 1 && excelData && analisis && (
          <div className="space-y-6">
            <FileDropzone
              onFileSelect={handleFileSelect}
              file={file}
              onClear={handleClearFile}
            />
            
            <ColumnMapper
              analisis={analisis}
              headers={excelData.headers}
            />

            <ExcelPreview
              headers={excelData.headers}
              rows={excelData.rows}
              analisis={analisis}
              maxRows={5}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleClearFile}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={handleProcess}
                disabled={!analisis.isValid || !comunidadId}
              >
                Procesar archivo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Paso 2: Procesando */}
        {step === 2 && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium text-gray-900">
              Procesando archivo...
            </p>
            <p className="text-gray-500 mt-1">
              {progress.current} de {progress.total} filas
            </p>
            <div className="w-full max-w-md mx-auto mt-4 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Información y descarga de plantilla */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-blue-800 mb-2">
              <strong>💡 Formato de la Plantilla Maestra:</strong>
            </p>
            <p className="text-sm text-blue-700">
              Fecha | Nº Contador | Portal | Vivienda | ACS | CAL | CLI | ...
            </p>
            <p className="text-xs text-blue-600 mt-2">
              Una fila por contador. Cada concepto en su propia columna. 
              Deja en blanco los conceptos que no apliquen.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDescargarPlantilla}
            disabled={loadingConceptos}
            className="shrink-0"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar Plantilla
          </Button>
        </div>
      </Card>
    </div>
  )
}



