// =====================================================
// Utilidades para Estados de Cliente
// =====================================================

/**
 * Convierte el color del estado a variant del Badge component
 * @param {string} color - Color del estado: 'green', 'red', 'yellow', 'gray'
 * @returns {string} Variant del Badge: 'success', 'danger', 'warning', 'default'
 */
export function getBadgeVariant(color) {
  const variants = {
    green: 'success',
    red: 'danger',
    yellow: 'warning',
    gray: 'default'
  }
  return variants[color] || 'default'
}

/**
 * Constantes de colores disponibles para estados
 */
export const COLORES_ESTADO = [
  { value: 'green', label: 'Verde (Activo)' },
  { value: 'red', label: 'Rojo (Bloqueado/Baja)' },
  { value: 'yellow', label: 'Amarillo (Advertencia)' },
  { value: 'gray', label: 'Gris (Neutral)' }
]

/**
 * Obtiene el estado predefinido "Activo"
 * @param {Array} estados - Array de estados
 * @returns {Object|null} Estado activo o null
 */
export function getEstadoActivo(estados) {
  return estados?.find(e => e.codigo === 'ACT') || null
}

/**
 * Verifica si un estado permite facturación sin advertencia
 * @param {Object} estado - Objeto estado
 * @returns {boolean}
 */
export function permiteFacturacion(estado) {
  return estado?.permite_facturacion !== false
}
