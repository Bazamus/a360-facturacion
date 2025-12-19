/**
 * Detector de Alertas para Lecturas
 * Sistema de Facturación A360
 * 
 * Detecta anomalías en las lecturas y genera alertas configurables
 */

/**
 * Tipos de alertas disponibles
 */
export const TIPOS_ALERTA = {
  CONSUMO_NEGATIVO: 'consumo_negativo',
  CONSUMO_CERO: 'consumo_cero',
  CONSUMO_ALTO: 'consumo_alto',
  CONSUMO_MUY_ALTO: 'consumo_muy_alto',
  LECTURA_DUPLICADA: 'lectura_duplicada',
  FECHA_FUTURA: 'fecha_futura',
  FECHA_ANTERIOR: 'fecha_anterior',
  CLIENTE_BLOQUEADO: 'cliente_bloqueado',
  CONTADOR_NO_ENCONTRADO: 'contador_no_encontrado',
  CONCEPTO_NO_ASIGNADO: 'concepto_no_asignado',
  FORMATO_INVALIDO: 'formato_invalido',
  SIN_LECTURA_ANTERIOR: 'sin_lectura_anterior'
}

/**
 * Configuración por defecto de umbrales
 */
const UMBRALES_DEFAULT = {
  consumo_alto_factor: 2.0,      // 200% del consumo medio = alerta
  consumo_muy_alto_factor: 3.0,  // 300% del consumo medio = alerta alta
  dias_minimos: 15               // Mínimo de días entre lecturas
}

/**
 * Helper para obtener configuración de alerta
 * Soporta tanto array como objeto indexado por tipo/codigo
 */
function getAlertConfig(alertasConfig, tipo) {
  if (!alertasConfig) return null
  
  // Si es un array, buscar por codigo o tipo
  if (Array.isArray(alertasConfig)) {
    return alertasConfig.find(a => a.codigo === tipo || a.tipo === tipo)
  }
  
  // Si es un objeto, buscar por key
  return alertasConfig[tipo] || null
}

/**
 * Detecta alertas en un resultado de lectura
 * @param {Object} resultado - Datos de la lectura procesada
 * @param {Array|Object} alertasConfig - Configuración de alertas (array o objeto indexado)
 * @param {Object} mediaHistorica - Media de consumo histórico (opcional)
 * @returns {Array} Lista de alertas detectadas
 */
export function detectarAlertas(resultado, alertasConfig = [], mediaHistorica = null) {
  const alertas = []
  
  const {
    lectura_valor,
    lectura_anterior,
    fecha_lectura,
    fecha_lectura_anterior,
    consumo_calculado,
    cliente_bloqueado,
    motivo_bloqueo,
    media_consumo,        // Media de consumo histórico del contador/concepto
    desviacion_consumo    // Desviación estándar del consumo
  } = resultado

  // Usar media proporcionada o calcular factores
  const mediaConsumo = mediaHistorica?.media || media_consumo || null
  const desviacion = mediaHistorica?.desviacion || desviacion_consumo || null

  // 1. Verificar consumo negativo
  if (consumo_calculado != null && consumo_calculado < 0) {
    const config = getAlertConfig(alertasConfig, TIPOS_ALERTA.CONSUMO_NEGATIVO)
    alertas.push({
      tipo: TIPOS_ALERTA.CONSUMO_NEGATIVO,
      severidad: config?.severidad || 'warning',
      mensaje: `Consumo negativo: ${consumo_calculado.toFixed(2)}. Posible reinicio de contador o error de lectura.`,
      bloquea: config?.bloquea ?? false,
      valor_detectado: consumo_calculado
    })
  }

  // 2. Verificar consumo cero
  if (consumo_calculado === 0) {
    const config = getAlertConfig(alertasConfig, TIPOS_ALERTA.CONSUMO_CERO)
    alertas.push({
      tipo: TIPOS_ALERTA.CONSUMO_CERO,
      severidad: config?.severidad || 'info',
      mensaje: 'Consumo cero en este período. Verificar si es correcto.',
      bloquea: config?.bloquea ?? false,
      valor_detectado: 0
    })
  }

  // 3. Verificar consumo alto comparando con media histórica
  if (consumo_calculado != null && consumo_calculado > 0 && mediaConsumo != null && mediaConsumo > 0) {
    const factor = consumo_calculado / mediaConsumo
    const umbralAlto = UMBRALES_DEFAULT.consumo_alto_factor
    const umbralMuyAlto = UMBRALES_DEFAULT.consumo_muy_alto_factor
    
    if (factor >= umbralMuyAlto) {
      const config = getAlertConfig(alertasConfig, TIPOS_ALERTA.CONSUMO_MUY_ALTO)
      alertas.push({
        tipo: TIPOS_ALERTA.CONSUMO_MUY_ALTO,
        severidad: config?.severidad || 'error',
        mensaje: `Consumo muy elevado: ${consumo_calculado.toFixed(2)} es ${(factor * 100).toFixed(0)}% de la media (${mediaConsumo.toFixed(2)})`,
        bloquea: config?.bloquea ?? false,
        valor_detectado: consumo_calculado,
        media_historica: mediaConsumo,
        factor: factor
      })
    } else if (factor >= umbralAlto) {
      const config = getAlertConfig(alertasConfig, TIPOS_ALERTA.CONSUMO_ALTO)
      alertas.push({
        tipo: TIPOS_ALERTA.CONSUMO_ALTO,
        severidad: config?.severidad || 'warning',
        mensaje: `Consumo superior a la media: ${consumo_calculado.toFixed(2)} es ${(factor * 100).toFixed(0)}% de la media histórica (${mediaConsumo.toFixed(2)})`,
        bloquea: config?.bloquea ?? false,
        valor_detectado: consumo_calculado,
        media_historica: mediaConsumo,
        factor: factor
      })
    }
  }

  // 4. Verificar fecha futura
  if (fecha_lectura) {
    const fechaLectura = new Date(fecha_lectura)
    const hoy = new Date()
    hoy.setHours(23, 59, 59, 999)
    
    if (fechaLectura > hoy) {
      const config = getAlertConfig(alertasConfig, TIPOS_ALERTA.FECHA_FUTURA)
      alertas.push({
        tipo: TIPOS_ALERTA.FECHA_FUTURA,
        severidad: config?.severidad || 'error',
        mensaje: 'La fecha de lectura es posterior a hoy',
        bloquea: config?.bloquea ?? true,
        valor_detectado: fecha_lectura
      })
    }
  }

  // 5. Verificar fecha anterior a la última lectura
  if (fecha_lectura && fecha_lectura_anterior) {
    const fechaLectura = new Date(fecha_lectura)
    const fechaAnterior = new Date(fecha_lectura_anterior)
    
    if (fechaLectura <= fechaAnterior) {
      const config = getAlertConfig(alertasConfig, TIPOS_ALERTA.FECHA_ANTERIOR)
      alertas.push({
        tipo: TIPOS_ALERTA.FECHA_ANTERIOR,
        severidad: config?.severidad || 'error',
        mensaje: 'La fecha de lectura es igual o anterior a la última lectura registrada',
        bloquea: config?.bloquea ?? true,
        valor_detectado: fecha_lectura
      })
    }
  }

  // 6. Verificar cliente bloqueado
  if (cliente_bloqueado) {
    const config = getAlertConfig(alertasConfig, TIPOS_ALERTA.CLIENTE_BLOQUEADO)
    alertas.push({
      tipo: TIPOS_ALERTA.CLIENTE_BLOQUEADO,
      severidad: config?.severidad || 'warning',
      mensaje: motivo_bloqueo || 'Cliente bloqueado',
      bloquea: config?.bloquea ?? false
    })
  }

  // 7. Sin lectura anterior (primera lectura)
  if (lectura_anterior == null && lectura_valor != null) {
    const config = getAlertConfig(alertasConfig, TIPOS_ALERTA.SIN_LECTURA_ANTERIOR)
    alertas.push({
      tipo: TIPOS_ALERTA.SIN_LECTURA_ANTERIOR,
      severidad: config?.severidad || 'info',
      mensaje: 'Primera lectura del contador. No se puede calcular consumo.',
      bloquea: config?.bloquea ?? false
    })
  }

  return alertas
}

/**
 * Determina el estado de una fila basado en sus alertas
 * @param {Array} alertas - Lista de alertas
 * @returns {string} Estado: 'valido', 'alerta', 'error'
 */
export function determinarEstadoFila(alertas) {
  if (!alertas || alertas.length === 0) {
    return 'valido'
  }
  
  // Si hay alguna alerta bloqueante, es error
  if (alertas.some(a => a.bloquea)) {
    return 'error'
  }
  
  // Si hay alertas de severidad 'error', es error
  if (alertas.some(a => a.severidad === 'error')) {
    return 'error'
  }
  
  // Si hay alertas de cualquier tipo (warning, info), es alerta
  return 'alerta'
}

/**
 * Cuenta las filas por estado
 * @param {Array} filas - Lista de filas/detalles
 * @returns {Object} Conteo por estado
 */
export function contarPorEstado(filas) {
  const conteo = {
    total: filas?.length || 0,
    validas: 0,
    conAlertas: 0,
    errores: 0
  }
  
  if (!filas) return conteo
  
  filas.forEach(fila => {
    switch (fila.estado) {
      case 'valido':
        conteo.validas++
        break
      case 'alerta':
        conteo.conAlertas++
        break
      case 'error':
        conteo.errores++
        break
      default:
        // Pendiente u otro estado
        break
    }
  })
  
  return conteo
}

/**
 * Obtiene el label legible de un tipo de alerta
 * @param {string} tipo - Código del tipo de alerta
 * @returns {string} Label en español
 */
export function getAlertaLabel(tipo) {
  const labels = {
    [TIPOS_ALERTA.CONSUMO_NEGATIVO]: 'Consumo negativo',
    [TIPOS_ALERTA.CONSUMO_CERO]: 'Consumo cero',
    [TIPOS_ALERTA.CONSUMO_ALTO]: 'Consumo alto',
    [TIPOS_ALERTA.CONSUMO_MUY_ALTO]: 'Consumo muy alto',
    [TIPOS_ALERTA.LECTURA_DUPLICADA]: 'Lectura duplicada',
    [TIPOS_ALERTA.FECHA_FUTURA]: 'Fecha futura',
    [TIPOS_ALERTA.FECHA_ANTERIOR]: 'Fecha anterior',
    [TIPOS_ALERTA.CLIENTE_BLOQUEADO]: 'Cliente bloqueado',
    [TIPOS_ALERTA.CONTADOR_NO_ENCONTRADO]: 'Contador no encontrado',
    [TIPOS_ALERTA.CONCEPTO_NO_ASIGNADO]: 'Concepto no asignado',
    [TIPOS_ALERTA.FORMATO_INVALIDO]: 'Formato inválido',
    [TIPOS_ALERTA.SIN_LECTURA_ANTERIOR]: 'Sin lectura anterior'
  }
  
  return labels[tipo] || tipo
}

/**
 * Calcula la media de consumo histórico de un contador/concepto
 * @param {Array} lecturas - Lecturas históricas ordenadas por fecha
 * @returns {Object} { media, desviacion, muestras }
 */
export function calcularMediaConsumo(lecturas) {
  if (!lecturas || lecturas.length < 2) {
    return { media: null, desviacion: null, muestras: 0 }
  }
  
  // Calcular consumos entre lecturas consecutivas
  const consumos = []
  for (let i = 1; i < lecturas.length; i++) {
    const consumo = lecturas[i].lectura_valor - lecturas[i - 1].lectura_valor
    if (consumo >= 0) { // Solo consumos positivos
      consumos.push(consumo)
    }
  }
  
  if (consumos.length === 0) {
    return { media: null, desviacion: null, muestras: 0 }
  }
  
  // Calcular media
  const suma = consumos.reduce((acc, val) => acc + val, 0)
  const media = suma / consumos.length
  
  // Calcular desviación estándar
  const sumaCuadrados = consumos.reduce((acc, val) => acc + Math.pow(val - media, 2), 0)
  const desviacion = Math.sqrt(sumaCuadrados / consumos.length)
  
  return {
    media: Math.round(media * 100) / 100,
    desviacion: Math.round(desviacion * 100) / 100,
    muestras: consumos.length
  }
}

export default {
  TIPOS_ALERTA,
  detectarAlertas,
  determinarEstadoFila,
  contarPorEstado,
  getAlertaLabel,
  calcularMediaConsumo
}
