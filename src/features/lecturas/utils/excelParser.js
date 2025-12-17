import * as XLSX from 'xlsx'

/**
 * Mapeos de nombres de columnas aceptados
 */
export const COLUMN_MAPPINGS = {
  numero_contador: [
    'nº contador', 'n contador', 'numero contador', 'num contador',
    'contador', 'serie', 'nº serie', 'numero serie', 'id contador',
    'num_contador', 'n_contador', 'ncontador', 'no contador'
  ],
  concepto: [
    'concepto', 'tipo', 'servicio', 'tipo consumo', 'tipo lectura',
    'tipo_consumo', 'tipo_lectura'
  ],
  lectura: [
    'lectura', 'lectura actual', 'valor', 'medicion', 'lectura m3',
    'lectura kcal', 'lectura frig', 'lectura_actual', 'lect_act',
    'lectura actual m3', 'valor lectura'
  ],
  fecha_lectura: [
    'fecha', 'fecha lectura', 'fecha de lectura', 'f. lectura', 'dia',
    'fecha_lectura', 'f_lectura', 'date'
  ],
  portal: [
    'portal', 'bloque', 'escalera', 'edificio', 'agrupacion'
  ],
  vivienda: [
    'vivienda', 'piso', 'puerta', 'local', 'unidad', 'ubicacion'
  ]
}

/**
 * Lee un archivo Excel y retorna los datos parseados
 */
export async function readExcel(file) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { 
    type: 'array', 
    cellDates: true,
    dateNF: 'dd/mm/yyyy'
  })
  
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  
  // Leer como array de arrays
  const data = XLSX.utils.sheet_to_json(sheet, { 
    header: 1,
    raw: false,
    defval: ''
  })
  
  if (data.length < 2) {
    throw new Error('El archivo debe contener al menos una fila de datos además del encabezado')
  }
  
  const headers = data[0].map(h => String(h || '').trim().toLowerCase())
  const rows = data.slice(1).filter(row => row.some(cell => cell !== ''))
  
  return {
    headers,
    headersOriginal: data[0],
    rows,
    totalRows: rows.length,
    sheetName
  }
}

/**
 * Detecta automáticamente el mapeo de columnas
 */
export function detectColumnMapping(headers) {
  const mapping = {}
  const usedIndices = new Set()
  
  // Para cada tipo de columna requerida
  for (const [key, variants] of Object.entries(COLUMN_MAPPINGS)) {
    let foundIndex = -1
    
    // Buscar en los headers
    for (let i = 0; i < headers.length; i++) {
      if (usedIndices.has(i)) continue
      
      const header = String(headers[i] || '').toLowerCase().trim()
      
      // Buscar coincidencia exacta o parcial
      for (const variant of variants) {
        if (header === variant || header.includes(variant) || variant.includes(header)) {
          foundIndex = i
          break
        }
      }
      
      if (foundIndex !== -1) break
    }
    
    if (foundIndex !== -1) {
      mapping[key] = foundIndex
      usedIndices.add(foundIndex)
    }
  }
  
  return mapping
}

/**
 * Valida que el mapeo tenga las columnas obligatorias
 */
export function validateMapping(mapping) {
  const required = ['numero_contador', 'concepto', 'lectura', 'fecha_lectura']
  const missing = required.filter(key => mapping[key] === undefined)
  
  return {
    isValid: missing.length === 0,
    missing
  }
}

/**
 * Parsea un valor numérico (soporta formato español e internacional)
 */
export function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null
  
  // Si ya es número
  if (typeof value === 'number') return value
  
  // Convertir a string y limpiar
  let str = String(value).trim()
  
  // Detectar formato español (1.234,56) vs internacional (1,234.56)
  const hasCommaSeparator = str.includes(',')
  const hasDotSeparator = str.includes('.')
  
  if (hasCommaSeparator && hasDotSeparator) {
    // Tiene ambos - determinar cuál es decimal
    const lastComma = str.lastIndexOf(',')
    const lastDot = str.lastIndexOf('.')
    
    if (lastComma > lastDot) {
      // Formato español: 1.234,56
      str = str.replace(/\./g, '').replace(',', '.')
    } else {
      // Formato internacional: 1,234.56
      str = str.replace(/,/g, '')
    }
  } else if (hasCommaSeparator) {
    // Solo coma - asumimos que es decimal
    str = str.replace(',', '.')
  }
  
  const num = parseFloat(str)
  return isNaN(num) ? null : num
}

/**
 * Parsea una fecha en múltiples formatos
 */
export function parseDate(value) {
  if (!value) return null
  
  // Si ya es Date
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value
  }
  
  const str = String(value).trim()
  
  // Intentar diferentes formatos
  const formats = [
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD-MM-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    // DD.MM.YYYY
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
    // YYYY-MM-DD (ISO)
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  ]
  
  for (const regex of formats) {
    const match = str.match(regex)
    if (match) {
      let day, month, year
      
      if (regex === formats[3]) {
        // Formato ISO
        [, year, month, day] = match
      } else {
        [, day, month, year] = match
      }
      
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      if (!isNaN(date.getTime())) {
        return date
      }
    }
  }
  
  // Intentar parseo directo
  const parsed = new Date(str)
  return isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Normaliza un código de concepto
 */
export function parseConcepto(value) {
  if (!value) return null
  
  const str = String(value).trim().toUpperCase()
  
  // Mapeo de variantes conocidas
  const conceptoMap = {
    'ACS': 'ACS',
    'AGUA CALIENTE': 'ACS',
    'AGUA CALIENTE SANITARIA': 'ACS',
    'CAL': 'CAL',
    'CALEFACCION': 'CAL',
    'CALEFACCIÓN': 'CAL',
    'CLI': 'CLI',
    'CLIMATIZACION': 'CLI',
    'CLIMATIZACIÓN': 'CLI',
    'TF': 'TF',
    'TERMINO FIJO': 'TF',
    'TÉRMINO FIJO': 'TF',
  }
  
  return conceptoMap[str] || str
}

/**
 * Extrae los datos de una fila según el mapeo
 */
export function extractRowData(row, mapping) {
  return {
    numero_contador: row[mapping.numero_contador]?.toString().trim() || null,
    concepto_codigo: parseConcepto(row[mapping.concepto]),
    lectura_valor: parseNumber(row[mapping.lectura]),
    fecha_lectura: parseDate(row[mapping.fecha_lectura]),
    portal: mapping.portal !== undefined ? row[mapping.portal]?.toString().trim() : null,
    vivienda: mapping.vivienda !== undefined ? row[mapping.vivienda]?.toString().trim() : null,
    datos_originales: row
  }
}

/**
 * Formatea una fecha para mostrar
 */
export function formatDateForDisplay(date) {
  if (!date) return '-'
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '-'
  
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Formatea una fecha para la BD (YYYY-MM-DD)
 */
export function formatDateForDB(date) {
  if (!date) return null
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return null
  
  return d.toISOString().split('T')[0]
}



