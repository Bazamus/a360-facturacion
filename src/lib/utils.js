import { clsx } from 'clsx'

/**
 * Combina clases de Tailwind CSS de forma inteligente
 */
export function cn(...inputs) {
  return clsx(inputs)
}

/**
 * Formatea un número como moneda en formato español
 */
export function formatCurrency(value) {
  if (value == null) return '-'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(value)
}

/**
 * Formatea un número con decimales en formato español
 */
export function formatNumber(value, decimals = 2) {
  if (value == null) return '-'
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

/**
 * Formatea una fecha en formato español DD/MM/YYYY
 */
export function formatDate(date) {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Formatea una fecha con hora
 */
export function formatDateTime(date) {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Valida un NIF/CIF español
 */
export function validarNIF(nif) {
  if (!nif) return false
  nif = nif.toUpperCase().trim()
  
  // NIF personal: 8 dígitos + letra
  if (/^\d{8}[A-Z]$/.test(nif)) {
    const letras = 'TRWAGMYFPDXBNJZSQVHLCKE'
    const numero = parseInt(nif.slice(0, 8))
    return nif[8] === letras[numero % 23]
  }
  
  // CIF empresarial
  if (/^[ABCDEFGHJNPQRSUVW]\d{7}[A-J0-9]$/.test(nif)) {
    return true
  }
  
  // NIE extranjero
  if (/^[XYZ]\d{7}[A-Z]$/.test(nif)) {
    const niePrefix = { X: '0', Y: '1', Z: '2' }
    const converted = niePrefix[nif[0]] + nif.slice(1, 8)
    const letras = 'TRWAGMYFPDXBNJZSQVHLCKE'
    return nif[8] === letras[parseInt(converted) % 23]
  }
  
  return false
}

/**
 * Valida un IBAN español
 */
export function validarIBAN(iban) {
  if (!iban) return false
  
  // Eliminar espacios y convertir a mayúsculas
  iban = iban.replace(/\s/g, '').toUpperCase()
  
  // Verificar formato español
  if (!/^ES\d{22}$/.test(iban)) return false
  
  // Mover los 4 primeros caracteres al final
  const reordenado = iban.slice(4) + iban.slice(0, 4)
  
  // Convertir letras a números (A=10, B=11, ..., Z=35)
  const numerico = reordenado.replace(/[A-Z]/g, c => c.charCodeAt(0) - 55)
  
  // Verificar módulo 97
  let remainder = 0
  for (let i = 0; i < numerico.length; i++) {
    remainder = (remainder * 10 + parseInt(numerico[i])) % 97
  }
  
  return remainder === 1
}

/**
 * Formatea un IBAN con espacios
 */
export function formatIBAN(iban) {
  if (!iban) return '-'
  const clean = iban.replace(/\s/g, '').toUpperCase()
  return clean.replace(/(.{4})/g, '$1 ').trim()
}

/**
 * Redondea a 2 decimales (para importes)
 */
export function round2(value) {
  return Math.round(value * 100) / 100
}

/**
 * Genera un slug a partir de un texto
 */
export function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
}

/**
 * Capitaliza la primera letra de cada palabra
 */
export function capitalize(text) {
  if (!text) return ''
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}









