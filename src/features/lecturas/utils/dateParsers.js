/**
 * Utilidades para parseo de fechas en múltiples formatos
 * Sistema de Facturación A360
 */

/**
 * Parsea una fecha desde varios formatos posibles
 * @param {string|Date|number} value - Valor a parsear
 * @returns {Date|null} - Fecha parseada o null si no es válida
 */
export function parseDate(value) {
  if (!value) return null
  
  // Si ya es una fecha válida
  if (value instanceof Date && !isNaN(value)) {
    return value
  }
  
  // Si es un número de serie de Excel (días desde 1900-01-01)
  if (typeof value === 'number') {
    return parseExcelSerialDate(value)
  }
  
  const str = String(value).trim()
  if (!str) return null
  
  // Intentar parsear con diferentes formatos
  const parsers = [
    parseDDMMYYYY,      // 23/11/2025, 23-11-2025, 23.11.2025
    parseYYYYMMDD,      // 2025-11-23, 2025/11/23
    parseDDMMYY,        // 23/11/25
    parseDMYYYY,        // 3/1/2025
  ]
  
  for (const parser of parsers) {
    const result = parser(str)
    if (result) return result
  }
  
  // Último intento: Date nativo
  const nativeDate = new Date(str)
  if (!isNaN(nativeDate)) {
    return nativeDate
  }
  
  return null
}

/**
 * Parsea número de serie de Excel a Date
 * Excel usa días desde 1900-01-01 (con un bug conocido del año bisiesto 1900)
 */
function parseExcelSerialDate(serial) {
  // Excel considera erróneamente 1900 como año bisiesto
  // Por lo que fechas después del 28/02/1900 tienen un día extra
  const excelEpoch = new Date(1899, 11, 30) // 30/12/1899
  const millisecondsPerDay = 24 * 60 * 60 * 1000
  
  const date = new Date(excelEpoch.getTime() + serial * millisecondsPerDay)
  
  // Validar que la fecha sea razonable (entre 2000 y 2100)
  const year = date.getFullYear()
  if (year < 2000 || year > 2100) {
    return null
  }
  
  return date
}

/**
 * Parsea formato DD/MM/YYYY o DD-MM-YYYY o DD.MM.YYYY
 */
function parseDDMMYYYY(str) {
  const match = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
  if (!match) return null
  
  const [, day, month, year] = match
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  
  // Validar que la fecha sea correcta
  if (date.getDate() !== parseInt(day) || 
      date.getMonth() !== parseInt(month) - 1 ||
      date.getFullYear() !== parseInt(year)) {
    return null
  }
  
  return date
}

/**
 * Parsea formato YYYY-MM-DD o YYYY/MM/DD (ISO)
 */
function parseYYYYMMDD(str) {
  const match = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
  if (!match) return null
  
  const [, year, month, day] = match
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  
  if (date.getDate() !== parseInt(day) || 
      date.getMonth() !== parseInt(month) - 1 ||
      date.getFullYear() !== parseInt(year)) {
    return null
  }
  
  return date
}

/**
 * Parsea formato DD/MM/YY
 */
function parseDDMMYY(str) {
  const match = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/)
  if (!match) return null
  
  const [, day, month, yearShort] = match
  // Asumir siglo 21 para años 00-99
  const year = 2000 + parseInt(yearShort)
  const date = new Date(year, parseInt(month) - 1, parseInt(day))
  
  if (date.getDate() !== parseInt(day) || 
      date.getMonth() !== parseInt(month) - 1) {
    return null
  }
  
  return date
}

/**
 * Parsea formato D/M/YYYY (día y mes sin cero inicial)
 */
function parseDMYYYY(str) {
  // Ya cubierto por parseDDMMYYYY con \d{1,2}
  return null
}

/**
 * Formatea una fecha al formato español DD/MM/YYYY
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} - Fecha formateada
 */
export function formatDate(date) {
  if (!date) return ''
  
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d)) return ''
  
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  
  return `${day}/${month}/${year}`
}

/**
 * Formatea una fecha para input type="date" (YYYY-MM-DD)
 */
export function formatDateISO(date) {
  if (!date) return ''
  
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d)) return ''
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * Compara si dos fechas son el mismo día
 */
export function isSameDay(date1, date2) {
  if (!date1 || !date2) return false
  
  const d1 = date1 instanceof Date ? date1 : new Date(date1)
  const d2 = date2 instanceof Date ? date2 : new Date(date2)
  
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate()
}

/**
 * Verifica si una fecha es futura (posterior a hoy)
 */
export function isFutureDate(date) {
  if (!date) return false
  
  const d = date instanceof Date ? date : new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  
  return d > today
}
