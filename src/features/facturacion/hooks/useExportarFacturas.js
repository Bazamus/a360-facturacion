import { useMutation } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { supabase } from '../../../lib/supabase'

/**
 * Hook para exportar facturas a Excel
 * Ofrece diferentes modos de exportación
 */
export function useExportarFacturas() {
  /**
   * Exporta facturas en modo completo (2 pestañas)
   */
  const exportarCompleto = useMutation({
    mutationFn: async ({ facturas, opciones = {} }) => {
      // Obtener IDs de facturas
      const facturasIds = facturas.map(f => f.id)

      // Obtener líneas de todas las facturas
      const { data: lineas, error } = await supabase
        .from('facturas_lineas')
        .select(`
          *,
          factura:facturas!inner(numero_completo)
        `)
        .in('factura_id', facturasIds)
        .order('factura_id')
        .order('orden')

      if (error) throw error

      // Preparar datos para pestaña "Facturas"
      const datosFacturas = facturas.map(f => ({
        'Nº FACTURA': f.numero_completo || '-',
        'FECHA': formatDate(f.fecha_factura),
        'CÓD': f.cliente?.codigo_cliente || '-',
        'CLIENTE': f.cliente_nombre || '-',
        'NIF': f.cliente_nif || '-',
        'COMUNIDAD': f.comunidad?.nombre || '-',
        'ESTADO': formatEstado(f.estado),
        'BASE IMPONIBLE': f.base_imponible,
        'IVA (€)': f.importe_iva,
        'TOTAL (€)': f.total,
        'PERIODO INICIO': formatDate(f.periodo_inicio),
        'PERIODO FIN': formatDate(f.periodo_fin),
        'MÉTODO PAGO': formatMetodoPago(f.metodo_pago)
      }))

      // Preparar datos para pestaña "Detalles de Consumo"
      const datosDetalles = lineas.map(l => ({
        'Nº FACTURA': l.factura.numero_completo || '-',
        'CONCEPTO': l.concepto_codigo || '-',
        'DESCRIPCIÓN': l.concepto_nombre || '-',
        'UNIDAD': l.unidad_medida || '-',
        'CANTIDAD': l.cantidad,
        'PRECIO UNITARIO': l.precio_unitario,
        'SUBTOTAL': l.subtotal,
        'IVA (€)': Math.round(l.subtotal * 0.21 * 100) / 100,
        'TOTAL': Math.round((l.subtotal * 1.21) * 100) / 100,
        'LECTURA ANTERIOR': l.es_termino_fijo ? '-' : (l.lectura_anterior || '-'),
        'LECTURA ACTUAL': l.es_termino_fijo ? '-' : (l.lectura_actual || '-'),
        'CONSUMO': l.es_termino_fijo ? '-' : (l.consumo || '-'),
        'FECHA LECTURA': l.es_termino_fijo ? '-' : formatDate(l.fecha_lectura_actual)
      }))

      // Calcular totales para pestaña Facturas
      const totales = {
        'Nº FACTURA': 'TOTAL',
        'FECHA': '',
        'CÓD': '',
        'CLIENTE': '',
        'NIF': '',
        'COMUNIDAD': '',
        'ESTADO': '',
        'BASE IMPONIBLE': datosFacturas.reduce((sum, f) => sum + (f['BASE IMPONIBLE'] || 0), 0),
        'IVA (€)': datosFacturas.reduce((sum, f) => sum + (f['IVA (€)'] || 0), 0),
        'TOTAL (€)': datosFacturas.reduce((sum, f) => sum + (f['TOTAL (€)'] || 0), 0),
        'PERIODO INICIO': '',
        'PERIODO FIN': '',
        'MÉTODO PAGO': ''
      }

      // Añadir totales al final
      datosFacturas.push(totales)

      // Crear workbook
      const wb = XLSX.utils.book_new()

      // Crear hoja "Facturas"
      const wsFacturas = XLSX.utils.json_to_sheet(datosFacturas)

      // Aplicar formato a columnas numéricas
      const rangeFacturas = XLSX.utils.decode_range(wsFacturas['!ref'])
      for (let R = rangeFacturas.s.r + 1; R <= rangeFacturas.e.r; R++) {
        // Columnas BASE IMPONIBLE, IVA, TOTAL
        const cellBaseImponible = wsFacturas[XLSX.utils.encode_cell({ r: R, c: 7 })]
        const cellIVA = wsFacturas[XLSX.utils.encode_cell({ r: R, c: 8 })]
        const cellTotal = wsFacturas[XLSX.utils.encode_cell({ r: R, c: 9 })]

        if (cellBaseImponible) cellBaseImponible.z = '#,##0.00 "€"'
        if (cellIVA) cellIVA.z = '#,##0.00 "€"'
        if (cellTotal) cellTotal.z = '#,##0.00 "€"'
      }

      // Ajustar anchos de columna
      wsFacturas['!cols'] = [
        { wch: 15 }, // Nº FACTURA
        { wch: 12 }, // FECHA
        { wch: 10 }, // CÓD
        { wch: 25 }, // CLIENTE
        { wch: 12 }, // NIF
        { wch: 20 }, // COMUNIDAD
        { wch: 10 }, // ESTADO
        { wch: 15 }, // BASE IMPONIBLE
        { wch: 12 }, // IVA
        { wch: 12 }, // TOTAL
        { wch: 14 }, // PERIODO INICIO
        { wch: 14 }, // PERIODO FIN
        { wch: 16 }  // MÉTODO PAGO
      ]

      XLSX.utils.book_append_sheet(wb, wsFacturas, 'Facturas')

      // Crear hoja "Detalles de Consumo"
      const wsDetalles = XLSX.utils.json_to_sheet(datosDetalles)

      // Aplicar formato a columnas numéricas de detalles
      const rangeDetalles = XLSX.utils.decode_range(wsDetalles['!ref'])
      for (let R = rangeDetalles.s.r + 1; R <= rangeDetalles.e.r; R++) {
        // CANTIDAD, PRECIO UNITARIO, SUBTOTAL, IVA, TOTAL
        const cellCantidad = wsDetalles[XLSX.utils.encode_cell({ r: R, c: 4 })]
        const cellPrecio = wsDetalles[XLSX.utils.encode_cell({ r: R, c: 5 })]
        const cellSubtotal = wsDetalles[XLSX.utils.encode_cell({ r: R, c: 6 })]
        const cellIVA = wsDetalles[XLSX.utils.encode_cell({ r: R, c: 7 })]
        const cellTotal = wsDetalles[XLSX.utils.encode_cell({ r: R, c: 8 })]

        if (cellCantidad && typeof cellCantidad.v === 'number') cellCantidad.z = '#,##0.00'
        if (cellPrecio) cellPrecio.z = '#,##0.00 "€"'
        if (cellSubtotal) cellSubtotal.z = '#,##0.00 "€"'
        if (cellIVA) cellIVA.z = '#,##0.00 "€"'
        if (cellTotal) cellTotal.z = '#,##0.00 "€"'
      }

      // Ajustar anchos de columna
      wsDetalles['!cols'] = [
        { wch: 15 }, // Nº FACTURA
        { wch: 10 }, // CONCEPTO
        { wch: 28 }, // DESCRIPCIÓN
        { wch: 8 },  // UNIDAD
        { wch: 12 }, // CANTIDAD
        { wch: 16 }, // PRECIO UNITARIO
        { wch: 12 }, // SUBTOTAL
        { wch: 10 }, // IVA
        { wch: 10 }, // TOTAL
        { wch: 16 }, // LECTURA ANTERIOR
        { wch: 16 }, // LECTURA ACTUAL
        { wch: 12 }, // CONSUMO
        { wch: 14 }  // FECHA LECTURA
      ]

      XLSX.utils.book_append_sheet(wb, wsDetalles, 'Detalles de Consumo')

      // Generar archivo
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      // Generar nombre de archivo
      const nombreArchivo = generarNombreArchivo(facturas, opciones)

      // Descargar
      descargarBlob(blob, nombreArchivo)

      return {
        success: true,
        totalFacturas: facturas.length,
        totalLineas: lineas.length
      }
    }
  })

  /**
   * Exporta solo resumen de facturas (sin detalles)
   */
  const exportarResumen = useMutation({
    mutationFn: async ({ facturas, opciones = {} }) => {
      // Preparar datos
      const datos = facturas.map(f => ({
        'Nº FACTURA': f.numero_completo || '-',
        'FECHA': formatDate(f.fecha_factura),
        'CÓD': f.cliente?.codigo_cliente || '-',
        'CLIENTE': f.cliente_nombre || '-',
        'NIF': f.cliente_nif || '-',
        'COMUNIDAD': f.comunidad?.nombre || '-',
        'ESTADO': formatEstado(f.estado),
        'PERIODO INICIO': formatDate(f.periodo_inicio),
        'PERIODO FIN': formatDate(f.periodo_fin),
        'BASE IMPONIBLE': f.base_imponible,
        'IVA (€)': f.importe_iva,
        'TOTAL (€)': f.total,
        'MÉTODO PAGO': formatMetodoPago(f.metodo_pago)
      }))

      // Calcular totales
      const totales = {
        'Nº FACTURA': 'TOTAL',
        'FECHA': '',
        'CÓD': '',
        'CLIENTE': '',
        'NIF': '',
        'COMUNIDAD': '',
        'ESTADO': '',
        'PERIODO INICIO': '',
        'PERIODO FIN': '',
        'BASE IMPONIBLE': datos.reduce((sum, f) => sum + (f['BASE IMPONIBLE'] || 0), 0),
        'IVA (€)': datos.reduce((sum, f) => sum + (f['IVA (€)'] || 0), 0),
        'TOTAL (€)': datos.reduce((sum, f) => sum + (f['TOTAL (€)'] || 0), 0),
        'MÉTODO PAGO': ''
      }

      datos.push(totales)

      // Crear workbook
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(datos)

      // Aplicar formato a columnas numéricas
      const range = XLSX.utils.decode_range(ws['!ref'])
      for (let R = range.s.r + 1; R <= range.e.r; R++) {
        const cellBaseImponible = ws[XLSX.utils.encode_cell({ r: R, c: 9 })]
        const cellIVA = ws[XLSX.utils.encode_cell({ r: R, c: 10 })]
        const cellTotal = ws[XLSX.utils.encode_cell({ r: R, c: 11 })]

        if (cellBaseImponible) cellBaseImponible.z = '#,##0.00 "€"'
        if (cellIVA) cellIVA.z = '#,##0.00 "€"'
        if (cellTotal) cellTotal.z = '#,##0.00 "€"'
      }

      // Ajustar anchos
      ws['!cols'] = [
        { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 12 },
        { wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 15 },
        { wch: 12 }, { wch: 12 }, { wch: 16 }
      ]

      XLSX.utils.book_append_sheet(wb, ws, 'Facturas')

      // Generar y descargar
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      const nombreArchivo = generarNombreArchivo(facturas, opciones)
      descargarBlob(blob, nombreArchivo)

      return { success: true, totalFacturas: facturas.length }
    }
  })

  return {
    exportarCompleto,
    exportarResumen
  }
}

// Funciones auxiliares
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

function generarNombreArchivo(facturas, opciones = {}) {
  const fecha = new Date().toISOString().split('T')[0]

  // Si hay un solo cliente, usar su nombre
  const clientes = [...new Set(facturas.map(f => f.cliente_nombre))]
  if (clientes.length === 1) {
    const nombreCliente = clientes[0].replace(/\s+/g, '-').substring(0, 30)
    return `Facturas_${nombreCliente}_${fecha}.xlsx`
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
    return `Facturas_${anio}-${mes}.xlsx`
  }

  // Nombre genérico
  return `Facturas_${fecha}.xlsx`
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
