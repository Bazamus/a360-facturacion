/**
 * Configuración de precisión decimal por tipo de concepto
 */
export const PRECISION_POR_CONCEPTO = {
  'CAL': 5,   // Calefacción - 5 decimales (0.12459 €/Kcal)
  'CLI': 5,   // Climatización - 5 decimales (0.14657 €/Frig)
  'ACS': 3,   // Agua Caliente Sanitaria - 3 decimales (5.563 €/m³)
  'TF': 3,    // Término Fijo - 3 decimales (17.230 €/unidad)
  'MANT': 3   // Mantenimiento - 3 decimales (término fijo)
}

/**
 * Precisión para lecturas y consumos (fija para todos los conceptos)
 */
export const PRECISION_LECTURAS = 3
export const PRECISION_IMPORTES = 2

/**
 * Obtiene el número de decimales para el precio de un concepto
 * @param {string} conceptoCodigo - Código del concepto (CAL, CLI, ACS, etc.)
 * @returns {number} Número de decimales (3 o 5)
 */
export function getDecimalesPrecio(conceptoCodigo) {
  return PRECISION_POR_CONCEPTO[conceptoCodigo] || 3  // Default: 3 decimales
}

/**
 * Formatea un precio con la precisión correcta según el concepto
 * @param {number} precio - Precio a formatear
 * @param {string} conceptoCodigo - Código del concepto
 * @param {boolean} incluirSimbolo - Si incluir símbolo € (default: true)
 * @returns {string} Precio formateado
 */
export function formatPrecio(precio, conceptoCodigo, incluirSimbolo = true) {
  if (precio == null || isNaN(precio)) return incluirSimbolo ? '0,00 €' : '0,00'

  const decimales = getDecimalesPrecio(conceptoCodigo)

  const formatted = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales
  }).format(precio)

  return incluirSimbolo ? `${formatted} €` : formatted
}

/**
 * Formatea una lectura con 3 decimales
 * @param {number} lectura - Lectura a formatear
 * @returns {string} Lectura formateada
 */
export function formatLectura(lectura) {
  if (lectura == null || isNaN(lectura)) return '0,000'

  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: PRECISION_LECTURAS,
    maximumFractionDigits: PRECISION_LECTURAS
  }).format(lectura)
}

/**
 * Formatea un consumo con 3 decimales
 * @param {number} consumo - Consumo a formatear
 * @param {string} unidadMedida - Unidad de medida (opcional)
 * @returns {string} Consumo formateado
 */
export function formatConsumo(consumo, unidadMedida = '') {
  if (consumo == null || isNaN(consumo)) return unidadMedida ? `0,000 ${unidadMedida}` : '0,000'

  const formatted = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: PRECISION_LECTURAS,
    maximumFractionDigits: PRECISION_LECTURAS
  }).format(consumo)

  return unidadMedida ? `${formatted} ${unidadMedida}` : formatted
}

/**
 * Formatea un importe con 2 decimales (para subtotales, base, IVA, total)
 * @param {number} importe - Importe a formatear
 * @param {boolean} incluirSimbolo - Si incluir símbolo € (default: true)
 * @returns {string} Importe formateado
 */
export function formatImporte(importe, incluirSimbolo = true) {
  if (importe == null || isNaN(importe)) return incluirSimbolo ? '0,00 €' : '0,00'

  return new Intl.NumberFormat('es-ES', {
    style: incluirSimbolo ? 'currency' : 'decimal',
    currency: 'EUR',
    minimumFractionDigits: PRECISION_IMPORTES,
    maximumFractionDigits: PRECISION_IMPORTES
  }).format(importe)
}

/**
 * Redondea un valor a N decimales sin redondeo intermedio
 * (usa todos los decimales disponibles en cálculos)
 * @param {number} valor - Valor a redondear
 * @param {number} decimales - Número de decimales
 * @returns {number} Valor redondeado
 */
export function redondear(valor, decimales) {
  if (valor == null || isNaN(valor)) return 0
  const multiplicador = Math.pow(10, decimales)
  return Math.round(valor * multiplicador) / multiplicador
}

/**
 * Valida que un precio no exceda el máximo de decimales permitido
 * @param {number|string} precio - Precio a validar
 * @param {string} conceptoCodigo - Código del concepto
 * @returns {Object} { valid: boolean, error: string|null, decimalesEncontrados: number }
 */
export function validarDecimalesPrecio(precio, conceptoCodigo) {
  const precioStr = String(precio).replace(',', '.')
  const partes = precioStr.split('.')

  if (partes.length === 1) {
    // No tiene decimales
    return { valid: true, error: null, decimalesEncontrados: 0 }
  }

  const decimalesEncontrados = partes[1].length
  const decimalesPermitidos = getDecimalesPrecio(conceptoCodigo)

  if (decimalesEncontrados > decimalesPermitidos) {
    return {
      valid: false,
      error: `El precio para ${conceptoCodigo} no puede tener más de ${decimalesPermitidos} decimales (encontrados: ${decimalesEncontrados})`,
      decimalesEncontrados
    }
  }

  return { valid: true, error: null, decimalesEncontrados }
}

/**
 * Valida que una lectura no exceda 3 decimales
 * @param {number|string} lectura - Lectura a validar
 * @returns {Object} { valid: boolean, error: string|null }
 */
export function validarDecimalesLectura(lectura) {
  const lecturaStr = String(lectura).replace(',', '.')
  const partes = lecturaStr.split('.')

  if (partes.length === 1) {
    return { valid: true, error: null }
  }

  const decimalesEncontrados = partes[1].length

  if (decimalesEncontrados > PRECISION_LECTURAS) {
    return {
      valid: false,
      error: `Las lecturas no pueden tener más de ${PRECISION_LECTURAS} decimales (encontrados: ${decimalesEncontrados})`
    }
  }

  return { valid: true, error: null }
}

/**
 * Trunca decimales sin redondear
 * @param {number} valor - Valor a truncar
 * @param {number} decimales - Número de decimales a mantener
 * @returns {number} Valor truncado
 */
export function truncarDecimales(valor, decimales) {
  const multiplicador = Math.pow(10, decimales)
  return Math.floor(valor * multiplicador) / multiplicador
}
