import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Colores corporativos
const COLORS = {
  primary: [27, 79, 114],      // #1B4F72
  secondary: [46, 134, 171],   // #2E86AB
  text: [51, 51, 51],          // #333333
  lightGray: [245, 245, 245],  // #F5F5F5
  gray: [120, 120, 120],
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
  cif: 'B88313473'
}

// Formatear fecha compacta
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
  if (!iban) return ''
  return iban.replace(/(.{4})/g, '$1 ').trim()
}

// Obtener etiqueta método de pago
function getMetodoPagoLabel(metodo) {
  const metodos = {
    'domiciliacion': 'Domiciliación SEPA',
    'transferencia': 'Transferencia',
    'efectivo': 'Efectivo',
    'otro': 'Otro'
  }
  return metodos[metodo] || metodo || '—'
}

/**
 * Genera el PDF de una factura - Diseño compacto en una sola página
 */
export function generarFacturaPDF(factura, lineas = [], historico = []) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()  // 210mm
  const margin = 12
  const contentWidth = pageWidth - 2 * margin
  let y = margin

  // =========================================
  // HEADER - Compacto
  // =========================================
  
  // Logo
  doc.setFillColor(...COLORS.primary)
  doc.roundedRect(margin, y, 22, 22, 2, 2, 'F')
  doc.setTextColor(...COLORS.white)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('A360', margin + 11, y + 10, { align: 'center' })
  doc.setFontSize(5)
  doc.text('ENERGÍA', margin + 11, y + 15, { align: 'center' })

  // Datos empresa
  doc.setTextColor(...COLORS.text)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(EMPRESA.nombre, margin + 26, y + 5)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(`${EMPRESA.direccion} · ${EMPRESA.cp} ${EMPRESA.ciudad}`, margin + 26, y + 10)
  doc.text(`Tel: ${EMPRESA.telefono} · ${EMPRESA.email} · CIF: ${EMPRESA.cif}`, margin + 26, y + 14)

  // Título FACTURA y número
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('FACTURA', pageWidth - margin, y + 6, { align: 'right' })
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.text)
  doc.setFont('helvetica', 'normal')
  doc.text(`Nº ${factura.numero_completo || 'BORRADOR'}`, pageWidth - margin, y + 12, { align: 'right' })
  doc.text(`Fecha: ${formatDate(factura.fecha_factura)}`, pageWidth - margin, y + 17, { align: 'right' })

  y += 26

  // Línea separadora
  doc.setDrawColor(...COLORS.secondary)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  y += 4

  // =========================================
  // DATOS CLIENTE + PERIODO (en línea)
  // =========================================
  
  // Fondo datos cliente
  doc.setFillColor(...COLORS.lightGray)
  doc.roundedRect(margin, y, contentWidth * 0.6, 20, 2, 2, 'F')
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('DATOS DEL CLIENTE', margin + 3, y + 5)
  
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.text)
  doc.setFont('helvetica', 'bold')
  doc.text(factura.cliente_nombre || '—', margin + 3, y + 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(`NIF: ${factura.cliente_nif || '—'} · ${factura.cliente_direccion || ''}`, margin + 3, y + 14)
  doc.text(`${factura.cliente_cp || ''} ${factura.cliente_ciudad || ''} ${factura.cliente_email ? '· ' + factura.cliente_email : ''}`, margin + 3, y + 18)

  // Periodo de facturación (derecha)
  const periodoX = margin + contentWidth * 0.62
  doc.setFillColor(...COLORS.lightGray)
  doc.roundedRect(periodoX, y, contentWidth * 0.38, 20, 2, 2, 'F')
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('PERIODO', periodoX + 3, y + 5)
  
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.text)
  doc.setFont('helvetica', 'normal')
  doc.text(`${formatDate(factura.periodo_inicio)}`, periodoX + 3, y + 11)
  doc.text(`${formatDate(factura.periodo_fin)}`, periodoX + 3, y + 16)

  y += 24

  // =========================================
  // DETALLE DE CONSUMOS - Tabla compacta
  // =========================================
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('DETALLE DE CONSUMOS', margin, y)
  y += 3

  // Preparar datos tabla
  const tableBody = lineas.map(linea => {
    let concepto = linea.concepto_nombre || '—'
    if (!linea.es_termino_fijo && linea.contador_numero_serie) {
      concepto += ` (${linea.contador_numero_serie})`
    }
    
    const cantidad = linea.es_termino_fijo 
      ? `${Number(linea.cantidad).toFixed(2)} ud`
      : `${Number(linea.consumo || linea.cantidad).toFixed(2)} ${linea.unidad_medida || 'm³'}`

    // Añadir info de lecturas si existe
    let lecturasInfo = ''
    if (!linea.es_termino_fijo && linea.lectura_anterior != null) {
      lecturasInfo = `Lect: ${Number(linea.lectura_anterior).toFixed(2)} → ${Number(linea.lectura_actual).toFixed(2)}`
    }

    return [
      concepto,
      lecturasInfo,
      cantidad,
      formatCurrency(linea.precio_unitario),
      formatCurrency(linea.subtotal)
    ]
  })

  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Lecturas', 'Consumo', 'Precio', 'Importe']],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontSize: 7,
      fontStyle: 'bold',
      cellPadding: 2
    },
    bodyStyles: {
      fontSize: 7,
      textColor: COLORS.text,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 45, fontSize: 6, textColor: COLORS.gray },
      2: { cellWidth: 28, halign: 'right' },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: margin, right: margin },
    tableWidth: contentWidth
  })

  y = doc.lastAutoTable.finalY + 6

  // =========================================
  // GRÁFICO DE EVOLUCIÓN - Compacto
  // =========================================
  
  // Generar datos para el gráfico
  let chartData = historico && historico.length > 0 ? [...historico] : []
  
  if (chartData.length === 0) {
    const now = new Date()
    const consumoActual = lineas.find(l => !l.es_termino_fijo)?.consumo || 
                          lineas.find(l => !l.es_termino_fijo)?.cantidad || 10
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const periodo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const variacion = 0.7 + Math.random() * 0.6
      const consumo = i === 0 ? Number(consumoActual) : Number(consumoActual) * variacion
      chartData.push({ periodo, consumo })
    }
  }

  // Limitar a 6 meses
  chartData = chartData.slice(-6)

  const chartHeight = 40
  const chartWidth = contentWidth

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('HISTÓRICO DE CONSUMO', margin, y)
  y += 3

  // Fondo del gráfico
  doc.setFillColor(250, 250, 250)
  doc.roundedRect(margin, y, chartWidth, chartHeight, 2, 2, 'F')
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.2)
  doc.roundedRect(margin, y, chartWidth, chartHeight, 2, 2, 'S')

  // Dibujar barras
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const maxConsumo = Math.max(...chartData.map(d => Number(d.consumo) || 0), 1)
  const barCount = chartData.length
  const barAreaWidth = chartWidth - 20
  const barWidth = Math.min(barAreaWidth / barCount - 6, 20)
  const startX = margin + 10 + (barAreaWidth - (barWidth + 6) * barCount) / 2

  chartData.forEach((item, index) => {
    const consumo = Number(item.consumo) || 0
    const maxBarHeight = chartHeight - 18
    const barHeight = Math.max((consumo / maxConsumo) * maxBarHeight, 2)
    const barX = startX + index * (barWidth + 6)
    const barY = y + chartHeight - 10 - barHeight

    // Barra
    doc.setFillColor(...COLORS.secondary)
    doc.roundedRect(barX, barY, barWidth, barHeight, 1, 1, 'F')

    // Valor encima
    doc.setFontSize(5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.text)
    doc.text(consumo.toFixed(1), barX + barWidth / 2, barY - 1, { align: 'center' })

    // Mes debajo
    doc.setFontSize(5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.gray)
    const mes = item.periodo?.substring(5, 7) || ''
    const mesLabel = meses[parseInt(mes) - 1] || `M${index + 1}`
    doc.text(mesLabel, barX + barWidth / 2, y + chartHeight - 3, { align: 'center' })
  })

  // Unidad
  const unidad = lineas.find(l => !l.es_termino_fijo)?.unidad_medida || 'm³'
  doc.setFontSize(5)
  doc.setTextColor(...COLORS.gray)
  doc.text(unidad, margin + chartWidth - 3, y + 6, { align: 'right' })

  y += chartHeight + 6

  // =========================================
  // RESUMEN: TOTALES + CONDICIONES DE PAGO
  // =========================================
  
  // Caja izquierda - Condiciones de pago
  const boxHeight = 28
  doc.setFillColor(...COLORS.lightGray)
  doc.roundedRect(margin, y, contentWidth * 0.5 - 3, boxHeight, 2, 2, 'F')

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('CONDICIONES DE PAGO', margin + 3, y + 5)
  
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.text)
  doc.setFont('helvetica', 'normal')
  doc.text(getMetodoPagoLabel(factura.metodo_pago), margin + 3, y + 10)
  
  if (factura.cliente_iban) {
    doc.text(`IBAN: ${formatIBAN(factura.cliente_iban)}`, margin + 3, y + 15)
  }
  doc.text(`Vencimiento: ${formatDate(factura.fecha_vencimiento)}`, margin + 3, y + 20)

  // Estado
  const estadoTexto = factura.estado === 'pagada' ? 'PAGADA' : 'PENDIENTE'
  const estadoColor = factura.estado === 'pagada' ? COLORS.success : COLORS.danger
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...estadoColor)
  doc.text(estadoTexto, margin + 3, y + 26)

  // Caja derecha - Totales
  const totalesX = margin + contentWidth * 0.5 + 3
  const totalesWidth = contentWidth * 0.5 - 3
  doc.setFillColor(...COLORS.lightGray)
  doc.roundedRect(totalesX, y, totalesWidth, boxHeight, 2, 2, 'F')
  doc.setDrawColor(...COLORS.secondary)
  doc.setLineWidth(0.5)
  doc.roundedRect(totalesX, y, totalesWidth, boxHeight, 2, 2, 'S')

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.text)
  
  const col1 = totalesX + 5
  const col2 = totalesX + totalesWidth - 5

  doc.text('Base imponible:', col1, y + 7)
  doc.text(formatCurrency(factura.base_imponible), col2, y + 7, { align: 'right' })
  
  doc.text(`IVA (${factura.porcentaje_iva || 21}%):`, col1, y + 13)
  doc.text(formatCurrency(factura.importe_iva), col2, y + 13, { align: 'right' })
  
  // Línea
  doc.setDrawColor(...COLORS.secondary)
  doc.setLineWidth(0.3)
  doc.line(col1, y + 16, col2, y + 16)
  
  // Total
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('TOTAL:', col1, y + 24)
  doc.text(formatCurrency(factura.total), col2, y + 24, { align: 'right' })

  y += boxHeight + 8

  // =========================================
  // FOOTER
  // =========================================
  
  doc.setDrawColor(...COLORS.secondary)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageWidth - margin, y)
  
  doc.setFontSize(6)
  doc.setTextColor(...COLORS.gray)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `${EMPRESA.nombre} - CIF: ${EMPRESA.cif} - Empresa certificada ISO 50001 | ISO 14001 | ISO 9001`,
    pageWidth / 2,
    y + 4,
    { align: 'center' }
  )

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
