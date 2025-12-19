/**
 * Parser de archivos Excel para importación de lecturas
 * Sistema de Facturación A360
 * 
 * Estructura esperada del Excel (Plantilla Maestra):
 * | Fecha | Nº Contador | Portal | Vivienda | ACS | CAL | CLI | ... |
 */

import * as XLSX from 'xlsx'
import { parseDate } from './dateParsers'
import { parseNumber } from './numberParsers'

/**
 * Lee un archivo Excel y retorna los datos parseados
 * @param {File} file - Archivo Excel a leer
 * @returns {Promise<{ headers: string[], rows: any[][], totalRows: number, sheetName: string }>}
 */
export async function readExcelFile(file) {
  const buffer = await file.arrayBuffer()
  
  const workbook = XLSX.read(buffer, { 
    type: 'array',
    cellDates: false,  // Mantener fechas como números de serie para parseadarlas manualmente
    cellNF: false,
    cellText: false
  })
  
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  
  if (!sheet) {
    throw new Error('El archivo Excel está vacío o no tiene hojas de cálculo')
  }
  
  // Leer como array 2D
  const data = XLSX.utils.sheet_to_json(sheet, { 
    header: 1,
    raw: true,       // Mantener valores crudos
    defval: ''       // Valor por defecto para celdas vacías
  })
  
  if (data.length === 0) {
    throw new Error('El archivo Excel no contiene datos')
  }
  
  // Primera fila son los headers
  const headers = data[0].map(h => h ? String(h).trim() : '')
  const rows = data.slice(1).filter(row => {
    // Filtrar filas completamente vacías
    return row.some(cell => cell !== '' && cell !== null && cell !== undefined)
  })
  
  return {
    headers,
    rows,
    totalRows: rows.length,
    sheetName
  }
}

/**
 * Variantes aceptadas para cada columna fija
 */
export const COLUMN_MAPPINGS = {
  fecha_lectura: [
    'fecha', 'fecha lectura', 'fecha de lectura', 'f. lectura', 'dia', 'date',
    'fecha_lectura', 'fechalectura'
  ],
  numero_contador: [
    'nº contador', 'n contador', 'numero contador', 'num contador',
    'contador', 'serie', 'nº serie', 'numero serie', 'id contador',
    'numero_contador', 'numerocontador', 'n° contador', 'no contador'
  ],
  portal: [
    'portal', 'bloque', 'escalera', 'edificio', 'port'
  ],
  vivienda: [
    'vivienda', 'piso', 'puerta', 'local', 'unidad', 'viv', 'dpto',
    'departamento', 'apartamento'
  ]
}

/**
 * Detecta el mapeo de columnas fijas a partir de los headers del Excel
 * @param {string[]} headers - Headers del Excel
 * @returns {Object} - Mapeo de columna a índice
 */
export function detectFixedColumns(headers) {
  const mapping = {
    fecha_lectura: -1,
    numero_contador: -1,
    portal: -1,
    vivienda: -1
  }
  
  const headersLower = headers.map(h => h.toLowerCase().trim())
  
  for (const [field, variants] of Object.entries(COLUMN_MAPPINGS)) {
    for (let i = 0; i < headersLower.length; i++) {
      if (variants.includes(headersLower[i])) {
        mapping[field] = i
        break
      }
    }
  }
  
  return mapping
}

/**
 * Detecta las columnas que corresponden a conceptos configurados
 * @param {string[]} headers - Headers del Excel
 * @param {Array<{id: string, codigo: string, nombre: string, unidad_medida: string}>} conceptosActivos
 * @returns {Object} - Mapeo de índice de columna a información del concepto
 */
export function detectConceptColumns(headers, conceptosActivos) {
  const columnasConceptos = {}
  
  if (!conceptosActivos || conceptosActivos.length === 0) {
    return columnasConceptos
  }
  
  headers.forEach((header, index) => {
    if (!header) return
    
    const headerNormalizado = String(header).trim().toUpperCase()
    
    // Buscar si el header coincide con algún código de concepto
    const concepto = conceptosActivos.find(c => 
      c.codigo.toUpperCase() === headerNormalizado
    )
    
    if (concepto) {
      columnasConceptos[index] = {
        concepto_id: concepto.id,
        concepto_codigo: concepto.codigo,
        concepto_nombre: concepto.nombre,
        unidad_medida: concepto.unidad_medida,
        es_termino_fijo: concepto.es_termino_fijo || false
      }
    }
  })
  
  return columnasConceptos
}

/**
 * Analiza la estructura del Excel y retorna información sobre el mapeo
 * @param {string[]} headers - Headers del Excel
 * @param {Array} conceptosActivos - Conceptos activos desde la BD
 * @returns {Object} - Análisis completo de la estructura
 */
export function analyzeExcelStructure(headers, conceptosActivos) {
  const fixedColumns = detectFixedColumns(headers)
  const conceptColumns = detectConceptColumns(headers, conceptosActivos)
  
  // Detectar columnas no reconocidas
  const usedIndices = new Set([
    ...Object.values(fixedColumns).filter(i => i >= 0),
    ...Object.keys(conceptColumns).map(Number)
  ])
  
  const unknownColumns = headers
    .map((header, index) => ({ header, index }))
    .filter(({ header, index }) => 
      header && header.trim() !== '' && !usedIndices.has(index)
    )
  
  // Validaciones
  const errors = []
  const warnings = []
  
  if (fixedColumns.fecha_lectura === -1) {
    errors.push('No se encontró la columna de Fecha (obligatoria)')
  }
  
  if (fixedColumns.numero_contador === -1) {
    errors.push('No se encontró la columna de Nº Contador (obligatoria)')
  }
  
  if (Object.keys(conceptColumns).length === 0) {
    errors.push('No se detectaron columnas de conceptos (ACS, CAL, CLI, etc.)')
  }
  
  if (unknownColumns.length > 0) {
    warnings.push(`Columnas no reconocidas (se ignorarán): ${unknownColumns.map(c => c.header).join(', ')}`)
  }
  
  return {
    fixedColumns,
    conceptColumns,
    unknownColumns,
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalColumns: headers.length,
      fixedColumnsFound: Object.values(fixedColumns).filter(i => i >= 0).length,
      conceptColumnsFound: Object.keys(conceptColumns).length,
      conceptCodes: Object.values(conceptColumns).map(c => c.concepto_codigo)
    }
  }
}

/**
 * Extrae los datos de una fila según el mapeo detectado (nuevo formato)
 * @param {any[]} row - Fila del Excel
 * @param {Object} fixedColumns - Mapeo de columnas fijas
 * @returns {Object} - Datos extraídos de la fila
 */
export function extractRowDataNew(row, fixedColumns) {
  return {
    fecha_lectura: fixedColumns.fecha_lectura >= 0 ? row[fixedColumns.fecha_lectura] : null,
    numero_contador: fixedColumns.numero_contador >= 0 ? row[fixedColumns.numero_contador] : null,
    portal: fixedColumns.portal >= 0 ? row[fixedColumns.portal] : null,
    vivienda: fixedColumns.vivienda >= 0 ? row[fixedColumns.vivienda] : null
  }
}

/**
 * Parsea un string genérico
 */
export function parseString(value) {
  if (value === null || value === undefined) return null
  const str = String(value).trim()
  return str === '' ? null : str
}

/**
 * Genera una vista previa de las primeras N filas del Excel
 * @param {string[]} headers - Headers
 * @param {any[][]} rows - Filas de datos
 * @param {number} limit - Cantidad máxima de filas a mostrar
 * @returns {Array<Object>} - Filas como objetos con headers como keys
 */
export function getPreviewData(headers, rows, limit = 5) {
  return rows.slice(0, limit).map((row, rowIndex) => {
    const obj = { _rowIndex: rowIndex + 1 }
    headers.forEach((header, colIndex) => {
      obj[header || `col_${colIndex}`] = row[colIndex]
    })
    return obj
  })
}

// =====================================================
// Funciones de compatibilidad con el formato antiguo
// =====================================================

/**
 * Alias para readExcelFile (compatibilidad)
 */
export const readExcel = async (file) => {
  const result = await readExcelFile(file)
  return {
    ...result,
    headersOriginal: result.headers
  }
}

/**
 * Detecta el mapeo de columnas automáticamente (formato antiguo)
 * @param {string[]} headers - Headers del Excel
 * @returns {Object} - Mapeo de campos a índices
 */
export function detectColumnMapping(headers) {
  const mapping = {}
  const headersLower = headers.map(h => h ? String(h).toLowerCase().trim() : '')
  
  // Mapeo de campos a variantes aceptadas
  const fieldVariants = {
    numero_contador: ['nº contador', 'n contador', 'numero contador', 'num contador', 'contador', 
                      'serie', 'nº serie', 'numero serie', 'id contador', 'numero_contador', 
                      'n° contador', 'no contador'],
    concepto_codigo: ['concepto', 'cod concepto', 'codigo concepto', 'concepto_codigo', 'tipo'],
    lectura_valor: ['lectura', 'valor', 'lectura actual', 'lectura_valor', 'valor lectura'],
    fecha_lectura: ['fecha', 'fecha lectura', 'fecha de lectura', 'f. lectura', 'fecha_lectura', 'date'],
    portal: ['portal', 'bloque', 'escalera', 'edificio', 'port'],
    vivienda: ['vivienda', 'piso', 'puerta', 'local', 'unidad', 'viv', 'dpto']
  }
  
  for (const [field, variants] of Object.entries(fieldVariants)) {
    for (let i = 0; i < headersLower.length; i++) {
      if (variants.includes(headersLower[i])) {
        mapping[field] = i
        break
      }
    }
  }
  
  return mapping
}

/**
 * Valida que el mapeo tenga las columnas requeridas
 * @param {Object} mapping - Mapeo de columnas
 * @returns {{ isValid: boolean, missing: string[] }}
 */
export function validateMapping(mapping) {
  const required = ['numero_contador', 'concepto_codigo', 'lectura_valor', 'fecha_lectura']
  const missing = required.filter(field => mapping[field] === undefined || mapping[field] === -1)
  
  return {
    isValid: missing.length === 0,
    missing
  }
}

/**
 * Extrae datos de una fila según el mapeo (formato antiguo)
 */
export function extractRowDataLegacy(row, mapping) {
  const getValue = (field) => {
    const idx = mapping[field]
    return idx !== undefined && idx >= 0 ? row[idx] : null
  }
  
  const rawFecha = getValue('fecha_lectura')
  const rawLectura = getValue('lectura_valor')
  
  return {
    numero_contador: parseString(getValue('numero_contador')),
    concepto_codigo: parseString(getValue('concepto_codigo')),
    lectura_valor: parseNumber(rawLectura),
    fecha_lectura: parseDate(rawFecha),
    portal: parseString(getValue('portal')),
    vivienda: parseString(getValue('vivienda')),
    datos_originales: {
      numero_contador: getValue('numero_contador'),
      concepto: getValue('concepto_codigo'),
      lectura: rawLectura,
      fecha: rawFecha,
      portal: getValue('portal'),
      vivienda: getValue('vivienda')
    }
  }
}

// Alias para compatibilidad
export { extractRowDataLegacy as extractRowData }

/**
 * Formatea una fecha para guardar en la base de datos (ISO format)
 * @param {Date|string|number} dateValue - Valor de fecha
 * @returns {string|null} - Fecha en formato ISO o null
 */
export function formatDateForDB(dateValue) {
  if (!dateValue) return null
  
  // Si ya es una fecha Date
  if (dateValue instanceof Date) {
    if (isNaN(dateValue.getTime())) return null
    return dateValue.toISOString().split('T')[0]
  }
  
  // Si es string, intentar parsear
  const parsed = parseDate(dateValue)
  if (!parsed) return null
  
  return parsed.toISOString().split('T')[0]
}
