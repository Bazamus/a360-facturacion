import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Colores corporativos
const COLORS = {
  primary: [27, 79, 114],      // #1B4F72
  secondary: [46, 134, 171],   // #2E86AB
  text: [51, 51, 51],          // #333333
  lightGray: [245, 245, 245],  // #F5F5F5
  gray: [150, 150, 150],
  success: [40, 167, 69],      // #28A745
  danger: [220, 53, 69],       // #DC3545
  white: [255, 255, 255]
}

// Datos de la empresa
const EMPRESA = {
  nombre: 'A360 SERVICIOS ENERGÉTICOS S.L.',
  direccion: 'C/ Polvoranca Nº 138',
  cp: '28923',
  ciudad: 'Alcorcón',
  provincia: 'Madrid',
  telefono: '91 159 11 70',
  email: 'clientes@a360se.com',
  web: 'www.a360se.com',
  cif: 'B88313473'
}

// Formatear fecha
function formatDate(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Formatear moneda
function formatCurrency(value) {
  if (value == null) return '0,00 €'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(value)
}

// Formatear cantidad
function formatCantidad(value, unidad = '', decimales = 4) {
  if (value == null) return '—'
  const num = Number(value).toFixed(decimales)
  return unidad ? `${num} ${unidad}` : num
}

// Formatear IBAN
function formatIBAN(iban) {
  if (!iban) return '—'
  return iban.replace(/(.{4})/g, '$1 ').trim()
}

// Obtener etiqueta método de pago
function getMetodoPagoLabel(metodo) {
  const metodos = {
    'domiciliacion': 'Domiciliación bancaria (SEPA)',
    'transferencia': 'Transferencia bancaria',
    'efectivo': 'Efectivo',
    'otro': 'Otro'
  }
  return metodos[metodo] || metodo || '—'
}

// Dibujar gráfico de barras simple
function drawBarChart(doc, data, x, y, width, height) {
  if (!data || data.length === 0) return

  const maxValue = Math.max(...data.map(d => d.consumo || 0), 0.1)
  const barWidth = (width - 20) / data.length - 8
  const chartHeight = height - 25

  // Fondo del gráfico
  doc.setFillColor(...COLORS.lightGray)
  doc.roundedRect(x, y, width, height, 2, 2, 'F')

  // Título
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.text)
  doc.setFont('helvetica', 'bold')
  doc.text('Evolución de consumo (últimos meses)', x + 5, y + 10)

  // Dibujar barras
  data.forEach((item, index) => {
    const barHeight = (item.consumo / maxValue) * (chartHeight - 15)
    const barX = x + 10 + index * (barWidth + 8)
    const barY = y + height - 20 - barHeight

    // Barra con gradiente simulado
    doc.setFillColor(...COLORS.secondary)
    doc.roundedRect(barX, barY, barWidth, barHeight, 1, 1, 'F')

    // Mes
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.gray)
    const mes = item.periodo?.substring(5, 7) || ''
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const mesLabel = meses[parseInt(mes) - 1] || mes
    doc.text(mesLabel, barX + barWidth / 2, y + height - 8, { align: 'center' })

    // Valor
    doc.setFontSize(5)
    doc.text(Number(item.consumo || 0).toFixed(2), barX + barWidth / 2, barY - 2, { align: 'center' })
  })
}

/**
 * Genera el PDF de una factura
 * @param {Object} factura - Datos de la factura
 * @param {Array} lineas - Líneas de la factura
 * @param {Array} historico - Histórico de consumo para el gráfico
 * @returns {jsPDF} - Documento PDF
 */
export function generarFacturaPDF(factura, lineas = [], historico = []) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let currentY = margin

  // =========================================
  // HEADER - Logo y datos empresa
  // =========================================
  
  // Recuadro del logo (placeholder)
  doc.setFillColor(...COLORS.primary)
  doc.roundedRect(margin, currentY, 25, 25, 2, 2, 'F')
  doc.setTextColor(...COLORS.white)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('A360', margin + 12.5, currentY + 14, { align: 'center' })
  doc.setFontSize(6)
  doc.text('ENERGÍA', margin + 12.5, currentY + 19, { align: 'center' })

  // Datos de la empresa
  doc.setTextColor(...COLORS.text)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(EMPRESA.nombre, margin + 30, currentY + 6)
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(EMPRESA.direccion, margin + 30, currentY + 11)
  doc.text(`${EMPRESA.cp} ${EMPRESA.ciudad}, ${EMPRESA.provincia}`, margin + 30, currentY + 15)
  doc.text(`Tel: ${EMPRESA.telefono}`, margin + 30, currentY + 19)
  doc.text(EMPRESA.email, margin + 30, currentY + 23)
  doc.text(`CIF: ${EMPRESA.cif}`, margin + 30, currentY + 27)

  // Título FACTURA
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('FACTURA', pageWidth - margin, currentY + 8, { align: 'right' })
  
  // Número y fecha
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.text)
  doc.setFont('helvetica', 'normal')
  doc.text(`Nº ${factura.numero_completo || 'BORRADOR'}`, pageWidth - margin, currentY + 15, { align: 'right' })
  doc.text(`Fecha: ${formatDate(factura.fecha_factura)}`, pageWidth - margin, currentY + 20, { align: 'right' })
  
  if (factura.cliente_id) {
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.gray)
    doc.text(`Ref: ${factura.cliente_id.substring(0, 8).toUpperCase()}`, pageWidth - margin, currentY + 25, { align: 'right' })
  }

  currentY += 35

  // Línea separadora
  doc.setDrawColor(...COLORS.secondary)
  doc.setLineWidth(0.5)
  doc.line(margin, currentY, pageWidth - margin, currentY)
  currentY += 8

  // =========================================
  // DATOS DEL CLIENTE
  // =========================================
  
  doc.setFillColor(...COLORS.lightGray)
  doc.roundedRect(margin, currentY, pageWidth - 2 * margin, 28, 2, 2, 'F')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('DATOS DEL CLIENTE', margin + 5, currentY + 7)

  doc.setFontSize(9)
  doc.setTextColor(...COLORS.text)
  doc.setFont('helvetica', 'bold')
  doc.text(factura.cliente_nombre || '—', margin + 5, currentY + 13)
  
  doc.setFont('helvetica', 'normal')
  doc.text(`NIF: ${factura.cliente_nif || '—'}`, margin + 5, currentY + 18)
  doc.text(factura.cliente_direccion || '—', margin + 5, currentY + 23)
  
  // Segunda columna - dirección y email
  const col2X = pageWidth / 2
  doc.text(`${factura.cliente_cp || ''} ${factura.cliente_ciudad || ''}`, col2X, currentY + 13)
  if (factura.cliente_provincia) {
    doc.text(factura.cliente_provincia, col2X, currentY + 18)
  }
  if (factura.cliente_email) {
    doc.setTextColor(...COLORS.secondary)
    doc.text(factura.cliente_email, col2X, currentY + 23)
  }

  currentY += 35

  // =========================================
  // PERIODO DE FACTURACIÓN
  // =========================================
  
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.text)
  doc.setFont('helvetica', 'bold')
  doc.text('PERIODO DE FACTURACIÓN:', margin, currentY)
  
  doc.setFont('helvetica', 'normal')
  const periodoText = `${formatDate(factura.periodo_inicio)} - ${formatDate(factura.periodo_fin)}`
  doc.text(periodoText, margin + 48, currentY)
  
  if (factura.es_periodo_parcial) {
    doc.setTextColor(...COLORS.danger)
    doc.setFontSize(8)
    doc.text('(Periodo parcial)', margin + 48 + doc.getTextWidth(periodoText) + 3, currentY)
  }

  currentY += 10

  // =========================================
  // DETALLE DE CONSUMOS (tabla)
  // =========================================
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('DETALLE DE CONSUMOS', margin, currentY)
  currentY += 5

  // Preparar datos de la tabla
  const tableData = lineas.map(linea => {
    let descripcion = linea.concepto_nombre || '—'
    
    if (!linea.es_termino_fijo && linea.contador_numero_serie) {
      descripcion += `\n${linea.contador_numero_serie}`
      if (linea.lectura_anterior != null && linea.lectura_actual != null) {
        descripcion += ` · Lect. ant: ${Number(linea.lectura_anterior).toFixed(2)} (${formatDate(linea.fecha_lectura_anterior)})`
        descripcion += ` → Actual: ${Number(linea.lectura_actual).toFixed(2)} (${formatDate(linea.fecha_lectura_actual)})`
      }
    }

    return [
      descripcion,
      formatCantidad(linea.cantidad, linea.unidad_medida, linea.es_termino_fijo ? 2 : 4),
      formatCurrency(linea.precio_unitario),
      formatCurrency(linea.subtotal)
    ]
  })

  autoTable(doc, {
    startY: currentY,
    head: [['Concepto', 'Cantidad', 'Precio Unit.', 'Subtotal']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: COLORS.text
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 30, halign: 'right' },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: margin, right: margin },
    styles: {
      cellPadding: 3,
      lineColor: [200, 200, 200],
      lineWidth: 0.1
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250]
    }
  })

  currentY = doc.lastAutoTable.finalY + 10

  // =========================================
  // GRÁFICO DE EVOLUCIÓN (si hay histórico)
  // =========================================
  
  if (historico && historico.length > 0) {
    const chartWidth = pageWidth - 2 * margin
    const chartHeight = 45
    
    // Verificar si hay espacio suficiente
    if (currentY + chartHeight + 60 > pageHeight) {
      doc.addPage()
      currentY = margin
    }
    
    drawBarChart(doc, historico, margin, currentY, chartWidth, chartHeight)
    currentY += chartHeight + 10
  }

  // =========================================
  // RESUMEN Y TOTALES
  // =========================================
  
  // Verificar espacio
  if (currentY + 50 > pageHeight - 30) {
    doc.addPage()
    currentY = margin
  }

  // Caja de resumen
  const resumenWidth = 90
  const resumenX = pageWidth - margin - resumenWidth
  
  doc.setFillColor(...COLORS.lightGray)
  doc.roundedRect(resumenX, currentY, resumenWidth, 40, 2, 2, 'F')

  // Condición de pago (izquierda)
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.text)
  doc.setFont('helvetica', 'bold')
  doc.text('CONDICIONES DE PAGO', margin, currentY + 6)
  
  doc.setFont('helvetica', 'normal')
  doc.text(getMetodoPagoLabel(factura.metodo_pago), margin, currentY + 12)
  
  if (factura.cliente_iban) {
    doc.text('IBAN:', margin, currentY + 20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(formatIBAN(factura.cliente_iban), margin, currentY + 26)
  }

  // Vencimiento
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Vencimiento: ${formatDate(factura.fecha_vencimiento)}`, margin, currentY + 34)

  // Totales (derecha en el recuadro)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  
  let totalY = currentY + 7
  
  doc.text('Base imponible:', resumenX + 5, totalY)
  doc.text(formatCurrency(factura.base_imponible), resumenX + resumenWidth - 5, totalY, { align: 'right' })
  
  totalY += 6
  doc.text(`IVA (${factura.porcentaje_iva || 21}%):`, resumenX + 5, totalY)
  doc.text(formatCurrency(factura.importe_iva), resumenX + resumenWidth - 5, totalY, { align: 'right' })
  
  // Línea separadora
  totalY += 4
  doc.setDrawColor(...COLORS.gray)
  doc.setLineWidth(0.3)
  doc.line(resumenX + 5, totalY, resumenX + resumenWidth - 5, totalY)
  
  // Total
  totalY += 7
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('TOTAL:', resumenX + 5, totalY)
  doc.text(formatCurrency(factura.total), resumenX + resumenWidth - 5, totalY, { align: 'right' })

  currentY += 50

  // =========================================
  // TABLA DE VENCIMIENTOS
  // =========================================
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('VENCIMIENTOS', margin, currentY)
  currentY += 3

  const estadoColor = factura.estado === 'pagada' ? COLORS.success : COLORS.danger
  const estadoTexto = factura.estado === 'pagada' ? 'Pagado' : 'Pendiente'

  autoTable(doc, {
    startY: currentY,
    head: [['Fecha', 'Importe', 'Estado']],
    body: [[
      formatDate(factura.fecha_vencimiento),
      formatCurrency(factura.total),
      estadoTexto
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.text,
      halign: 'center'
    },
    columnStyles: {
      2: { textColor: estadoColor, fontStyle: 'bold' }
    },
    margin: { left: margin, right: margin },
    tableWidth: 100
  })

  // =========================================
  // FOOTER
  // =========================================
  
  const footerY = pageHeight - 20
  
  doc.setDrawColor(...COLORS.lightGray)
  doc.setLineWidth(0.5)
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)

  doc.setFontSize(7)
  doc.setTextColor(...COLORS.gray)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `${EMPRESA.nombre} - CIF: ${EMPRESA.cif}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  )
  
  doc.setFontSize(6)
  doc.text(
    'Empresa certificada ISO 50001 | ISO 14001 | ISO 9001',
    pageWidth / 2,
    footerY + 4,
    { align: 'center' }
  )

  // Número de página
  doc.text(
    `Página 1 de 1`,
    pageWidth - margin,
    footerY + 4,
    { align: 'right' }
  )

  return doc
}

/**
 * Descarga el PDF de una factura
 * @param {Object} factura - Datos de la factura
 * @param {Array} lineas - Líneas de la factura
 * @param {Array} historico - Histórico de consumo
 */
export function descargarFacturaPDF(factura, lineas = [], historico = []) {
  const doc = generarFacturaPDF(factura, lineas, historico)
  const fileName = factura.numero_completo 
    ? `Factura_${factura.numero_completo.replace('/', '-')}.pdf`
    : `Factura_borrador_${factura.id.substring(0, 8)}.pdf`
  
  doc.save(fileName)
}

/**
 * Obtiene el PDF como Blob
 * @param {Object} factura - Datos de la factura
 * @param {Array} lineas - Líneas de la factura
 * @param {Array} historico - Histórico de consumo
 * @returns {Blob}
 */
export function getFacturaPDFBlob(factura, lineas = [], historico = []) {
  const doc = generarFacturaPDF(factura, lineas, historico)
  return doc.output('blob')
}

/**
 * Obtiene el PDF como base64
 * @param {Object} factura - Datos de la factura
 * @param {Array} lineas - Líneas de la factura
 * @param {Array} historico - Histórico de consumo
 * @returns {string}
 */
export function getFacturaPDFBase64(factura, lineas = [], historico = []) {
  const doc = generarFacturaPDF(factura, lineas, historico)
  return doc.output('datauristring')
}

export default {
  generarFacturaPDF,
  descargarFacturaPDF,
  getFacturaPDFBlob,
  getFacturaPDFBase64
}

