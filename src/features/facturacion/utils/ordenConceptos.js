/**
 * Utilidad para ordenar conceptos en facturas
 * 
 * Define el orden de presentación estándar de conceptos en facturas,
 * independientemente del orden en que estén grabados en el contador.
 */

/**
 * Orden predefinido de conceptos por código
 * Números menores = aparecen primero
 * Término fijo siempre al final (999)
 */
const ORDEN_CONCEPTOS = {
  'ACS': 1,        // Agua Caliente Sanitaria (primero)
  'CAL': 2,        // Calefacción (segundo)
  'CLI': 3,        // Climatización (tercero)
  'TERMFIJ': 999   // Término fijo (siempre al final)
}

/**
 * Valor por defecto para conceptos no definidos explícitamente
 * Se colocarán después de los principales pero antes del término fijo
 */
const ORDEN_DEFAULT = 500

/**
 * Ordena las líneas de factura según el orden predefinido de conceptos
 * 
 * @param {Array} lineas - Array de líneas de factura
 * @returns {Array} - Líneas ordenadas (copia del array original)
 * 
 * @example
 * const lineasOrdenadas = ordenarLineasFactura(lineas)
 */
export function ordenarLineasFactura(lineas) {
  if (!lineas || !Array.isArray(lineas)) {
    return []
  }

  // Crear copia para no mutar el array original
  return [...lineas].sort((a, b) => {
    // Obtener orden según código de concepto
    const ordenA = ORDEN_CONCEPTOS[a.concepto_codigo] || ORDEN_DEFAULT
    const ordenB = ORDEN_CONCEPTOS[b.concepto_codigo] || ORDEN_DEFAULT
    
    // Ordenar ascendente (menor número = primero)
    return ordenA - ordenB
  })
}

/**
 * Obtiene el orden de presentación de un concepto
 * Útil para debugging o mostrar información
 * 
 * @param {string} codigoConcepto - Código del concepto (ej: 'ACS', 'CAL')
 * @returns {number} - Orden de presentación
 */
export function getOrdenConcepto(codigoConcepto) {
  return ORDEN_CONCEPTOS[codigoConcepto] || ORDEN_DEFAULT
}

/**
 * Lista de conceptos ordenados por código
 * Útil para documentación o validaciones
 */
export const CONCEPTOS_ORDENADOS = [
  { codigo: 'ACS', nombre: 'Agua Caliente Sanitaria', orden: 1 },
  { codigo: 'CAL', nombre: 'Calefacción', orden: 2 },
  { codigo: 'CLI', nombre: 'Climatización', orden: 3 },
  { codigo: 'TERMFIJ', nombre: 'Término Fijo', orden: 999 }
]
