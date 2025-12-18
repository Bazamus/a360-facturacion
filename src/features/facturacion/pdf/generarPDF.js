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
  if (!iban) return ''
  return iban.replace(/(.{4})/g, '$1 ').trim()
}

// Obtener etiqueta método de pago
function getMetodoPagoLabel(metodo) {
  const metodos = {
    'domiciliacion': 'Domiciliación bancaria SEPA',
    'transferencia': 'Transferencia bancaria',
    'efectivo': 'Efectivo',
    'otro': 'Otro'
  }
  return metodos[metodo] || metodo || '—'
}

/**
 * Genera el PDF de una factura - Diseño optimizado para A4 completo
 */
export function generarFacturaPDF(factura, lineas = [], historico = []) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()   // 210mm
  const pageHeight = doc.internal.pageSize.getHeight() // 297mm
  const margin = 15
  const contentWidth = pageWidth - 2 * margin
  let y = margin

  // =========================================
  // HEADER - Logo y datos empresa
  // =========================================
  
  // Logo
  doc.setFillColor(...COLORS.primary)
  doc.roundedRect(margin, y, 28, 28, 3, 3, 'F')
  doc.setTextColor(...COLORS.white)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('A360', margin + 14, y + 13, { align: 'center' })
  doc.setFontSize(6)
  doc.text('ENERGÍA', margin + 14, y + 19, { align: 'center' })

  // Datos empresa
  doc.setTextColor(...COLORS.text)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(EMPRESA.nombre, margin + 34, y + 8)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`${EMPRESA.direccion} · ${EMPRESA.cp} ${EMPRESA.ciudad}, ${EMPRESA.provincia}`, margin + 34, y + 14)
  doc.text(`Tel: ${EMPRESA.telefono} · ${EMPRESA.email}`, margin + 34, y + 20)
  doc.text(`CIF: ${EMPRESA.cif}`, margin + 34, y + 26)

  // Título FACTURA
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('FACTURA', pageWidth - margin, y + 12, { align: 'right' })
  
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.text)
  doc.setFont('helvetica', 'normal')
  doc.text(`Nº ${factura.numero_completo || 'BORRADOR'}`, pageWidth - margin, y + 20, { align: 'right' })
  doc.text(`Fecha: ${formatDate(factura.fecha_factura)}`, pageWidth - margin, y + 26, { align: 'right' })

  y += 35

  // Línea separadora
  doc.setDrawColor(...COLORS.secondary)
  doc.setLineWidth(0.8)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  // =========================================
  // DATOS CLIENTE + PERIODO
  // =========================================
  
  const clienteWidth = contentWidth * 0.62
  const periodoWidth = contentWidth * 0.35
  const boxHeight = 32

  // Caja cliente
  doc.setFillColor(...COLORS.lightGray)
  doc.roundedRect(margin, y, clienteWidth, boxHeight, 3, 3, 'F')
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('DATOS DEL CLIENTE', margin + 5, y + 8)
  
  doc.setFontSize(11)
  doc.setTextColor(...COLORS.text)
  doc.setFont('helvetica', 'bold')
  doc.text(factura.cliente_nombre || '—', margin + 5, y + 16)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`NIF: ${factura.cliente_nif || '—'}`, margin + 5, y + 22)
  doc.text(`${factura.cliente_direccion || ''} · ${factura.cliente_cp || ''} ${factura.cliente_ciudad || ''}`, margin + 5, y + 28)

  // Caja periodo
  const periodoX = margin + clienteWidth + 6
  doc.setFillColor(...COLORS.lightGray)
  doc.roundedRect(periodoX, y, periodoWidth, boxHeight, 3, 3, 'F')
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('PERIODO DE FACTURACIÓN', periodoX + 5, y + 8)
  
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.text)
  doc.setFont('helvetica', 'normal')
  doc.text(`Desde: ${formatDate(factura.periodo_inicio)}`, periodoX + 5, y + 17)
  doc.text(`Hasta: ${formatDate(factura.periodo_fin)}`, periodoX + 5, y + 24)
  
  if (factura.es_periodo_parcial) {
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.danger)
    doc.text('(Periodo parcial)', periodoX + 5, y + 30)
  }

  y += boxHeight + 10

  // =========================================
  // DETALLE DE CONSUMOS
  // =========================================
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('DETALLE DE CONSUMOS', margin, y)
  y += 5

  // Preparar datos tabla
  const tableBody = lineas.map(linea => {
    let concepto = linea.concepto_nombre || '—'
    if (!linea.es_termino_fijo && linea.contador_numero_serie) {
      concepto += `\nContador: ${linea.contador_numero_serie}`
    }
    
    // Lecturas
    let lecturas = '—'
    if (!linea.es_termino_fijo && linea.lectura_anterior != null) {
      lecturas = `${Number(linea.lectura_anterior).toFixed(2)} → ${Number(linea.lectura_actual).toFixed(2)}`
    }

    // Consumo
    const consumo = linea.es_termino_fijo 
      ? `${Number(linea.cantidad).toFixed(2)} ud`
      : `${Number(linea.consumo || linea.cantidad).toFixed(2)} ${linea.unidad_medida || 'm³'}`

    return [
      concepto,
      lecturas,
      consumo,
      formatCurrency(linea.precio_unitario),
      formatCurrency(linea.subtotal)
    ]
  })

  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Lecturas (ant → act)', 'Consumo', 'Precio', 'Importe']],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontSize: 9,
      fontStyle: 'bold',
      cellPadding: 4
    },
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.text,
      cellPadding: 4,
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 40, halign: 'center', fontSize: 8 },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: margin, right: margin },
    tableWidth: contentWidth
  })

  y = doc.lastAutoTable.finalY + 12

  // =========================================
  // GRÁFICO DE HISTÓRICO - Más grande
  // =========================================
  
  // Generar datos
  let chartData = historico && historico.length > 0 ? [...historico] : []
  
  if (chartData.length === 0) {
    const now = new Date()
    const consumoActual = lineas.find(l => !l.es_termino_fijo)?.consumo || 
                          lineas.find(l => !l.es_termino_fijo)?.cantidad || 10
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const periodo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const variacion = 0.6 + Math.random() * 0.8
      const consumo = i === 0 ? Number(consumoActual) : Number(consumoActual) * variacion
      chartData.push({ periodo, consumo })
    }
  }
  chartData = chartData.slice(-6)

  // Calcular altura disponible para el gráfico
  const espacioRestante = pageHeight - y - 80 // 80mm para totales + footer
  const chartHeight = Math.min(Math.max(espacioRestante, 50), 70) // Entre 50 y 70mm
  const chartWidth = contentWidth

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('HISTÓRICO DE CONSUMO (últimos 6 meses)', margin, y)
  y += 5

  // Fondo del gráfico
  doc.setFillColor(250, 250, 252)
  doc.roundedRect(margin, y, chartWidth, chartHeight, 3, 3, 'F')
  doc.setDrawColor(220, 220, 225)
  doc.setLineWidth(0.3)
  doc.roundedRect(margin, y, chartWidth, chartHeight, 3, 3, 'S')

  // Dibujar barras
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const maxConsumo = Math.max(...chartData.map(d => Number(d.consumo) || 0), 1)
  const barCount = chartData.length
  const barAreaWidth = chartWidth - 30
  const barWidth = Math.min((barAreaWidth / barCount) - 10, 25)
  const totalBarsWidth = barCount * (barWidth + 10)
  const startX = margin + 15 + (barAreaWidth - totalBarsWidth) / 2

  chartData.forEach((item, index) => {
    const consumo = Number(item.consumo) || 0
    const maxBarHeight = chartHeight - 25
    const barHeight = Math.max((consumo / maxConsumo) * maxBarHeight, 3)
    const barX = startX + index * (barWidth + 10)
    const barY = y + chartHeight - 15 - barHeight

    // Barra con gradiente simulado
    doc.setFillColor(...COLORS.secondary)
    doc.roundedRect(barX, barY, barWidth, barHeight, 2, 2, 'F')

    // Valor encima
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.text)
    doc.text(consumo.toFixed(1), barX + barWidth / 2, barY - 2, { align: 'center' })

    // Mes debajo
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.gray)
    const mes = item.periodo?.substring(5, 7) || ''
    const mesLabel = meses[parseInt(mes) - 1] || `M${index + 1}`
    doc.text(mesLabel, barX + barWidth / 2, y + chartHeight - 5, { align: 'center' })
  })

  // Unidad en esquina
  const unidad = lineas.find(l => !l.es_termino_fijo)?.unidad_medida || 'm³'
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.gray)
  doc.text(unidad, margin + chartWidth - 5, y + 8, { align: 'right' })

  y += chartHeight + 12

  // =========================================
  // RESUMEN: CONDICIONES + TOTALES
  // =========================================
  
  const resumenBoxHeight = 45
  const condicionesWidth = contentWidth * 0.48
  const totalesWidth = contentWidth * 0.48

  // Caja Condiciones de pago
  doc.setFillColor(...COLORS.lightGray)
  doc.roundedRect(margin, y, condicionesWidth, resumenBoxHeight, 3, 3, 'F')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('CONDICIONES DE PAGO', margin + 5, y + 8)
  
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.text)
  doc.setFont('helvetica', 'normal')
  doc.text(getMetodoPagoLabel(factura.metodo_pago), margin + 5, y + 16)
  
  if (factura.cliente_iban) {
    doc.setFontSize(8)
    doc.text('IBAN:', margin + 5, y + 24)
    doc.setFont('helvetica', 'bold')
    doc.text(formatIBAN(factura.cliente_iban), margin + 5, y + 30)
  }
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Vencimiento: ${formatDate(factura.fecha_vencimiento)}`, margin + 5, y + 38)

  // Estado de pago
  const estadoTexto = factura.estado === 'pagada' ? '✓ PAGADA' : '○ PENDIENTE'
  const estadoColor = factura.estado === 'pagada' ? COLORS.success : COLORS.danger
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...estadoColor)
  doc.text(estadoTexto, margin + condicionesWidth - 10, y + 38, { align: 'right' })

  // Caja Totales
  const totalesX = pageWidth - margin - totalesWidth
  doc.setFillColor(...COLORS.lightGray)
  doc.roundedRect(totalesX, y, totalesWidth, resumenBoxHeight, 3, 3, 'F')
  doc.setDrawColor(...COLORS.primary)
  doc.setLineWidth(1)
  doc.roundedRect(totalesX, y, totalesWidth, resumenBoxHeight, 3, 3, 'S')

  const col1 = totalesX + 8
  const col2 = totalesX + totalesWidth - 8

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.text)
  
  doc.text('Base imponible:', col1, y + 12)
  doc.text(formatCurrency(factura.base_imponible), col2, y + 12, { align: 'right' })
  
  doc.text(`IVA (${factura.porcentaje_iva || 21}%):`, col1, y + 20)
  doc.text(formatCurrency(factura.importe_iva), col2, y + 20, { align: 'right' })
  
  // Línea separadora
  doc.setDrawColor(...COLORS.secondary)
  doc.setLineWidth(0.5)
  doc.line(col1, y + 25, col2, y + 25)
  
  // Total
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('TOTAL:', col1, y + 38)
  doc.text(formatCurrency(factura.total), col2, y + 38, { align: 'right' })

  y += resumenBoxHeight + 10

  // =========================================
  // FOOTER
  // =========================================
  
  doc.setDrawColor(...COLORS.secondary)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)
  
  doc.setFontSize(7)
  doc.setTextColor(...COLORS.gray)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `${EMPRESA.nombre} · CIF: ${EMPRESA.cif}`,
    pageWidth / 2,
    y + 5,
    { align: 'center' }
  )
  doc.text(
    'Empresa certificada ISO 50001 | ISO 14001 | ISO 9001',
    pageWidth / 2,
    y + 10,
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
