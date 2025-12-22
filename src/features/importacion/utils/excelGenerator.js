/**
 * Generador de Plantillas Excel y Exportación de Datos
 * Sistema de Facturación A360
 */

import * as XLSX from 'xlsx'

// Configuración base de columnas por entidad
const COLUMN_CONFIG_BASE = {
  comunidades: {
    headers: [
      'Código', 'Nombre', 'CIF', 'Dirección', 'Código Postal', 
      'Ciudad', 'Provincia', 'Email', 'Teléfono', 'Persona Contacto',
      'Tipo Agrupación', 'Tipo Ubicación'
    ],
    fields: [
      'codigo', 'nombre', 'cif', 'direccion', 'codigo_postal',
      'ciudad', 'provincia', 'email', 'telefono', 'persona_contacto',
      'nombre_agrupacion', 'nombre_ubicacion'
    ],
    required: ['codigo', 'nombre', 'direccion', 'codigo_postal', 'ciudad', 'provincia'],
    example: {
      codigo: 'TROYA40',
      nombre: 'Residencial Troya 40',
      cif: 'H12345678',
      direccion: 'C/ Troya, 40',
      codigo_postal: '28001',
      ciudad: 'Madrid',
      provincia: 'Madrid',
      email: 'comunidad@ejemplo.com',
      telefono: '912345678',
      persona_contacto: 'Juan García',
      nombre_agrupacion: 'Portal',
      nombre_ubicacion: 'Vivienda'
    }
  },
  clientes: {
    headers: [
      'NIF', 'Nombre', 'Apellidos', 'Tipo', 'Email', 'Teléfono',
      'Teléfono Secundario', 'IBAN', 'Titular Cuenta', 'Código Cliente',
      'Dirección', 'Código Postal', 'Ciudad', 'Provincia',
      'Código Comunidad', 'Portal', 'Vivienda'
    ],
    fields: [
      'nif', 'nombre', 'apellidos', 'tipo', 'email', 'telefono',
      'telefono_secundario', 'iban', 'titular_cuenta', 'codigo_cliente',
      'direccion_correspondencia', 'cp_correspondencia', 'ciudad_correspondencia', 'provincia_correspondencia',
      'comunidad_codigo', 'agrupacion_nombre', 'ubicacion_nombre'
    ],
    required: ['nif', 'nombre', 'apellidos', 'tipo'],
    example: {
      nif: '12345678A',
      nombre: 'Juan',
      apellidos: 'García López',
      tipo: 'propietario',
      email: 'juan@email.com',
      telefono: '600123456',
      telefono_secundario: '',
      iban: 'ES1234567890123456789012',
      titular_cuenta: 'Juan García López',
      codigo_cliente: 'CLI001',
      direccion_correspondencia: '',
      cp_correspondencia: '',
      ciudad_correspondencia: '',
      provincia_correspondencia: '',
      comunidad_codigo: 'TROYA40',
      agrupacion_nombre: '1',
      ubicacion_nombre: '1ºA'
    }
  },
  contadores: {
    headers: [
      'Nº Serie', 'Marca', 'Modelo', 'Fecha Instalación', 'Fecha Verificación',
      'Código Comunidad', 'Portal', 'Vivienda', 'Observaciones'
    ],
    fields: [
      'numero_serie', 'marca', 'modelo', 'fecha_instalacion', 'fecha_ultima_verificacion',
      'comunidad_codigo', 'agrupacion_nombre', 'ubicacion_nombre', 'observaciones'
    ],
    required: ['numero_serie', 'comunidad_codigo', 'agrupacion_nombre', 'ubicacion_nombre'],
    example: {
      numero_serie: 'ABC123456',
      marca: 'Zenner',
      modelo: 'MTKD',
      fecha_instalacion: '01/01/2024',
      fecha_ultima_verificacion: '',
      comunidad_codigo: 'TROYA40',
      agrupacion_nombre: '1',
      ubicacion_nombre: '1ºA',
      observaciones: ''
    }
  }
}

// Alias para compatibilidad
const COLUMN_CONFIG = COLUMN_CONFIG_BASE

/**
 * Genera configuración dinámica de contadores con columnas de conceptos
 * @param {Array} conceptos - Array de conceptos activos [{codigo, nombre, unidad_medida}]
 * @returns {Object} Configuración de columnas para contadores
 */
export function generarConfigContadores(conceptos = []) {
  const baseConfig = { ...COLUMN_CONFIG_BASE.contadores }
  
  if (!conceptos || conceptos.length === 0) {
    return baseConfig
  }
  
  // Columnas base (sin observaciones al final, lo movemos después de conceptos)
  const headersBase = [
    'Nº Serie', 'Marca', 'Modelo', 'Fecha Instalación', 'Fecha Verificación',
    'Código Comunidad', 'Portal', 'Vivienda'
  ]
  const fieldsBase = [
    'numero_serie', 'marca', 'modelo', 'fecha_instalacion', 'fecha_ultima_verificacion',
    'comunidad_codigo', 'agrupacion_nombre', 'ubicacion_nombre'
  ]
  
  // Añadir columnas de conceptos
  const conceptoHeaders = []
  const conceptoFields = []
  const conceptoExample = {}
  
  conceptos.forEach(concepto => {
    const codigo = concepto.codigo.toUpperCase()
    // Columna de lectura inicial
    conceptoHeaders.push(`${codigo}_Lectura`)
    conceptoFields.push(`${codigo.toLowerCase()}_lectura`)
    conceptoExample[`${codigo.toLowerCase()}_lectura`] = '0'
    
    // Columna de fecha inicial
    conceptoHeaders.push(`${codigo}_Fecha`)
    conceptoFields.push(`${codigo.toLowerCase()}_fecha`)
    conceptoExample[`${codigo.toLowerCase()}_fecha`] = '01/01/2024'
  })
  
  return {
    headers: [...headersBase, ...conceptoHeaders, 'Observaciones'],
    fields: [...fieldsBase, ...conceptoFields, 'observaciones'],
    required: ['numero_serie', 'comunidad_codigo', 'agrupacion_nombre', 'ubicacion_nombre'],
    example: {
      ...COLUMN_CONFIG_BASE.contadores.example,
      ...conceptoExample
    },
    conceptos: conceptos.map(c => c.codigo.toUpperCase())
  }
}

/**
 * Genera una plantilla Excel vacía para una entidad
 * @param {string} entidad - 'comunidades' | 'clientes' | 'contadores'
 * @param {boolean} incluirEjemplo - Si incluir una fila de ejemplo
 * @param {Object} options - Opciones adicionales
 * @param {Array} options.conceptos - Conceptos activos (para contadores)
 * @returns {string} Nombre del archivo generado
 */
export function generarPlantillaVacia(entidad, incluirEjemplo = true, options = {}) {
  let config
  
  // Para contadores, generar config dinámica con conceptos
  if (entidad === 'contadores' && options.conceptos) {
    config = generarConfigContadores(options.conceptos)
  } else {
    config = COLUMN_CONFIG[entidad]
  }
  
  if (!config) {
    throw new Error(`Entidad no soportada: ${entidad}`)
  }

  // Crear worksheet con cabeceras
  const wsData = [config.headers]
  
  // Añadir fila de ejemplo si se solicita
  if (incluirEjemplo) {
    const ejemploRow = config.fields.map(field => config.example[field] || '')
    wsData.push(ejemploRow)
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData)
  
  // Ajustar ancho de columnas
  const colWidths = config.headers.map(h => ({ wch: Math.max(h.length + 2, 15) }))
  ws['!cols'] = colWidths

  // Crear workbook
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')

  // Añadir hoja de instrucciones
  const instrucciones = generarHojaInstrucciones(entidad, config, options.conceptos)
  XLSX.utils.book_append_sheet(wb, instrucciones, 'Instrucciones')

  // Generar y descargar
  const fileName = `plantilla_${entidad}_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
  
  return fileName
}

/**
 * Genera hoja de instrucciones para la plantilla
 */
function generarHojaInstrucciones(entidad, config, conceptos = []) {
  const instrucciones = [
    [`INSTRUCCIONES PARA IMPORTAR ${entidad.toUpperCase()}`],
    [''],
    ['CAMPOS OBLIGATORIOS:'],
    ...config.required.map((field, idx) => {
      const headerIdx = config.fields.indexOf(field)
      return [`  ${idx + 1}. ${config.headers[headerIdx]}`]
    }),
    [''],
    ['FORMATO DE DATOS:'],
    ['  - Fechas: DD/MM/YYYY (ej: 01/01/2024)'],
    ['  - NIF: 8 dígitos + letra (ej: 12345678A)'],
    ['  - IBAN: 24 caracteres sin espacios (ej: ES1234567890123456789012)'],
    ['  - Tipo cliente: "propietario" o "inquilino"'],
    [''],
    ['CAMPOS DE UBICACIÓN (para Clientes y Contadores):'],
    ['  - Código Comunidad: Código único de la comunidad (ej: TROYA40)'],
    ['  - Portal: Nombre del portal/bloque (ej: 1, 2, A, B)'],
    ['  - Vivienda: Nombre de la vivienda (ej: 1ºA, 2ºB, Bajo C)'],
    ['']
  ]
  
  // Añadir instrucciones de conceptos para contadores
  if (entidad === 'contadores' && conceptos && conceptos.length > 0) {
    instrucciones.push(
      ['CONCEPTOS ASIGNADOS AL CONTADOR:'],
      ['  Para asignar conceptos al contador, rellene las columnas de lectura y fecha:'],
      ['']
    )
    conceptos.forEach(concepto => {
      const codigo = concepto.codigo.toUpperCase()
      instrucciones.push(
        [`  ${codigo} - ${concepto.nombre} (${concepto.unidad_medida}):`],
        [`    - ${codigo}_Lectura: Lectura inicial (número, ej: 0 o 125.50)`],
        [`    - ${codigo}_Fecha: Fecha de lectura inicial (DD/MM/YYYY)`]
      )
    })
    instrucciones.push(
      [''],
      ['  NOTA: Solo se asignarán los conceptos que tengan AMBOS campos rellenados'],
      ['        (lectura Y fecha). Deje vacíos los conceptos que no apliquen.'],
      ['']
    )
  }
  
  instrucciones.push(
    ['NOTAS:'],
    ['  - La primera fila (cabeceras) NO se importa'],
    ['  - Deje las celdas vacías si no tiene el dato'],
    ['  - Si el código/NIF/Nº serie ya existe, se actualizarán los datos']
  )

  return XLSX.utils.aoa_to_sheet(instrucciones)
}

/**
 * Exporta datos existentes a Excel
 * @param {string} entidad - 'comunidades' | 'clientes' | 'contadores'
 * @param {Array} datos - Array de objetos con los datos
 * @param {Object} options - Opciones adicionales
 * @param {Array} options.conceptos - Conceptos activos (para contadores)
 * @returns {string} Nombre del archivo generado
 */
export function exportarDatos(entidad, datos, options = {}) {
  let config
  
  // Para contadores, generar config dinámica con conceptos
  if (entidad === 'contadores' && options.conceptos) {
    config = generarConfigContadores(options.conceptos)
  } else {
    config = COLUMN_CONFIG[entidad]
  }
  
  if (!config) {
    throw new Error(`Entidad no soportada: ${entidad}`)
  }

  if (!datos || datos.length === 0) {
    throw new Error('No hay datos para exportar')
  }

  // Transformar datos según la entidad
  const datosTransformados = datos.map(item => 
    transformarParaExport(entidad, item, options.conceptos)
  )

  // Crear filas de datos
  const wsData = [config.headers]
  datosTransformados.forEach(item => {
    const row = config.fields.map(field => {
      const value = item[field]
      if (value === null || value === undefined) return ''
      if (value instanceof Date) return formatDate(value)
      return String(value)
    })
    wsData.push(row)
  })

  const ws = XLSX.utils.aoa_to_sheet(wsData)
  
  // Ajustar ancho de columnas
  const colWidths = config.headers.map(h => ({ wch: Math.max(h.length + 2, 15) }))
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')

  const fileName = `export_${entidad}_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
  
  return fileName
}

/**
 * Transforma un registro de BD al formato de exportación
 */
function transformarParaExport(entidad, item, conceptos = []) {
  switch (entidad) {
    case 'comunidades':
      return {
        codigo: item.codigo,
        nombre: item.nombre,
        cif: item.cif,
        direccion: item.direccion,
        codigo_postal: item.codigo_postal,
        ciudad: item.ciudad,
        provincia: item.provincia,
        email: item.email,
        telefono: item.telefono,
        persona_contacto: item.persona_contacto,
        nombre_agrupacion: item.nombre_agrupacion,
        nombre_ubicacion: item.nombre_ubicacion
      }
    
    case 'clientes':
      // Obtener ubicación actual si existe
      const ubicacionActual = item.ubicaciones_clientes?.find(uc => uc.es_actual)
      return {
        nif: item.nif,
        nombre: item.nombre,
        apellidos: item.apellidos,
        tipo: item.tipo,
        email: item.email,
        telefono: item.telefono,
        telefono_secundario: item.telefono_secundario,
        iban: item.iban,
        titular_cuenta: item.titular_cuenta,
        codigo_cliente: item.codigo_cliente,
        direccion_correspondencia: item.direccion_correspondencia,
        cp_correspondencia: item.cp_correspondencia,
        ciudad_correspondencia: item.ciudad_correspondencia,
        provincia_correspondencia: item.provincia_correspondencia,
        comunidad_codigo: ubicacionActual?.ubicacion?.agrupacion?.comunidad?.codigo || '',
        agrupacion_nombre: ubicacionActual?.ubicacion?.agrupacion?.nombre || '',
        ubicacion_nombre: ubicacionActual?.ubicacion?.nombre || ''
      }
    
    case 'contadores':
      const base = {
        numero_serie: item.numero_serie,
        marca: item.marca,
        modelo: item.modelo,
        fecha_instalacion: item.fecha_instalacion,
        fecha_ultima_verificacion: item.fecha_ultima_verificacion,
        comunidad_codigo: item.ubicacion?.agrupacion?.comunidad?.codigo || '',
        agrupacion_nombre: item.ubicacion?.agrupacion?.nombre || '',
        ubicacion_nombre: item.ubicacion?.nombre || '',
        observaciones: item.observaciones
      }
      
      // Añadir columnas de conceptos asignados
      if (conceptos && conceptos.length > 0 && item.contadores_conceptos) {
        conceptos.forEach(concepto => {
          const codigoLower = concepto.codigo.toLowerCase()
          // Buscar si este contador tiene este concepto asignado
          const conceptoAsignado = item.contadores_conceptos?.find(
            cc => cc.concepto?.codigo?.toUpperCase() === concepto.codigo.toUpperCase()
          )
          
          if (conceptoAsignado) {
            base[`${codigoLower}_lectura`] = conceptoAsignado.lectura_inicial || 0
            base[`${codigoLower}_fecha`] = formatDate(conceptoAsignado.fecha_lectura_inicial)
          } else {
            base[`${codigoLower}_lectura`] = ''
            base[`${codigoLower}_fecha`] = ''
          }
        })
      }
      
      return base
    
    default:
      return item
  }
}

/**
 * Formatea fecha para Excel
 */
function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Lee un archivo Excel y devuelve los datos parseados
 * @param {File} file - Archivo Excel
 * @param {Object} options - Opciones de lectura
 * @param {Array} options.conceptos - Conceptos activos (para detectar columnas dinámicas)
 * @returns {Promise<{headers: string[], rows: any[], entidad: string, conceptosDetectados: string[]}>}
 */
export async function leerExcel(file, options = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        
        // Usar la primera hoja (Datos)
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // Convertir a JSON con valores crudos para que las fechas vengan como números seriales
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true })
        
        if (jsonData.length < 2) {
          reject(new Error('El archivo debe tener al menos una cabecera y una fila de datos'))
          return
        }

        const headers = jsonData[0]
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== '' && cell != null))
        
        // Detectar entidad basándose en las cabeceras
        const entidad = detectarEntidad(headers)
        
        // Detectar columnas de conceptos (para contadores)
        const conceptosDetectados = detectarColumnasConceptos(headers)
        
        // Obtener config (dinámica para contadores si hay conceptos)
        let config
        if (entidad === 'contadores' && options.conceptos) {
          config = generarConfigContadores(options.conceptos)
        } else {
          config = COLUMN_CONFIG[entidad]
        }
        
        // Parsear filas a objetos
        const parsedRows = rows.map((row, index) => {
          const obj = { _rowIndex: index + 2 } // +2 por cabecera y base 1
          
          headers.forEach((header, colIndex) => {
            // Buscar en config estática
            const fieldIndex = config.headers.indexOf(header)
            if (fieldIndex !== -1) {
              const field = config.fields[fieldIndex]
              obj[field] = row[colIndex] || null
            } else {
              // Para columnas de conceptos no reconocidas, guardar con nombre normalizado
              const headerLower = header?.toLowerCase() || ''
              if (headerLower.endsWith('_lectura') || headerLower.endsWith('_fecha')) {
                obj[headerLower] = row[colIndex] || null
              }
            }
          })
          return obj
        })

        resolve({
          headers,
          rows: parsedRows,
          entidad,
          totalRows: parsedRows.length,
          conceptosDetectados
        })
      } catch (error) {
        reject(new Error(`Error al leer el archivo: ${error.message}`))
      }
    }
    
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Detecta columnas de conceptos en los headers
 * Busca patrones como ACS_Lectura, ACS_Fecha, CAL_Lectura, etc.
 * @param {string[]} headers - Cabeceras del Excel
 * @returns {string[]} Array de códigos de conceptos detectados
 */
function detectarColumnasConceptos(headers) {
  const conceptos = new Set()
  
  headers.forEach(header => {
    if (!header) return
    const headerLower = header.toLowerCase()
    
    // Buscar patrón CODIGO_Lectura o CODIGO_Fecha
    const matchLectura = headerLower.match(/^([a-z]+)_lectura$/)
    const matchFecha = headerLower.match(/^([a-z]+)_fecha$/)
    
    if (matchLectura) {
      conceptos.add(matchLectura[1].toUpperCase())
    }
    if (matchFecha) {
      conceptos.add(matchFecha[1].toUpperCase())
    }
  })
  
  return Array.from(conceptos)
}

/**
 * Detecta la entidad basándose en las cabeceras del Excel
 */
function detectarEntidad(headers) {
  const headersLower = headers.map(h => h?.toLowerCase() || '')
  
  // Comunidades: tiene "Código" y "Nombre" pero no "NIF" ni "Nº Serie"
  if (headersLower.includes('código') && headersLower.includes('nombre') && 
      !headersLower.includes('nif') && !headersLower.includes('nº serie')) {
    return 'comunidades'
  }
  
  // Clientes: tiene "NIF"
  if (headersLower.includes('nif')) {
    return 'clientes'
  }
  
  // Contadores: tiene "Nº Serie"
  if (headersLower.includes('nº serie')) {
    return 'contadores'
  }
  
  throw new Error('No se pudo detectar el tipo de datos. Verifica que las cabeceras sean correctas.')
}

/**
 * Obtiene la configuración de columnas para una entidad
 */
export function getColumnConfig(entidad) {
  return COLUMN_CONFIG[entidad]
}

export default {
  generarPlantillaVacia,
  exportarDatos,
  leerExcel,
  getColumnConfig,
  generarConfigContadores,
  COLUMN_CONFIG
}
