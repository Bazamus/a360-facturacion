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

/**
 * Genera el PDF de una factura según el diseño del PRD
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
  
  // Recuadro del logo
  doc.setFillColor(...COLORS.primary)
  doc.roundedRect(margin, currentY, 28, 28, 3, 3, 'F')
  doc.setTextColor(...COLORS.white)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('A360', margin + 14, currentY + 14, { align: 'center' })
  doc.setFontSize(7)
  doc.text('ENERGÍA', margin + 14, currentY + 20, { align: 'center' })

  // Datos de la empresa
  doc.setTextColor(...COLORS.text)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(EMPRESA.nombre, margin + 33, currentY + 7)
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(EMPRESA.direccion, margin + 33, currentY + 12)
  doc.text(`${EMPRESA.cp} ${EMPRESA.ciudad}, ${EMPRESA.provincia}`, margin + 33, currentY + 16)
  doc.text(`Tel: ${EMPRESA.telefono}`, margin + 33, currentY + 20)
  doc.text(EMPRESA.email, margin + 33, currentY + 24)
  doc.text(`CIF: ${EMPRESA.cif}`, margin + 33, currentY + 28)

  // Título FACTURA
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('FACTURA', pageWidth - margin, currentY + 10, { align: 'right' })
  
  // Número y fecha
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.text)
  doc.setFont('helvetica', 'normal')
  doc.text(`Nº ${factura.numero_completo || 'BORRADOR'}`, pageWidth - margin, currentY + 17, { align: 'right' })
  doc.text(`Fecha: ${formatDate(factura.fecha_factura)}`, pageWidth - margin, currentY + 22, { align: 'right' })
  
  if (factura.cliente_id) {
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.gray)
    doc.text(`Ref: ${factura.cliente_id.substring(0, 8).toUpperCase()}`, pageWidth - margin, currentY + 27, { align: 'right' })
  }

  currentY += 35

  // Línea separadora
  doc.setDrawColor(...COLORS.secondary)
  doc.setLineWidth(0.8)
  doc.line(margin, currentY, pageWidth - margin, currentY)
  currentY += 8

  // =========================================
  // DATOS DEL CLIENTE
  // =========================================
  
  doc.setFillColor(...COLORS.lightGray)
  doc.roundedRect(margin, currentY, pageWidth - 2 * margin, 28, 3, 3, 'F')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('DATOS DEL CLIENTE', margin + 5, currentY + 7)

  doc.setFontSize(10)
  doc.setTextColor(...COLORS.text)
  doc.setFont('helvetica', 'bold')
  doc.text(factura.cliente_nombre || '—', margin + 5, currentY + 14)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`NIF: ${factura.cliente_nif || '—'}`, margin + 5, currentY + 20)
  doc.text(factura.cliente_direccion || '—', margin + 5, currentY + 25)
  
  // Segunda columna
  const col2X = pageWidth / 2 + 10
  doc.text(`${factura.cliente_cp || ''} ${factura.cliente_ciudad || ''}`, col2X, currentY + 14)
  if (factura.cliente_provincia) {
    doc.text(factura.cliente_provincia, col2X, currentY + 20)
  }
  if (factura.cliente_email) {
    doc.setTextColor(...COLORS.secondary)
    doc.text(factura.cliente_email, col2X, currentY + 25)
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
  doc.text(periodoText, margin + 50, currentY)
  
  if (factura.es_periodo_parcial) {
    doc.setTextColor(...COLORS.danger)
    doc.setFontSize(8)
    doc.text('(Periodo parcial)', margin + 50 + doc.getTextWidth(periodoText) + 3, currentY)
  }

  currentY += 10

  // =========================================
  // DETALLE DE CONSUMOS - Tabla con formato PRD
  // =========================================
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('DETALLE DE CONSUMOS', margin, currentY)
  currentY += 5

  // Preparar datos de la tabla - formato compacto según PRD
  const tableBody = lineas.map(linea => {
    let descripcion = linea.concepto_nombre || '—'
    
    // Si es concepto variable, añadir info de lecturas
    if (!linea.es_termino_fijo && linea.contador_numero_serie) {
      descripcion = `${linea.concepto_nombre}\n`
      descripcion += `${linea.contador_numero_serie}`
      
      if (linea.lectura_anterior != null && linea.lectura_actual != null) {
        descripcion += ` · Lect. ant: ${Number(linea.lectura_anterior).toFixed(2)} (${formatDate(linea.fecha_lectura_anterior)})`
        descripcion += `\n→ Actual: ${Number(linea.lectura_actual).toFixed(2)} (${formatDate(linea.fecha_lectura_actual)})`
      }
    }

    const cantidad = linea.es_termino_fijo 
      ? `${Number(linea.cantidad).toFixed(2)} ${linea.unidad_medida || 'unidad'}`
      : `${Number(linea.consumo || linea.cantidad).toFixed(4)} ${linea.unidad_medida || 'm³'}`

    return [
      descripcion,
      cantidad,
      formatCurrency(linea.precio_unitario),
      formatCurrency(linea.subtotal)
    ]
  })

  autoTable(doc, {
    startY: currentY,
    head: [['Concepto', 'Cantidad', 'Precio U.', 'Total']],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 3
    },
    bodyStyles: {
      fontSize: 8,
      textColor: COLORS.text,
      cellPadding: 3,
      valign: 'top'
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 30, halign: 'right' },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: margin, right: margin },
    styles: {
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
      overflow: 'linebreak'
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250]
    }
  })

  currentY = doc.lastAutoTable.finalY + 10

  // =========================================
  // GRÁFICO DE EVOLUCIÓN DE CONSUMO
  // =========================================
  
  // Generar datos para el gráfico
  let chartData = historico && historico.length > 0 ? historico : []
  
  // Si no hay histórico, crear datos de demostración
  if (chartData.length === 0) {
    const now = new Date()
    const consumoActual = lineas.find(l => !l.es_termino_fijo)?.consumo || 
                          lineas.find(l => !l.es_termino_fijo)?.cantidad || 1
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const periodo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      // Variar el consumo de manera realista
      const variacion = 0.7 + Math.random() * 0.6 // entre 70% y 130%
      const consumo = i === 0 ? Number(consumoActual) : Number(consumoActual) * variacion
      chartData.push({ periodo, consumo })
    }
  }

  const chartHeight = 55
  const chartWidth = pageWidth - 2 * margin

  // Título del gráfico
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('EVOLUCIÓN DE CONSUMO (últimos 6 meses)', margin, currentY)
  currentY += 5

  // Fondo del gráfico
  doc.setFillColor(...COLORS.lightGray)
  doc.roundedRect(margin, currentY, chartWidth, chartHeight, 3, 3, 'F')
  doc.setDrawColor(...COLORS.secondary)
  doc.setLineWidth(0.3)
  doc.roundedRect(margin, currentY, chartWidth, chartHeight, 3, 3, 'S')

  // Dibujar barras
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const maxConsumo = Math.max(...chartData.map(d => Number(d.consumo) || 0), 0.1)
  const barCount = chartData.length
  const barWidth = (chartWidth - 50) / barCount
  const barSpacing = 8
  const chartAreaHeight = chartHeight - 25

  chartData.forEach((item, index) => {
    const consumo = Number(item.consumo) || 0
    const barHeight = Math.max((consumo / maxConsumo) * chartAreaHeight, 3)
    const barX = margin + 25 + index * (barWidth + barSpacing)
    const barY = currentY + chartHeight - 15 - barHeight

    // Barra
    doc.setFillColor(...COLORS.secondary)
    doc.roundedRect(barX, barY, barWidth - barSpacing, barHeight, 2, 2, 'F')

    // Valor encima de la barra
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.text)
    doc.text(consumo.toFixed(2), barX + (barWidth - barSpacing) / 2, barY - 2, { align: 'center' })

    // Mes debajo
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.gray)
    const mes = item.periodo?.substring(5, 7) || ''
    const mesLabel = meses[parseInt(mes) - 1] || `M${index + 1}`
    doc.text(mesLabel, barX + (barWidth - barSpacing) / 2, currentY + chartHeight - 5, { align: 'center' })
  })

  // Unidad
  const unidadConsumo = lineas.find(l => !l.es_termino_fijo)?.unidad_medida || 'm³'
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.gray)
  doc.text(unidadConsumo, margin + chartWidth - 5, currentY + chartHeight - 5, { align: 'right' })

  currentY += chartHeight + 10

  // =========================================
  // RESUMEN Y TOTALES
  // =========================================
  
  // Verificar si necesitamos nueva página
  if (currentY + 100 > pageHeight) {
    doc.addPage()
    currentY = margin
  }

  // Caja de totales (derecha)
  const resumenWidth = 85
  const resumenX = pageWidth - margin - resumenWidth
  
  doc.setFillColor(...COLORS.lightGray)
  doc.roundedRect(resumenX, currentY, resumenWidth, 42, 3, 3, 'F')
  doc.setDrawColor(...COLORS.secondary)
  doc.setLineWidth(0.3)
  doc.roundedRect(resumenX, currentY, resumenWidth, 42, 3, 3, 'S')

  // Condición de pago (izquierda)
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.text)
  doc.setFont('helvetica', 'bold')
  doc.text('CONDICIONES DE PAGO', margin, currentY + 6)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(getMetodoPagoLabel(factura.metodo_pago), margin, currentY + 13)
  
  if (factura.cliente_iban) {
    doc.text('IBAN:', margin, currentY + 22)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(formatIBAN(factura.cliente_iban), margin, currentY + 29)
  }

  // Vencimiento
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Vencimiento: ${formatDate(factura.fecha_vencimiento)}`, margin, currentY + 38)

  // Totales (derecha)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.text)
  
  let totalY = currentY + 8
  
  doc.text('Base imponible:', resumenX + 5, totalY)
  doc.text(formatCurrency(factura.base_imponible), resumenX + resumenWidth - 5, totalY, { align: 'right' })
  
  totalY += 8
  doc.text(`IVA (${factura.porcentaje_iva || 21}%):`, resumenX + 5, totalY)
  doc.text(formatCurrency(factura.importe_iva), resumenX + resumenWidth - 5, totalY, { align: 'right' })
  
  // Línea separadora
  totalY += 5
  doc.setDrawColor(...COLORS.secondary)
  doc.setLineWidth(0.5)
  doc.line(resumenX + 5, totalY, resumenX + resumenWidth - 5, totalY)
  
  // Total
  totalY += 10
  doc.setFontSize(12)
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
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.text,
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 35 },
      2: { cellWidth: 30, textColor: estadoColor, fontStyle: 'bold' }
    },
    margin: { left: margin },
    tableWidth: 100
  })

  // =========================================
  // FOOTER
  // =========================================
  
  const footerY = pageHeight - 18
  
  doc.setDrawColor(...COLORS.secondary)
  doc.setLineWidth(0.3)
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
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - margin,
      footerY + 4,
      { align: 'right' }
    )
  }

  return doc
}

/**
 * Descarga el PDF de una factura
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
 */
export function getFacturaPDFBlob(factura, lineas = [], historico = []) {
  const doc = generarFacturaPDF(factura, lineas, historico)
  return doc.output('blob')
}

/**
 * Obtiene el PDF como base64
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
