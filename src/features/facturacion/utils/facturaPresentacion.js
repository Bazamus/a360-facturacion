function toDateValue(value) {
  if (!value) return null
  const ts = new Date(value).getTime()
  return Number.isNaN(ts) ? null : ts
}

function minDate(values) {
  const valid = values.map(toDateValue).filter((v) => v != null)
  if (valid.length === 0) return null
  return new Date(Math.min(...valid)).toISOString().slice(0, 10)
}

function maxDate(values) {
  const valid = values.map(toDateValue).filter((v) => v != null)
  if (valid.length === 0) return null
  return new Date(Math.max(...valid)).toISOString().slice(0, 10)
}

export function getPeriodoGlobalDesdeLineas(lineas = [], fallbackInicio = null, fallbackFin = null) {
  const inicio = minDate(lineas.map((l) => l.fecha_lectura_anterior)) || fallbackInicio
  const fin = maxDate(lineas.map((l) => l.fecha_lectura_actual || l.fecha_lectura)) || fallbackFin
  return { inicio, fin }
}

export function agruparLineasParaDocumento(lineas = []) {
  const groups = new Map()

  for (const linea of lineas) {
    const key = [
      linea.concepto_id || '',
      linea.concepto_codigo || '',
      linea.concepto_nombre || '',
      linea.unidad_medida || '',
      linea.es_termino_fijo ? '1' : '0',
      linea.precio_unitario ?? 0,
      linea.descuento_porcentaje ?? 0,
      linea.contador_numero_serie || ''
    ].join('|')

    if (!groups.has(key)) {
      groups.set(key, {
        ...linea,
        lectura_id: null,
        lectura_anterior: null,
        lectura_actual: null,
        fecha_lectura_anterior: null,
        fecha_lectura_actual: null,
        cantidad: Number(linea.cantidad || 0),
        consumo: Number(linea.consumo || 0),
        descuento_importe: Number(linea.descuento_importe || 0),
        subtotal: Number(linea.subtotal || 0),
        orden: Number(linea.orden || 0)
      })
      continue
    }

    const curr = groups.get(key)
    curr.cantidad += Number(linea.cantidad || 0)
    curr.consumo += Number(linea.consumo || 0)
    curr.descuento_importe += Number(linea.descuento_importe || 0)
    curr.subtotal += Number(linea.subtotal || 0)
    curr.orden = Math.min(curr.orden, Number(linea.orden || 0))
  }

  return Array.from(groups.values())
    .map((linea) => ({
      ...linea,
      cantidad: Math.round(linea.cantidad * 10000) / 10000,
      consumo: Math.round(linea.consumo * 10000) / 10000,
      descuento_importe: Math.round(linea.descuento_importe * 100) / 100,
      subtotal: Math.round(linea.subtotal * 100) / 100
    }))
    .sort((a, b) => (a.orden || 0) - (b.orden || 0))
}

export function getFacturaDatosPresentacion(factura, lineas = []) {
  const agrupar = Boolean(factura?.agrupar_conceptos_en_documento)
  if (!agrupar) {
    return {
      lineas,
      periodoInicio: factura?.periodo_inicio || null,
      periodoFin: factura?.periodo_fin || null,
      agrupada: false
    }
  }

  const periodo = getPeriodoGlobalDesdeLineas(lineas, factura?.periodo_inicio || null, factura?.periodo_fin || null)
  return {
    lineas: agruparLineasParaDocumento(lineas),
    periodoInicio: periodo.inicio,
    periodoFin: periodo.fin,
    agrupada: true
  }
}

