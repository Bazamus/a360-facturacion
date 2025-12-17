/**
 * Sistema de detección de alertas para lecturas
 */

/**
 * Detecta todas las alertas para una fila de lectura
 */
export function detectarAlertas(resultado, alertasConfig, mediaConsumo = 0) {
  const alertas = []
  
  // 1. Lectura negativa
  if (alertasConfig.lectura_negativa?.activa && resultado.consumo_calculado < 0) {
    alertas.push({
      tipo: 'lectura_negativa',
      severidad: alertasConfig.lectura_negativa.severidad || 'error',
      mensaje: `La lectura actual (${resultado.lectura_valor}) es menor que la anterior (${resultado.lectura_anterior})`,
      bloquea: alertasConfig.lectura_negativa.bloquea_confirmacion ?? true
    })
  }
  
  // 2. Consumo alto
  if (alertasConfig.consumo_alto?.activa && resultado.consumo_calculado > 0) {
    const umbral = alertasConfig.consumo_alto.parametros?.factor_umbral || 3
    
    if (mediaConsumo > 0 && resultado.consumo_calculado > mediaConsumo * umbral) {
      const factor = (resultado.consumo_calculado / mediaConsumo).toFixed(1)
      alertas.push({
        tipo: 'consumo_alto',
        severidad: alertasConfig.consumo_alto.severidad || 'warning',
        mensaje: `El consumo (${resultado.consumo_calculado.toFixed(2)}) es ${factor}x la media (${mediaConsumo.toFixed(2)})`,
        bloquea: alertasConfig.consumo_alto.bloquea_confirmacion ?? false,
        datos: { consumo: resultado.consumo_calculado, media: mediaConsumo, factor: parseFloat(factor) }
      })
    }
  }
  
  // 3. Consumo cero
  if (alertasConfig.consumo_cero?.activa && resultado.consumo_calculado === 0) {
    alertas.push({
      tipo: 'consumo_cero',
      severidad: alertasConfig.consumo_cero.severidad || 'info',
      mensaje: 'No se ha registrado consumo en el periodo',
      bloquea: alertasConfig.consumo_cero.bloquea_confirmacion ?? false
    })
  }
  
  // 4. Cliente bloqueado
  if (alertasConfig.cliente_bloqueado?.activa && resultado.cliente_bloqueado) {
    alertas.push({
      tipo: 'cliente_bloqueado',
      severidad: alertasConfig.cliente_bloqueado.severidad || 'warning',
      mensaje: `Cliente bloqueado: ${resultado.motivo_bloqueo || 'Sin motivo especificado'}`,
      bloquea: alertasConfig.cliente_bloqueado.bloquea_confirmacion ?? false
    })
  }
  
  // 5. Fecha futura
  if (alertasConfig.fecha_futura?.activa && resultado.fecha_lectura) {
    const fechaLectura = new Date(resultado.fecha_lectura)
    const hoy = new Date()
    hoy.setHours(23, 59, 59, 999)
    
    if (fechaLectura > hoy) {
      alertas.push({
        tipo: 'fecha_futura',
        severidad: alertasConfig.fecha_futura.severidad || 'error',
        mensaje: 'La fecha de lectura es posterior a hoy',
        bloquea: alertasConfig.fecha_futura.bloquea_confirmacion ?? true
      })
    }
  }
  
  // 6. Fecha anterior a última lectura
  if (alertasConfig.fecha_anterior?.activa && 
      resultado.fecha_lectura && 
      resultado.fecha_lectura_anterior) {
    const fechaActual = new Date(resultado.fecha_lectura)
    const fechaAnterior = new Date(resultado.fecha_lectura_anterior)
    
    if (fechaActual <= fechaAnterior) {
      alertas.push({
        tipo: 'fecha_anterior',
        severidad: alertasConfig.fecha_anterior.severidad || 'error',
        mensaje: `La fecha es anterior o igual a la última lectura`,
        bloquea: alertasConfig.fecha_anterior.bloquea_confirmacion ?? true
      })
    }
  }
  
  return alertas
}

/**
 * Obtiene el color del badge según la severidad
 */
export function getSeveridadColor(severidad) {
  switch (severidad) {
    case 'error': return 'danger'
    case 'warning': return 'warning'
    case 'info': return 'info'
    default: return 'default'
  }
}

/**
 * Obtiene el icono según la severidad
 */
export function getSeveridadIcon(severidad) {
  switch (severidad) {
    case 'error': return '❌'
    case 'warning': return '⚠️'
    case 'info': return 'ℹ️'
    default: return '•'
  }
}

/**
 * Determina el estado de una fila basándose en sus alertas
 */
export function determinarEstadoFila(alertas, tieneError = false) {
  if (tieneError) return 'error'
  
  const tieneAlertaError = alertas.some(a => a.severidad === 'error')
  if (tieneAlertaError) return 'error'
  
  if (alertas.length > 0) return 'alerta'
  
  return 'valido'
}

/**
 * Verifica si una fila puede ser confirmada
 */
export function puedeConfirmar(alertas) {
  return !alertas.some(a => a.bloquea)
}

/**
 * Cuenta filas por estado
 */
export function contarPorEstado(filas) {
  return {
    total: filas.length,
    validas: filas.filter(f => f.estado === 'valido').length,
    conAlertas: filas.filter(f => f.estado === 'alerta').length,
    errores: filas.filter(f => f.estado === 'error').length,
    confirmadas: filas.filter(f => f.estado === 'confirmado').length,
    descartadas: filas.filter(f => f.estado === 'descartado').length
  }
}

/**
 * Formatea las alertas para mostrar en la UI
 */
export function formatAlertasForDisplay(alertas) {
  if (!alertas || alertas.length === 0) return []
  
  return alertas.map(alerta => ({
    ...alerta,
    icon: getSeveridadIcon(alerta.severidad),
    color: getSeveridadColor(alerta.severidad)
  }))
}



