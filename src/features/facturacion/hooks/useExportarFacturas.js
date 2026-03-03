import { useMutation } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { supabase } from '../../../lib/supabase'
import { formatPrecio, formatLectura, formatConsumo, formatImporte } from '@/utils/precision'
import { ordenarLineasFactura } from '../utils/ordenConceptos'

/**
 * Ordena líneas de múltiples facturas
 * Agrupa por factura y ordena cada grupo según el orden de conceptos
 */
function ordenarLineasPorFactura(lineas) {
  if (!lineas || !Array.isArray(lineas)) return []
  
  // Agrupar por factura_id
  const grupos = {}
  lineas.forEach(linea => {
    const facturaId = linea.factura_id
    if (!grupos[facturaId]) {
      grupos[facturaId] = []
    }
    grupos[facturaId].push(linea)
  })
  
  // Ordenar cada grupo y aplanar
  const resultado = []
  Object.values(grupos).forEach(grupo => {
    const grupoOrdenado = ordenarLineasFactura(grupo)
    resultado.push(...grupoOrdenado)
  })
  
  return resultado
}

/**
 * Hook para exportar facturas a Excel
 * Ofrece diferentes modos de exportación con opciones avanzadas
 */
export function useExportarFacturas() {
  /**
   * Exporta facturas según la configuración proporcionada
   */
  const exportar = useMutation({
    mutationFn: async ({ facturas, config, onProgress }) => {
      const {
        formato = 'completo',
        columnasAdicionales = {},
        formatoNumeros = 'espanol',
        formatoAvanzado = true
      } = config

      // Callback de progreso
      const reportProgress = (current, total, message) => {
        if (onProgress) onProgress({ current, total, message })
      }

      reportProgress(0, 100, 'Preparando datos...')

      // Obtener IDs de facturas
      const facturasIds = facturas.map(f => f.id)

      // Obtener líneas de todas las facturas en lotes (evita URL demasiado larga con muchos UUIDs)
      reportProgress(20, 100, 'Obteniendo detalles de facturas...')
      const lineas = []
      const batchSize = 200 // ~200 UUIDs por lote para no exceder límite URL
      for (let i = 0; i < facturasIds.length; i += batchSize) {
        const batch = facturasIds.slice(i, i + batchSize)
        const { data: batchLineas, error } = await supabase
          .from('facturas_lineas')
          .select(`
            *,
            factura:facturas!inner(numero_completo)
          `)
          .in('factura_id', batch)
          .order('factura_id')
          .order('orden')

        if (error) throw error
        if (batchLineas) lineas.push(...batchLineas)

        const progreso = 20 + Math.round((i / facturasIds.length) * 20)
        reportProgress(progreso, 100, `Obteniendo detalles... (${Math.min(i + batchSize, facturasIds.length)}/${facturasIds.length})`)
      }

      // Ordenar líneas según orden predefinido de conceptos (por factura)
      const lineasOrdenadas = ordenarLineasPorFactura(lineas)

      reportProgress(40, 100, 'Generando Excel...')

      let wb, resultado

      switch (formato) {
        case 'resumen':
          resultado = await generarResumen(facturas, { columnasAdicionales, formatoNumeros, formatoAvanzado })
          wb = resultado.workbook
          break
        case 'completo':
          resultado = await generarCompleto(facturas, lineasOrdenadas, { columnasAdicionales, formatoNumeros, formatoAvanzado })
          wb = resultado.workbook
          break
        case 'detallado':
          resultado = await generarDetallado(facturas, lineasOrdenadas, { formatoNumeros, formatoAvanzado })
          wb = resultado.workbook
          break
        default:
          throw new Error('Formato no válido')
      }

      reportProgress(80, 100, 'Descargando archivo...')

      // Generar y descargar archivo
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      const nombreArchivo = generarNombreArchivo(facturas, config)
      descargarBlob(blob, nombreArchivo)

      reportProgress(100, 100, 'Completado')

      return {
        success: true,
        totalFacturas: facturas.length,
        totalLineas: lineasOrdenadas?.length || 0,
        formato
      }
    }
  })

  return { exportar }
}

// ==============================================
// FUNCIONES GENERADORAS DE FORMATOS
// ==============================================

async function generarResumen(facturas, opciones) {
  const { columnasAdicionales, formatoNumeros, formatoAvanzado } = opciones

  // Construir columnas base
  const columnas = [
    'Nº FACTURA',
    'FECHA',
    'CÓD',
    'CLIENTE',
    'NIF',
    'COMUNIDAD',
    'ESTADO',
    'PERIODO INICIO',
    'PERIODO FIN',
    'BASE IMPONIBLE',
    'IVA (€)',
    'TOTAL (€)',
    'MÉTODO PAGO'
  ]

  // Añadir columnas adicionales
  if (columnasAdicionales.direccion) columnas.splice(6, 0, 'DIRECCIÓN')
  if (columnasAdicionales.email) columnas.splice(6, 0, 'EMAIL')
  if (columnasAdicionales.iban) columnas.splice(6, 0, 'IBAN')
  if (columnasAdicionales.codigoComunidad) columnas.splice(6, 0, 'CÓD. COMUNIDAD')
  if (columnasAdicionales.numeroContador) columnas.push('Nº CONTADOR')
  if (columnasAdicionales.ubicacion) columnas.push('UBICACIÓN')

  // Preparar datos
  const datos = facturas.map(f => {
    const fila = {
      'Nº FACTURA': f.numero_completo || '-',
      'FECHA': formatDate(f.fecha_factura),
      'CÓD': f.codigo_cliente || f.cliente?.codigo_cliente || '-',
      'CLIENTE': f.cliente_nombre || '-',
      'NIF': f.cliente_nif || '-',
      'COMUNIDAD': f.comunidad_nombre || f.comunidad?.nombre || '-',
      'ESTADO': formatEstado(f.estado),
      'PERIODO INICIO': formatDate(f.periodo_inicio),
      'PERIODO FIN': formatDate(f.periodo_fin),
      'BASE IMPONIBLE': f.base_imponible,
      'IVA (€)': f.importe_iva,
      'TOTAL (€)': f.total,
      'MÉTODO PAGO': formatMetodoPago(f.metodo_pago)
    }

    // Añadir columnas adicionales
    if (columnasAdicionales.direccion) {
      const direccion = [f.cliente_direccion, f.cliente_cp, f.cliente_ciudad]
        .filter(Boolean).join(', ')
      fila['DIRECCIÓN'] = direccion || '-'
    }
    if (columnasAdicionales.email) fila['EMAIL'] = f.cliente_email || '-'
    if (columnasAdicionales.iban) fila['IBAN'] = f.cliente_iban || '-'
    if (columnasAdicionales.codigoComunidad) fila['CÓD. COMUNIDAD'] = f.comunidad_codigo || f.comunidad?.codigo || '-'
    if (columnasAdicionales.numeroContador) fila['Nº CONTADOR'] = f.contador_numero_serie || '-'
    if (columnasAdicionales.ubicacion) fila['UBICACIÓN'] = f.ubicacion_direccion || '-'

    return fila
  })

  // Calcular totales
  const totales = {
    'Nº FACTURA': 'TOTAL',
    'BASE IMPONIBLE': datos.reduce((sum, f) => sum + (f['BASE IMPONIBLE'] || 0), 0),
    'IVA (€)': datos.reduce((sum, f) => sum + (f['IVA (€)'] || 0), 0),
    'TOTAL (€)': datos.reduce((sum, f) => sum + (f['TOTAL (€)'] || 0), 0)
  }

  datos.push(totales)

  // Crear workbook
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(datos)

  // Aplicar formato
  if (formatoAvanzado) {
    aplicarFormatoAvanzado(ws, datos.length, columnas, formatoNumeros, true)
  } else {
    aplicarFormatoBasico(ws, datos.length, columnas, formatoNumeros)
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Facturas')

  return { workbook: wb }
}

async function generarCompleto(facturas, lineas, opciones) {
  const { columnasAdicionales, formatoNumeros, formatoAvanzado } = opciones

  // Pestaña 1: Facturas
  const columnasFacturas = [
    'Nº FACTURA',
    'FECHA',
    'CÓD',
    'CLIENTE',
    'NIF',
    'COMUNIDAD',
    'ESTADO',
    'BASE IMPONIBLE',
    'IVA (€)',
    'TOTAL (€)',
    'PERIODO INICIO',
    'PERIODO FIN',
    'MÉTODO PAGO'
  ]

  // Añadir columnas adicionales
  if (columnasAdicionales.direccion) columnasFacturas.splice(6, 0, 'DIRECCIÓN')
  if (columnasAdicionales.email) columnasFacturas.splice(6, 0, 'EMAIL')
  if (columnasAdicionales.iban) columnasFacturas.splice(6, 0, 'IBAN')
  if (columnasAdicionales.codigoComunidad) columnasFacturas.splice(6, 0, 'CÓD. COMUNIDAD')
  if (columnasAdicionales.numeroContador) columnasFacturas.push('Nº CONTADOR')
  if (columnasAdicionales.ubicacion) columnasFacturas.push('UBICACIÓN')

  const datosFacturas = facturas.map(f => {
    const fila = {
      'Nº FACTURA': f.numero_completo || '-',
      'FECHA': formatDate(f.fecha_factura),
      'CÓD': f.codigo_cliente || f.cliente?.codigo_cliente || '-',
      'CLIENTE': f.cliente_nombre || '-',
      'NIF': f.cliente_nif || '-',
      'COMUNIDAD': f.comunidad_nombre || f.comunidad?.nombre || '-',
      'ESTADO': formatEstado(f.estado),
      'BASE IMPONIBLE': f.base_imponible,
      'IVA (€)': f.importe_iva,
      'TOTAL (€)': f.total,
      'PERIODO INICIO': formatDate(f.periodo_inicio),
      'PERIODO FIN': formatDate(f.periodo_fin),
      'MÉTODO PAGO': formatMetodoPago(f.metodo_pago)
    }

    if (columnasAdicionales.direccion) {
      const direccion = [f.cliente_direccion, f.cliente_cp, f.cliente_ciudad]
        .filter(Boolean).join(', ')
      fila['DIRECCIÓN'] = direccion || '-'
    }
    if (columnasAdicionales.email) fila['EMAIL'] = f.cliente_email || '-'
    if (columnasAdicionales.iban) fila['IBAN'] = f.cliente_iban || '-'
    if (columnasAdicionales.codigoComunidad) fila['CÓD. COMUNIDAD'] = f.comunidad_codigo || f.comunidad?.codigo || '-'
    if (columnasAdicionales.numeroContador) fila['Nº CONTADOR'] = f.contador_numero_serie || '-'
    if (columnasAdicionales.ubicacion) fila['UBICACIÓN'] = f.ubicacion_direccion || '-'

    return fila
  })

  // Totales facturas
  const totalesFacturas = {
    'Nº FACTURA': 'TOTAL',
    'BASE IMPONIBLE': datosFacturas.reduce((sum, f) => sum + (f['BASE IMPONIBLE'] || 0), 0),
    'IVA (€)': datosFacturas.reduce((sum, f) => sum + (f['IVA (€)'] || 0), 0),
    'TOTAL (€)': datosFacturas.reduce((sum, f) => sum + (f['TOTAL (€)'] || 0), 0)
  }
  datosFacturas.push(totalesFacturas)

  // Pestaña 2: Detalles
  const datosDetalles = lineas.map(l => ({
    'Nº FACTURA': l.factura.numero_completo || '-',
    'CONCEPTO': l.concepto_codigo || '-',
    'DESCRIPCIÓN': l.concepto_nombre || '-',
    'UNIDAD': l.unidad_medida || '-',
    'CANTIDAD': formatConsumo(l.cantidad, ''),  // 3 decimales sin unidad
    'PRECIO UNITARIO': formatPrecio(l.precio_unitario, l.concepto_codigo, false),  // Precisión variable sin símbolo
    'SUBTOTAL': formatImporte(l.subtotal, false),  // 2 decimales sin símbolo
    'IVA (€)': formatImporte(l.subtotal * 0.21, false),  // 2 decimales sin símbolo
    'TOTAL': formatImporte(l.subtotal * 1.21, false),  // 2 decimales sin símbolo
    'LECTURA ANTERIOR': l.es_termino_fijo ? '-' : formatLectura(l.lectura_anterior || 0),  // 3 decimales
    'LECTURA ACTUAL': l.es_termino_fijo ? '-' : formatLectura(l.lectura_actual || 0),  // 3 decimales
    'CONSUMO': l.es_termino_fijo ? '-' : formatConsumo(l.consumo || 0, ''),  // 3 decimales sin unidad
    'FECHA LECTURA': l.es_termino_fijo ? '-' : formatDate(l.fecha_lectura_actual)
  }))

  // Crear workbook
  const wb = XLSX.utils.book_new()

  // Hoja 1: Facturas
  const wsFacturas = XLSX.utils.json_to_sheet(datosFacturas)
  if (formatoAvanzado) {
    aplicarFormatoAvanzado(wsFacturas, datosFacturas.length, columnasFacturas, formatoNumeros, true)
  } else {
    aplicarFormatoBasico(wsFacturas, datosFacturas.length, columnasFacturas, formatoNumeros)
  }
  XLSX.utils.book_append_sheet(wb, wsFacturas, 'Facturas')

  // Hoja 2: Detalles
  const wsDetalles = XLSX.utils.json_to_sheet(datosDetalles)
  const columnasDetalles = ['Nº FACTURA', 'CONCEPTO', 'DESCRIPCIÓN', 'UNIDAD', 'CANTIDAD', 'PRECIO UNITARIO', 'SUBTOTAL', 'IVA (€)', 'TOTAL', 'LECTURA ANTERIOR', 'LECTURA ACTUAL', 'CONSUMO', 'FECHA LECTURA']
  if (formatoAvanzado) {
    aplicarFormatoAvanzado(wsDetalles, datosDetalles.length, columnasDetalles, formatoNumeros, false)
  } else {
    aplicarFormatoBasico(wsDetalles, datosDetalles.length, columnasDetalles, formatoNumeros)
  }
  XLSX.utils.book_append_sheet(wb, wsDetalles, 'Detalles de Consumo')

  return { workbook: wb }
}

async function generarDetallado(facturas, lineas, opciones) {
  const { formatoNumeros, formatoAvanzado } = opciones

  // Crear mapa de facturas por ID
  const facturasMap = {}
  facturas.forEach(f => {
    facturasMap[f.id] = f
  })

  // Combinar datos de facturas y líneas
  const datos = lineas.map(l => {
    const factura = facturasMap[l.factura_id]
    if (!factura) return null

    return {
      'Nº FACTURA': factura.numero_completo || '-',
      'FECHA': formatDate(factura.fecha_factura),
      'CÓD': factura.codigo_cliente || factura.cliente?.codigo_cliente || '-',
      'CLIENTE': factura.cliente_nombre || '-',
      'NIF': factura.cliente_nif || '-',
      'COMUNIDAD': factura.comunidad_nombre || factura.comunidad?.nombre || '-',
      'ESTADO': formatEstado(factura.estado),
      'CONCEPTO': l.concepto_codigo || '-',
      'DESCRIPCIÓN': l.concepto_nombre || '-',
      'CANTIDAD': formatConsumo(l.cantidad, ''),  // 3 decimales sin unidad
      'PRECIO UNITARIO': formatPrecio(l.precio_unitario, l.concepto_codigo, false),  // Precisión variable sin símbolo
      'SUBTOTAL': formatImporte(l.subtotal, false),  // 2 decimales sin símbolo
      'IVA LÍNEA (€)': formatImporte(l.subtotal * 0.21, false),  // 2 decimales sin símbolo
      'TOTAL LÍNEA (€)': formatImporte(l.subtotal * 1.21, false),  // 2 decimales sin símbolo
      'BASE IMPONIBLE': formatImporte(factura.base_imponible, false),  // 2 decimales sin símbolo
      'IVA FACTURA (€)': formatImporte(factura.importe_iva, false),  // 2 decimales sin símbolo
      'TOTAL FACTURA (€)': formatImporte(factura.total, false)  // 2 decimales sin símbolo
    }
  }).filter(Boolean)

  const columnas = ['Nº FACTURA', 'FECHA', 'CÓD', 'CLIENTE', 'NIF', 'COMUNIDAD', 'ESTADO', 'CONCEPTO', 'DESCRIPCIÓN', 'CANTIDAD', 'PRECIO UNITARIO', 'SUBTOTAL', 'IVA LÍNEA (€)', 'TOTAL LÍNEA (€)', 'BASE IMPONIBLE', 'IVA FACTURA (€)', 'TOTAL FACTURA (€)']

  // Crear workbook
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(datos)

  if (formatoAvanzado) {
    aplicarFormatoAvanzado(ws, datos.length, columnas, formatoNumeros, false)
  } else {
    aplicarFormatoBasico(ws, datos.length, columnas, formatoNumeros)
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Facturas Detalladas')

  return { workbook: wb }
}

// ==============================================
// FUNCIONES DE FORMATO
// ==============================================

function aplicarFormatoBasico(ws, numRows, columnas, formatoNumeros) {
  const range = XLSX.utils.decode_range(ws['!ref'])

  // Aplicar formato a columnas numéricas
  const formatoMoneda = formatoNumeros === 'espanol' ? '#,##0.00 "€"' : '#,##0.00 " €"'
  const formatoNumero = formatoNumeros === 'espanol' ? '#,##0.00' : '#,##0.00'

  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })]
      if (!cell) continue

      const colName = columnas[C]
      if (colName && typeof cell.v === 'number') {
        if (colName.includes('€') || colName.includes('IMPONIBLE') || colName.includes('IVA') || colName.includes('TOTAL') || colName.includes('PRECIO') || colName.includes('SUBTOTAL')) {
          cell.z = formatoMoneda
        } else if (colName === 'CANTIDAD' || colName === 'CONSUMO') {
          cell.z = formatoNumero
        }
      }
    }
  }

  // Ajustar anchos
  const colWidths = columnas.map(col => {
    if (col.includes('FACTURA')) return { wch: 15 }
    if (col === 'FECHA' || col.includes('PERIODO')) return { wch: 12 }
    if (col === 'CÓD') return { wch: 10 }
    if (col === 'CLIENTE' || col === 'DESCRIPCIÓN') return { wch: 28 }
    if (col === 'NIF' || col === 'ESTADO') return { wch: 12 }
    if (col === 'COMUNIDAD') return { wch: 20 }
    if (col.includes('DIRECCIÓN') || col === 'EMAIL') return { wch: 35 }
    if (col === 'IBAN') return { wch: 25 }
    if (col.includes('UBICACIÓN')) return { wch: 30 }
    return { wch: 15 }
  })
  ws['!cols'] = colWidths
}

function aplicarFormatoAvanzado(ws, numRows, columnas, formatoNumeros, conTotales) {
  // Aplicar formato básico primero
  aplicarFormatoBasico(ws, numRows, columnas, formatoNumeros)

  const range = XLSX.utils.decode_range(ws['!ref'])

  // Congelar primera fila (cabeceras)
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }

  // Aplicar filtros automáticos
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({
    s: { c: range.s.c, r: range.s.r },
    e: { c: range.e.c, r: conTotales ? range.e.r - 1 : range.e.r }
  })}

  // Nota: xlsx library tiene soporte limitado para estilos (colores, negritas, etc.)
  // Para formato avanzado completo se necesitaría xlsx-style o similar
  // Por ahora aplicamos lo que podemos con la librería estándar
}

// ==============================================
// FUNCIONES AUXILIARES
// ==============================================

function formatDate(date) {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatEstado(estado) {
  const estados = {
    'borrador': 'Borrador',
    'emitida': 'Emitida',
    'pagada': 'Pagada',
    'anulada': 'Anulada'
  }
  return estados[estado] || estado
}

function formatMetodoPago(metodo) {
  const metodos = {
    'domiciliacion': 'Domiciliación',
    'transferencia': 'Transferencia',
    'efectivo': 'Efectivo',
    'otro': 'Otro'
  }
  return metodos[metodo] || metodo
}

function generarNombreArchivo(facturas, config) {
  const fecha = new Date().toISOString().split('T')[0]
  const formato = config.formato || 'completo'

  // Si hay un solo cliente, usar su nombre
  const clientes = [...new Set(facturas.map(f => f.cliente_nombre))]
  if (clientes.length === 1) {
    const nombreCliente = clientes[0].replace(/\s+/g, '-').substring(0, 30)
    return `Facturas_${nombreCliente}_${formato}_${fecha}.xlsx`
  }

  // Si todas son del mismo mes/año
  const fechas = facturas.map(f => f.fecha_factura)
  const primeraFecha = new Date(fechas[0])
  const ultimaFecha = new Date(fechas[fechas.length - 1])

  if (fechas.length > 1 &&
      primeraFecha.getMonth() === ultimaFecha.getMonth() &&
      primeraFecha.getFullYear() === ultimaFecha.getFullYear()) {
    const mes = String(primeraFecha.getMonth() + 1).padStart(2, '0')
    const anio = primeraFecha.getFullYear()
    return `Facturas_${anio}-${mes}_${formato}.xlsx`
  }

  // Nombre genérico
  return `Facturas_${formato}_${fecha}.xlsx`
}

function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nombreArchivo
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
