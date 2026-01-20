/**
 * Utilidades de cálculo para facturación
 */

import { redondear, PRECISION_IMPORTES } from '@/utils/precision'

/**
 * Redondea un valor a 2 decimales (para importes finales)
 */
export function round2(value) {
  return redondear(value, PRECISION_IMPORTES)
}

/**
 * Calcula los días de un periodo
 */
export function calcularDiasPeriodo(fechaInicio, fechaFin) {
  const inicio = new Date(fechaInicio)
  const fin = new Date(fechaFin)
  const diff = fin.getTime() - inicio.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
}

/**
 * Obtiene los días del mes
 */
export function getDiasDelMes(fecha) {
  const d = new Date(fecha)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}

/**
 * Calcula si un periodo es parcial
 */
export function esPeriodoParcial(fechaInicio, fechaFin) {
  const diasPeriodo = calcularDiasPeriodo(fechaInicio, fechaFin)
  const diasMes = getDiasDelMes(fechaInicio)
  return diasPeriodo < diasMes
}

/**
 * Calcula el prorrateo del término fijo
 */
export function calcularProrrateoTerminoFijo(precioMensual, diasPeriodo, diasMes) {
  if (diasPeriodo >= diasMes) return round2(precioMensual)
  return round2((precioMensual * diasPeriodo) / diasMes)
}

/**
 * Calcula el subtotal de una línea
 * IMPORTANTE: NO redondear cantidad ni precio (usar precisión completa)
 * Solo redondear el resultado final a 2 decimales
 */
export function calcularSubtotal(cantidad, precioUnitario, descuentoPorcentaje = 0) {
  // NO redondear cantidad ni precio - usar todos los decimales disponibles
  const bruto = cantidad * precioUnitario
  const descuento = bruto * (descuentoPorcentaje / 100)

  // Solo redondear el resultado final a 2 decimales
  return round2(bruto - descuento)
}

/**
 * Calcula los totales de una factura
 */
export function calcularTotalesFactura(lineas, porcentajeIva = 21) {
  const baseImponible = lineas.reduce((sum, l) => sum + (Number(l.subtotal) || 0), 0)
  const importeIva = round2(baseImponible * (porcentajeIva / 100))
  const total = round2(baseImponible + importeIva)

  return {
    baseImponible: round2(baseImponible),
    importeIva,
    total
  }
}

/**
 * Formatea un valor como moneda
 */
export function formatCurrency(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(value || 0)
}

/**
 * Formatea una cantidad con unidad
 */
export function formatCantidad(value, unidad, decimales = 4) {
  const num = Number(value) || 0
  return `${num.toFixed(decimales)} ${unidad}`
}

/**
 * Formatea una fecha
 */
export function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Formatea un IBAN con espacios
 */
export function formatIBAN(iban) {
  if (!iban) return ''
  return iban.replace(/(.{4})/g, '$1 ').trim()
}

/**
 * Obtiene la etiqueta del método de pago
 */
export function getMetodoPagoLabel(metodo) {
  const labels = {
    domiciliacion: 'Domiciliación SEPA',
    transferencia: 'Transferencia bancaria',
    efectivo: 'Efectivo',
    otro: 'Otro'
  }
  return labels[metodo] || metodo
}

/**
 * Obtiene la etiqueta del estado de factura
 */
export function getEstadoLabel(estado) {
  const labels = {
    borrador: 'Borrador',
    emitida: 'Emitida',
    pagada: 'Pagada',
    anulada: 'Anulada'
  }
  return labels[estado] || estado
}

/**
 * Obtiene el color del estado de factura
 */
export function getEstadoColor(estado) {
  const colors = {
    borrador: 'gray',
    emitida: 'blue',
    pagada: 'green',
    anulada: 'red'
  }
  return colors[estado] || 'gray'
}

/**
 * Genera datos de factura desde lecturas
 */
export function generarDatosFactura(params) {
  const {
    cliente,
    comunidad,
    ubicacion,
    contador,
    periodoInicio,
    periodoFin,
    lecturas,
    precios,
    conceptos
  } = params

  const diasPeriodo = calcularDiasPeriodo(periodoInicio, periodoFin)
  const diasMes = getDiasDelMes(periodoInicio)
  const esParcial = diasPeriodo < diasMes

  // Generar líneas desde lecturas
  const lineas = []
  let orden = 0

  for (const lectura of lecturas) {
    const concepto = conceptos.find(c => c.id === lectura.concepto_id)
    const precio = precios.find(p => p.concepto_id === lectura.concepto_id)

    if (!concepto || !precio) continue

    const subtotal = calcularSubtotal(lectura.consumo, precio.precio_unitario)

    lineas.push({
      lectura_id: lectura.id,
      concepto_id: concepto.id,
      concepto_codigo: concepto.codigo,
      concepto_nombre: concepto.nombre,
      unidad_medida: concepto.unidad_medida,
      es_termino_fijo: false,
      contador_numero_serie: contador.numero_serie,
      lectura_anterior: lectura.lectura_anterior,
      fecha_lectura_anterior: lectura.fecha_lectura_anterior,
      lectura_actual: lectura.lectura_valor,
      fecha_lectura_actual: lectura.fecha_lectura,
      consumo: lectura.consumo,
      cantidad: lectura.consumo,
      precio_unitario: precio.precio_unitario,
      subtotal,
      orden: orden++
    })
  }

  // Añadir término fijo si existe
  const conceptoTF = conceptos.find(c => c.es_termino_fijo)
  const precioTF = conceptoTF ? precios.find(p => p.concepto_id === conceptoTF.id) : null

  if (conceptoTF && precioTF) {
    const cantidadTF = esParcial ? (diasPeriodo / diasMes) : 1  // No redondear, usar precisión completa
    const subtotalTF = calcularProrrateoTerminoFijo(precioTF.precio_unitario, diasPeriodo, diasMes)

    lineas.push({
      lectura_id: null,
      concepto_id: conceptoTF.id,
      concepto_codigo: conceptoTF.codigo,
      concepto_nombre: 'Término fijo gestión energética',
      unidad_medida: 'unidad',
      es_termino_fijo: true,
      cantidad: cantidadTF,
      precio_unitario: precioTF.precio_unitario,
      subtotal: subtotalTF,
      orden: orden++
    })
  }

  // Calcular totales
  const totales = calcularTotalesFactura(lineas)

  // Calcular fecha de vencimiento (15 días después del fin del periodo)
  const fechaVencimiento = new Date(periodoFin)
  fechaVencimiento.setDate(fechaVencimiento.getDate() + 15)

  return {
    factura: {
      cliente_id: cliente.id,
      comunidad_id: comunidad.id,
      ubicacion_id: ubicacion.id,
      contador_id: contador.id,
      periodo_inicio: periodoInicio,
      periodo_fin: periodoFin,
      es_periodo_parcial: esParcial,
      dias_periodo: diasPeriodo,
      fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
      ...totales,
      metodo_pago: cliente.iban ? 'domiciliacion' : 'transferencia',
      cliente_nombre: `${cliente.nombre} ${cliente.apellidos || ''}`.trim(),
      cliente_nif: cliente.nif,
      cliente_direccion: cliente.direccion_correspondencia || ubicacion.direccion || '',
      cliente_cp: cliente.cp_correspondencia || '',
      cliente_ciudad: cliente.ciudad_correspondencia || '',
      cliente_provincia: cliente.provincia_correspondencia || '',
      cliente_email: cliente.email,
      cliente_iban: cliente.iban,
      ubicacion_direccion: ubicacion.nombre || ubicacion.direccion || ''
    },
    lineas
  }
}



