import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import { Button, Card, Select } from '@/components/ui'
import { FileDropzone, ColumnMapper, ExcelPreview } from '@/features/lecturas/components'
import { 
  readExcel, 
  detectColumnMapping, 
  validateMapping, 
  extractRowData,
  formatDateForDB 
} from '@/features/lecturas/utils/excelParser'
import { detectarAlertas, determinarEstadoFila, contarPorEstado } from '@/features/lecturas/utils/alertDetector'
import { useComunidades } from '@/hooks/useComunidades'
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
  const [mapping, setMapping] = useState({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const { data: comunidades, isLoading: loadingComunidades } = useComunidades({ activa: true })
  const { data: alertasConfig } = useAlertasConfiguracion()
  const createImportacion = useCreateImportacion()
  const createDetalles = useCreateImportacionDetalle()
  const updateImportacion = useUpdateImportacion()

  // Paso 1: Manejar selección de archivo
  const handleFileSelect = useCallback(async (selectedFile) => {
    try {
      const data = await readExcel(selectedFile)
      const detectedMapping = detectColumnMapping(data.headers)
      
      setFile(selectedFile)
      setExcelData(data)
      setMapping(detectedMapping)
      setStep(1)
      
      toast.success(`Archivo cargado: ${data.totalRows} filas detectadas`)
    } catch (error) {
      toast.error(`Error al leer el archivo: ${error.message}`)
    }
  }, [toast])

  const handleClearFile = () => {
    setFile(null)
    setExcelData(null)
    setMapping({})
    setStep(0)
  }

  // Validar mapeo
  const mappingValidation = excelData ? validateMapping(mapping) : { isValid: false, missing: [] }

  // Paso 2: Procesar archivo
  const handleProcess = async () => {
    if (!comunidadId) {
      toast.error('Selecciona una comunidad')
      return
    }

    if (!mappingValidation.isValid) {
      toast.error('El mapeo de columnas no está completo')
      return
    }

    setIsProcessing(true)
    setStep(2)
    setProgress({ current: 0, total: excelData.rows.length })

    try {
      // 1. Crear registro de importación
      const importacion = await createImportacion.mutateAsync({
        comunidad_id: comunidadId,
        nombre_archivo: file.name,
        total_filas: excelData.rows.length,
        estado: 'procesando'
      })

      // 2. Procesar cada fila
      const detalles = []
      
      for (let i = 0; i < excelData.rows.length; i++) {
        const row = excelData.rows[i]
        const rowData = extractRowData(row, mapping)
        
        // Buscar contador por número de serie
        let contador = null
        let concepto = null
        let cliente = null
        let contadorConcepto = null
        let ubicacionInfo = null
        let lecturaAnterior = null
        let precio = null
        
        if (rowData.numero_contador) {
          // Buscar contador
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
            .eq('numero_serie', rowData.numero_contador)
          
          if (contadores && contadores.length > 0) {
            contador = contadores[0]
            ubicacionInfo = contador.ubicacion
          }
        }

        if (rowData.concepto_codigo) {
          // Buscar concepto
          const { data: conceptos } = await supabase
            .from('conceptos')
            .select('*')
            .or(`codigo.eq.${rowData.concepto_codigo},nombre.ilike.%${rowData.concepto_codigo}%`)
          
          if (conceptos && conceptos.length > 0) {
            concepto = conceptos[0]
          }
        }

        // Verificar que el contador tiene el concepto asignado
        if (contador && concepto) {
          const { data: cc } = await supabase
            .from('contadores_conceptos')
            .select('*')
            .eq('contador_id', contador.id)
            .eq('concepto_id', concepto.id)
            .eq('activo', true)
            .single()
          
          contadorConcepto = cc
        }

        // Obtener cliente actual de la ubicación
        if (contador?.ubicacion_id) {
          const { data: ubicacionesClientes } = await supabase
            .from('ubicaciones_clientes')
            .select(`
              *,
              cliente:clientes(*)
            `)
            .eq('ubicacion_id', contador.ubicacion_id)
            .eq('es_actual', true)
            .limit(1)
          
          if (ubicacionesClientes && ubicacionesClientes.length > 0) {
            cliente = ubicacionesClientes[0].cliente
          }
        }

        // Obtener última lectura
        if (contador && concepto) {
          const { data: ultimaLectura } = await supabase
            .from('lecturas')
            .select('lectura_valor, fecha_lectura')
            .eq('contador_id', contador.id)
            .eq('concepto_id', concepto.id)
            .order('fecha_lectura', { ascending: false })
            .limit(1)
            .single()
          
          if (ultimaLectura) {
            lecturaAnterior = ultimaLectura
          } else if (contadorConcepto) {
            // Usar lectura inicial si no hay histórico
            lecturaAnterior = {
              lectura_valor: contadorConcepto.lectura_inicial,
              fecha_lectura: contadorConcepto.fecha_lectura_inicial
            }
          }
        }

        // Obtener precio vigente
        if (comunidadId && concepto) {
          const { data: precios } = await supabase
            .from('precios')
            .select('*')
            .eq('comunidad_id', comunidadId)
            .eq('concepto_id', concepto.id)
            .eq('vigente', true)
            .limit(1)
          
          if (precios && precios.length > 0) {
            precio = precios[0]
          }
        }

        // Calcular consumo
        const consumoCalculado = rowData.lectura_valor != null && lecturaAnterior?.lectura_valor != null
          ? rowData.lectura_valor - lecturaAnterior.lectura_valor
          : null

        // Preparar resultado para detección de alertas
        const resultado = {
          lectura_valor: rowData.lectura_valor,
          lectura_anterior: lecturaAnterior?.lectura_valor,
          fecha_lectura: rowData.fecha_lectura,
          fecha_lectura_anterior: lecturaAnterior?.fecha_lectura,
          consumo_calculado: consumoCalculado,
          cliente_bloqueado: cliente?.bloqueado,
          motivo_bloqueo: cliente?.motivo_bloqueo
        }

        // Detectar alertas
        let alertas = []
        let estado = 'pendiente'
        let errorMensaje = null

        if (!rowData.numero_contador || !rowData.concepto_codigo || 
            rowData.lectura_valor == null || !rowData.fecha_lectura) {
          alertas.push({
            tipo: 'formato_invalido',
            severidad: 'error',
            mensaje: 'Datos incompletos o con formato inválido',
            bloquea: true
          })
          estado = 'error'
        } else if (!contador) {
          alertas.push({
            tipo: 'contador_no_encontrado',
            severidad: 'error',
            mensaje: `Contador ${rowData.numero_contador} no encontrado`,
            bloquea: true
          })
          estado = 'error'
        } else if (!concepto) {
          alertas.push({
            tipo: 'concepto_no_asignado',
            severidad: 'error',
            mensaje: `Concepto ${rowData.concepto_codigo} no encontrado`,
            bloquea: true
          })
          estado = 'error'
        } else if (!contadorConcepto) {
          alertas.push({
            tipo: 'concepto_no_asignado',
            severidad: 'error',
            mensaje: `El contador no tiene asignado el concepto ${concepto.codigo}`,
            bloquea: true
          })
          estado = 'error'
        } else if (!cliente) {
          // No hay cliente pero no es bloqueante
          alertas.push({
            tipo: 'cliente_bloqueado',
            severidad: 'warning',
            mensaje: 'No hay cliente ocupante actual en la ubicación',
            bloquea: false
          })
          estado = 'alerta'
        } else if (alertasConfig) {
          // Detectar alertas normales
          alertas = detectarAlertas(resultado, alertasConfig)
          estado = determinarEstadoFila(alertas)
        } else {
          estado = 'valido'
        }

        // Crear detalle
        detalles.push({
          importacion_id: importacion.id,
          fila_numero: i + 1,
          datos_originales: rowData.datos_originales,
          numero_contador: rowData.numero_contador,
          concepto_codigo: rowData.concepto_codigo,
          lectura_valor: rowData.lectura_valor,
          fecha_lectura: formatDateForDB(rowData.fecha_lectura),
          contador_id: contador?.id || null,
          concepto_id: concepto?.id || null,
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
          alertas,
          error_mensaje: errorMensaje
        })

        setProgress({ current: i + 1, total: excelData.rows.length })
      }

      // 3. Insertar todos los detalles
      await createDetalles.mutateAsync(detalles)

      // 4. Actualizar estadísticas de la importación
      const stats = contarPorEstado(detalles)
      await updateImportacion.mutateAsync({
        id: importacion.id,
        estado: 'validado',
        filas_validas: stats.validas,
        filas_con_alertas: stats.conAlertas,
        filas_error: stats.errores,
        fecha_procesado: new Date().toISOString()
      })

      toast.success('Archivo procesado correctamente')
      
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

        {/* Paso 0 y 1: Subir y mapear */}
        {step === 0 && (
          <FileDropzone
            onFileSelect={handleFileSelect}
            file={file}
            onClear={handleClearFile}
          />
        )}

        {step === 1 && excelData && (
          <div className="space-y-6">
            <FileDropzone
              onFileSelect={handleFileSelect}
              file={file}
              onClear={handleClearFile}
            />
            
            <ColumnMapper
              headers={excelData.headersOriginal}
              mapping={mapping}
              onMappingChange={setMapping}
              validation={mappingValidation}
            />

            <ExcelPreview
              headers={excelData.headersOriginal}
              rows={excelData.rows}
              mapping={mapping}
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
                disabled={!mappingValidation.isValid || !comunidadId}
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
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Información */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>💡 Consejo:</strong> El archivo Excel debe contener las columnas: 
          Nº Contador, Concepto, Lectura y Fecha Lectura. 
          Las columnas Portal y Vivienda son opcionales para referencia visual.
        </p>
      </Card>
    </div>
  )
}

