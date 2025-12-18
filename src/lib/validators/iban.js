/**
 * Validador y utilidades para IBAN
 */

// Longitudes de IBAN por país
const LONGITUDES_IBAN = {
  ES: 24, DE: 22, FR: 27, IT: 27, PT: 25, GB: 22,
  BE: 16, NL: 18, AT: 20, CH: 21, IE: 22, LU: 20
}

// BICs de bancos españoles por código de entidad
const BICS_ESPANOLES = {
  '0049': 'BSCHESMMXXX', // Santander
  '2100': 'CAIXESBBXXX', // CaixaBank
  '0182': 'BBVAESMMXXX', // BBVA
  '0081': 'BSABESBBXXX', // Sabadell
  '2038': 'CAABORABBXXX', // Bankinter
  '0128': 'BKBKESMMXXX', // Bankinter
  '0075': 'POABORABXXX', // Popular
  '0030': 'ESPBESMMXXX', // Bankia
  '0073': 'OPENESMMXXX', // Openbank
  '0019': 'DEUTESBBXXX', // Deutsche Bank
  '0065': 'BARCESMMXXX', // Barclays
  '2085': 'CAZABORABXXX', // Ibercaja
  '2095': 'BASABORABXXX', // Kutxabank
  '3058': 'CECAESMM058', // Cajamar
  '3025': 'CABORABBXXX', // Unicaja
}

/**
 * Valida un IBAN
 */
export function validarIBAN(iban) {
  if (!iban) {
    return { valido: false, error: 'IBAN es requerido' }
  }

  // Eliminar espacios y convertir a mayúsculas
  iban = iban.replace(/\s/g, '').toUpperCase()

  // Verificar formato básico
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) {
    return { valido: false, error: 'Formato de IBAN inválido' }
  }

  const pais = iban.substring(0, 2)
  const longitudEsperada = LONGITUDES_IBAN[pais]

  if (!longitudEsperada) {
    return { valido: false, error: 'País no soportado para IBAN' }
  }

  if (iban.length !== longitudEsperada) {
    return { valido: false, error: `Longitud incorrecta (esperado: ${longitudEsperada} caracteres)` }
  }

  // Verificar dígitos de control
  const reordenado = iban.slice(4) + iban.slice(0, 4)
  const numerico = reordenado.replace(/[A-Z]/g, c => (c.charCodeAt(0) - 55).toString())

  if (mod97(numerico) !== 1) {
    return { valido: false, error: 'Dígitos de control inválidos' }
  }

  return { valido: true, iban: iban }
}

/**
 * Calcula módulo 97 para validación de IBAN
 */
function mod97(numStr) {
  let remainder = 0
  for (let i = 0; i < numStr.length; i++) {
    remainder = (remainder * 10 + parseInt(numStr[i])) % 97
  }
  return remainder
}

/**
 * Formatea un IBAN con espacios
 */
export function formatearIBAN(iban) {
  if (!iban) return ''
  const limpio = iban.replace(/\s/g, '').toUpperCase()
  return limpio.match(/.{1,4}/g)?.join(' ') || limpio
}

/**
 * Obtiene el BIC a partir del IBAN español
 */
export function obtenerBIC(iban) {
  if (!iban) return null
  
  const limpio = iban.replace(/\s/g, '').toUpperCase()
  
  // Solo para IBAN españoles
  if (!limpio.startsWith('ES')) return null
  
  const codigoEntidad = limpio.substring(4, 8)
  return BICS_ESPANOLES[codigoEntidad] || null
}

/**
 * Obtiene el nombre del banco a partir del IBAN español
 */
export function obtenerNombreBanco(iban) {
  if (!iban) return null
  
  const limpio = iban.replace(/\s/g, '').toUpperCase()
  
  if (!limpio.startsWith('ES')) return null
  
  const codigoEntidad = limpio.substring(4, 8)
  
  const nombres = {
    '0049': 'Banco Santander',
    '2100': 'CaixaBank',
    '0182': 'BBVA',
    '0081': 'Banco Sabadell',
    '2038': 'Bankinter',
    '0128': 'Bankinter',
    '0075': 'Banco Popular',
    '0030': 'Bankia',
    '0073': 'Openbank',
    '0019': 'Deutsche Bank',
    '0065': 'Barclays',
    '2085': 'Ibercaja',
    '2095': 'Kutxabank',
    '3058': 'Cajamar',
    '3025': 'Unicaja'
  }
  
  return nombres[codigoEntidad] || `Entidad ${codigoEntidad}`
}

/**
 * Sanitiza texto para SEPA (sin acentos ni caracteres especiales)
 */
export function sanitizarTextoSEPA(text, maxLength = 70) {
  if (!text) return ''
  
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N')
    .replace(/[^a-zA-Z0-9 .,\-\/\+\(\)\?:']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, maxLength)
}

/**
 * Formatea una fecha para SEPA (YYYY-MM-DD)
 */
export function formatearFechaSEPA(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}



