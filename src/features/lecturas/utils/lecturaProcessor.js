/**
 * Procesador de lecturas para el nuevo formato multiconcepto
 * Sistema de Facturación A360
 * 
 * Una fila del Excel = Un contador con múltiples conceptos
 * Genera múltiples registros de lectura (uno por concepto con valor)
 */

import { parseDate, isFutureDate } from './dateParsers'
import { parseNumber, round4 } from './numberParsers'
import { parseString, extractRowData } from './excelParser'

/**
 * Procesa una fila del Excel y genera múltiples registros de lectura
 * @param {Object} params
 * @param {any[]} params.row - Fila del Excel
 * @param {number} params.rowIndex - Índice de la fila (1-based)
 * @param {Object} params.fixedColumns - Mapeo de columnas fijas
 * @param {Object} params.conceptColumns - Mapeo de columnas de conceptos
 * @param {string} params.comunidadId - ID de la comunidad
 * @param {Object} params.dataServices - Servicios para consultar datos
 * @returns {Promise<Array>} - Array de registros de lectura generados
 */
export async function processRow({
  row,
  rowIndex,
  fixedColumns,
  conceptColumns,
  comunidadId,
  dataServices
}) {
  const {
    findContadorByNumeroSerie,
    getUbicacionInfo,
    findContadorConcepto,
    getClienteActualUbicacion,
    getUltimaLectura,
    getPrecioVigente,
    getAlertasConfig
  } = dataServices

  const lecturas = []
  
  // 1. Extraer datos comunes de la fila
  const rowData = extractRowData(row, fixedColumns)
  const numeroContador = parseString(rowData.numero_contador)
  const fechaLectura = parseDate(rowData.fecha_lectura)
  const portal = parseString(rowData.portal)
  const vivienda = parseString(rowData.vivienda)
  
  // Datos originales para guardar
  const datosOriginales = {
    fecha: rowData.fecha_lectura,
    numero_contador: rowData.numero_contador,
    portal: rowData.portal,
    vivienda: rowData.vivienda,
    conceptos: {}
  }
  
  // Guardar valores de conceptos en datos originales
  for (const [colIndex, conceptoInfo] of Object.entries(conceptColumns)) {
    datosOriginales.conceptos[conceptoInfo.concepto_codigo] = row[parseInt(colIndex)]
  }
  
  // 2. Validar datos obligatorios - Fila sin contador se ignora
  if (!numeroContador) {
    return [] // Fila vacía, ignorar silenciosamente
  }
  
  // 3. Validar fecha obligatoria
  if (!fechaLectura) {
    return [{
      fila_numero: rowIndex,
      datos_originales: datosOriginales,
      numero_contador: numeroContador,
      portal,
      vivienda,
      alertas: [{ 
        tipo: 'formato_invalido', 
        mensaje: 'Fecha de lectura obligatoria o formato inválido', 
        severidad: 'error',
        bloquea: true
      }],
      estado: 'error'
    }]
  }
  
  // 4. Buscar contador en la base de datos
  const contador = await findContadorByNumeroSerie(numeroContador)
  
  if (!contador) {
    // Crear registros de error para cada concepto con valor
    const conceptosConValor = Object.entries(conceptColumns)
      .filter(([idx]) => {
        const val = row[parseInt(idx)]
        return val !== '' && val !== null && val !== undefined
      })
    
    if (conceptosConValor.length === 0) {
      return [{
        fila_numero: rowIndex,
        datos_originales: datosOriginales,
        numero_contador: numeroContador,
        fecha_lectura: fechaLectura,
        portal,
        vivienda,
        alertas: [{ 
          tipo: 'contador_no_encontrado', 
          mensaje: `Contador ${numeroContador} no encontrado en el sistema`,
          severidad: 'error',
          bloquea: true
        }],
        estado: 'error'
      }]
    }
    
    return conceptosConValor.map(([idx, conceptoInfo]) => ({
      fila_numero: rowIndex,
      datos_originales: datosOriginales,
      numero_contador: numeroContador,
      fecha_lectura: fechaLectura,
      portal,
      vivienda,
      concepto_codigo: conceptoInfo.concepto_codigo,
      concepto_id: conceptoInfo.concepto_id,
      lectura_valor: parseNumber(row[parseInt(idx)]),
      alertas: [{ 
        tipo: 'contador_no_encontrado', 
        mensaje: `Contador ${numeroContador} no encontrado en el sistema`,
        severidad: 'error',
        bloquea: true
      }],
      estado: 'error'
    }))
  }
  
  // 5. Verificar que el contador pertenece a la comunidad
  const ubicacionInfo = await getUbicacionInfo(contador.ubicacion_id)
  
  if (ubicacionInfo?.comunidad_id !== comunidadId) {
    return [{
      fila_numero: rowIndex,
      datos_originales: datosOriginales,
      numero_contador: numeroContador,
      fecha_lectura: fechaLectura,
      portal,
      vivienda,
      contador_id: contador.id,
      ubicacion_id: contador.ubicacion_id,
      alertas: [{ 
        tipo: 'contador_otra_comunidad', 
        mensaje: 'El contador pertenece a otra comunidad',
        severidad: 'error',
        bloquea: true
      }],
      estado: 'error'
    }]
  }
  
  // 6. Obtener cliente actual
  const cliente = await getClienteActualUbicacion(contador.ubicacion_id)
  
  // 7. Procesar cada columna de concepto que tenga valor
  for (const [colIndex, conceptoInfo] of Object.entries(conceptColumns)) {
    const rawValue = row[parseInt(colIndex)]
    const lecturaValor = parseNumber(rawValue)
    
    // Ignorar celdas vacías (el contador no mide este concepto)
    if (lecturaValor === null) continue
    
    const registro = {
      fila_numero: rowIndex,
      datos_originales: datosOriginales,
      numero_contador: numeroContador,
      fecha_lectura: fechaLectura,
      portal,
      vivienda,
      concepto_codigo: conceptoInfo.concepto_codigo,
      concepto_id: conceptoInfo.concepto_id,
      concepto_nombre: conceptoInfo.concepto_nombre,
      unidad_medida: conceptoInfo.unidad_medida,
      lectura_valor: lecturaValor,
      contador_id: contador.id,
      ubicacion_id: contador.ubicacion_id,
      comunidad_id: comunidadId,
      cliente_id: cliente?.id || null,
      cliente_nombre: cliente ? `${cliente.nombre} ${cliente.apellidos}` : null,
      alertas: [],
      estado: 'pendiente'
    }
    
    // 8. Verificar que el contador tiene asignado este concepto
    const contadorConcepto = await findContadorConcepto(contador.id, conceptoInfo.concepto_id)
    
    if (!contadorConcepto) {
      registro.alertas.push({ 
        tipo: 'concepto_no_asignado', 
        mensaje: `El contador no tiene asignado el concepto ${conceptoInfo.concepto_codigo}`,
        severidad: 'error',
        bloquea: true
      })
      registro.estado = 'error'
      lecturas.push(registro)
      continue
    }
    
    // 9. Obtener lectura anterior
    const lecturaAnterior = await getUltimaLectura(contador.id, conceptoInfo.concepto_id)
    registro.lectura_anterior = lecturaAnterior?.lectura_valor ?? contadorConcepto.lectura_inicial ?? 0
    registro.fecha_lectura_anterior = lecturaAnterior?.fecha_lectura ?? contadorConcepto.fecha_lectura_inicial
    
    // 10. Calcular consumo
    registro.consumo_calculado = round4(lecturaValor - registro.lectura_anterior)
    
    // 11. Obtener precio
    const precio = await getPrecioVigente(comunidadId, conceptoInfo.concepto_id)
    registro.precio_unitario = precio?.precio_unitario ?? 0
    registro.importe_estimado = round4(registro.consumo_calculado * registro.precio_unitario)
    
    // 12. Detectar alertas
    const alertasConfig = await getAlertasConfig()
    registro.alertas = detectAlertas(registro, alertasConfig, cliente)
    
    // 13. Determinar estado final
    if (registro.alertas.some(a => a.severidad === 'error')) {
      registro.estado = 'error'
    } else if (registro.alertas.length > 0) {
      registro.estado = 'alerta'
    } else {
      registro.estado = 'valido'
    }
    
    lecturas.push(registro)
  }
  
  return lecturas
}

/**
 * Detecta alertas en un registro de lectura
 */
function detectAlertas(registro, alertasConfig, cliente) {
  const alertas = []
  
  const getConfig = (tipo) => alertasConfig?.find(c => c.tipo === tipo) || { activa: true }
  
  // 1. Lectura negativa (consumo negativo)
  const configNegativa = getConfig('lectura_negativa')
  if (configNegativa.activa && registro.consumo_calculado < 0) {
    alertas.push({
      tipo: 'lectura_negativa',
      severidad: configNegativa.severidad || 'error',
      mensaje: `La lectura actual (${registro.lectura_valor}) es menor que la anterior (${registro.lectura_anterior})`,
      bloquea: configNegativa.bloquea_confirmacion ?? true
    })
  }
  
  // 2. Consumo cero
  const configCero = getConfig('consumo_cero')
  if (configCero.activa && registro.consumo_calculado === 0) {
    alertas.push({
      tipo: 'consumo_cero',
      severidad: configCero.severidad || 'info',
      mensaje: 'No se ha registrado consumo en el periodo',
      bloquea: configCero.bloquea_confirmacion ?? false
    })
  }
  
  // 3. Fecha futura
  const configFutura = getConfig('fecha_futura')
  if (configFutura.activa && isFutureDate(registro.fecha_lectura)) {
    alertas.push({
      tipo: 'fecha_futura',
      severidad: configFutura.severidad || 'error',
      mensaje: 'La fecha de lectura es posterior a hoy',
      bloquea: configFutura.bloquea_confirmacion ?? true
    })
  }
  
  // 4. Fecha anterior a última lectura
  const configAnterior = getConfig('fecha_anterior')
  if (configAnterior.activa && 
      registro.fecha_lectura_anterior && 
      registro.fecha_lectura <= new Date(registro.fecha_lectura_anterior)) {
    alertas.push({
      tipo: 'fecha_anterior',
      severidad: configAnterior.severidad || 'error',
      mensaje: `La fecha es anterior o igual a la última lectura`,
      bloquea: configAnterior.bloquea_confirmacion ?? true
    })
  }
  
  // 5. Cliente bloqueado
  const configBloqueado = getConfig('cliente_bloqueado')
  if (configBloqueado.activa && cliente?.bloqueado) {
    alertas.push({
      tipo: 'cliente_bloqueado',
      severidad: configBloqueado.severidad || 'warning',
      mensaje: `Cliente bloqueado: ${cliente.motivo_bloqueo || 'Sin motivo especificado'}`,
      bloquea: configBloqueado.bloquea_confirmacion ?? false
    })
  }
  
  // 6. Sin cliente asignado (warning, no bloquea)
  if (!registro.cliente_id) {
    alertas.push({
      tipo: 'sin_cliente',
      severidad: 'warning',
      mensaje: 'La ubicación no tiene un cliente asignado',
      bloquea: false
    })
  }
  
  // TODO: Implementar detección de consumo alto (requiere media histórica)
  
  return alertas
}

/**
 * Agrupa las lecturas por contador para visualización
 * @param {Array} lecturas - Array de registros de lectura
 * @returns {Array} - Lecturas agrupadas por contador
 */
export function groupLecturasByContador(lecturas) {
  const grupos = {}
  
  for (const lectura of lecturas) {
    const key = lectura.numero_contador || `fila_${lectura.fila_numero}`
    
    if (!grupos[key]) {
      grupos[key] = {
        numero_contador: lectura.numero_contador,
        contador_id: lectura.contador_id,
        ubicacion_id: lectura.ubicacion_id,
        cliente_id: lectura.cliente_id,
        cliente_nombre: lectura.cliente_nombre,
        portal: lectura.portal,
        vivienda: lectura.vivienda,
        fecha_lectura: lectura.fecha_lectura,
        fila_numero: lectura.fila_numero,
        conceptos: [],
        estado: 'valido',
        tieneErrores: false,
        tieneAlertas: false
      }
    }
    
    grupos[key].conceptos.push({
      concepto_codigo: lectura.concepto_codigo,
      concepto_id: lectura.concepto_id,
      concepto_nombre: lectura.concepto_nombre,
      unidad_medida: lectura.unidad_medida,
      lectura_valor: lectura.lectura_valor,
      lectura_anterior: lectura.lectura_anterior,
      consumo_calculado: lectura.consumo_calculado,
      precio_unitario: lectura.precio_unitario,
      importe_estimado: lectura.importe_estimado,
      alertas: lectura.alertas,
      estado: lectura.estado,
      id: lectura.id // ID del registro en importaciones_detalle
    })
    
    // Actualizar estado del grupo
    if (lectura.estado === 'error') {
      grupos[key].tieneErrores = true
      grupos[key].estado = 'error'
    } else if (lectura.estado === 'alerta' && grupos[key].estado !== 'error') {
      grupos[key].tieneAlertas = true
      grupos[key].estado = 'alerta'
    }
  }
  
  return Object.values(grupos)
}

/**
 * Calcula estadísticas de las lecturas procesadas
 */
export function calculateStats(lecturas) {
  const stats = {
    total: lecturas.length,
    validas: 0,
    conAlertas: 0,
    errores: 0,
    contadoresUnicos: new Set(),
    conceptosEncontrados: new Set()
  }
  
  for (const lectura of lecturas) {
    stats.contadoresUnicos.add(lectura.numero_contador)
    if (lectura.concepto_codigo) {
      stats.conceptosEncontrados.add(lectura.concepto_codigo)
    }
    
    switch (lectura.estado) {
      case 'valido':
        stats.validas++
        break
      case 'alerta':
        stats.conAlertas++
        break
      case 'error':
        stats.errores++
        break
    }
  }
  
  stats.contadoresUnicos = stats.contadoresUnicos.size
  stats.conceptosEncontrados = Array.from(stats.conceptosEncontrados)
  
  return stats
}



