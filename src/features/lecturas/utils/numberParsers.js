/**
 * Utilidades para parseo de números en formatos español e internacional
 * Sistema de Facturación A360
 */

import { truncarDecimales, PRECISION_LECTURAS } from '@/utils/precision'

/**
 * Parsea un número desde string con soporte para formatos español e internacional
 * @param {string|number} value - Valor a parsear
 * @param {boolean} esLectura - Si es una lectura, truncar a 3 decimales
 * @returns {number|null} - Número parseado o null si no es válido/está vacío
 */
export function parseNumber(value, esLectura = false) {
  // Si ya es un número válido
  if (typeof value === 'number' && !isNaN(value)) {
    return value
  }
  
  // Si es null, undefined o string vacío
  if (value === null || value === undefined) {
    return null
  }
  
  const str = String(value).trim()
  
  // String vacío = celda vacía, retornar null (no es error)
  if (str === '') {
    return null
  }
  
  // Detectar y convertir formato español (1.234,56) a internacional (1234.56)
  let normalized = str
  
  // Caso 1: Formato español con separador de miles (1.234,56 o 1.234.567,89)
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(str)) {
    // Quitar puntos de miles y convertir coma a punto
    normalized = str.replace(/\./g, '').replace(',', '.')
  }
  // Caso 2: Solo coma como decimal (21,2080)
  else if (/^\d+,\d+$/.test(str)) {
    normalized = str.replace(',', '.')
  }
  // Caso 3: Formato internacional (1,234.56) - coma como miles
  else if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(str)) {
    normalized = str.replace(/,/g, '')
  }
  // Caso 4: Ya está en formato válido o es un número simple
  
  const parsed = parseFloat(normalized)

  if (isNaN(parsed)) {
    return null
  }

  // Si es una lectura, truncar a 3 decimales
  if (esLectura) {
    return truncarDecimales(parsed, PRECISION_LECTURAS)
  }

  return parsed
}

/**
 * Parsea un string a número, tratando celda vacía como null (no error)
 * pero celdas con texto inválido como error
 * @returns {{ value: number|null, isError: boolean }}
 */
export function parseNumberWithValidation(value) {
  if (value === null || value === undefined) {
    return { value: null, isError: false }
  }
  
  const str = String(value).trim()
  
  if (str === '') {
    return { value: null, isError: false }
  }
  
  const parsed = parseNumber(str)
  
  if (parsed === null) {
    return { value: null, isError: true }
  }
  
  return { value: parsed, isError: false }
}

/**
 * Formatea un número al formato español (coma decimal, punto miles)
 * @param {number} value - Número a formatear
 * @param {number} decimals - Cantidad de decimales (default: 2)
 * @returns {string} - Número formateado
 */
export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return ''
  }
  
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

/**
 * Formatea un número como moneda EUR
 * @param {number} value - Valor a formatear
 * @returns {string} - Valor formateado (ej: "18,30 €")
 */
export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return ''
  }
  
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(value)
}

/**
 * Redondea un número a 2 decimales (para importes)
 */
export function round2(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return 0
  }
  return Math.round(value * 100) / 100
}

/**
 * Redondea un número a 4 decimales (para lecturas/consumos)
 */
export function round4(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return 0
  }
  return Math.round(value * 10000) / 10000
}

/**
 * Verifica si un valor es numérico
 */
export function isNumeric(value) {
  if (typeof value === 'number') return !isNaN(value)
  if (typeof value !== 'string') return false
  return parseNumber(value) !== null
}



