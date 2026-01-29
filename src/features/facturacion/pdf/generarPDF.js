import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { LOGO_A360_BASE64 } from './logoA360'
import { formatPrecio, formatLectura, formatConsumo, formatImporte } from '@/utils/precision'

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
  email: 'facturacion@a360se.com',
  cif: 'B88313473'
}

// Formatear fecha
function formatDate(dateStr) {
  if (!dateStr) return '-'
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

// Obtener etiqueta método de pago
function getMetodoPagoLabel(metodo) {
  const metodos = {
    'domiciliacion': 'Domiciliación bancaria SEPA',
    'transferencia': 'Transferencia bancaria',
    'efectivo': 'Efectivo',
    'otro': 'Otro'
  }
  return metodos[metodo] || metodo || '-'
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

  // Logo - Imagen real de A360
  const logoWidth = 32
  const logoHeight = 32
  doc.addImage(LOGO_A360_BASE64, 'JPEG', margin, y - 2, logoWidth, logoHeight)

  // Datos empresa (ajustado para logo más grande)
  const empresaX = margin + logoWidth + 6
  doc.setTextColor(...COLORS.text)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(EMPRESA.nombre, empresaX, y + 8)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`${EMPRESA.direccion} · ${EMPRESA.cp} ${EMPRESA.ciudad}, ${EMPRESA.provincia}`, empresaX, y + 14)
  doc.text(`Tel: ${EMPRESA.telefono} · ${EMPRESA.email}`, empresaX, y + 20)
  doc.text(`CIF: ${EMPRESA.cif}`, empresaX, y + 26)

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
  const boxHeight = 42

  // Caja cliente
  doc.setFillColor(...COLORS.lightGray)
  doc.roundedRect(margin, y, clienteWidth, boxHeight, 3, 3, 'F')

  // Título con código cliente en la misma línea
  const codigoCliente = factura.cliente?.codigo_cliente || factura.codigo_cliente || ''
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  const tituloCliente = codigoCliente ? `CÓDIGO CLIENTE: ${codigoCliente}` : 'DATOS DEL CLIENTE'
  doc.text(tituloCliente, margin + 5, y + 7)

  // Nombre del cliente
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.text)
  doc.setFont('helvetica', 'bold')
  doc.text(factura.cliente_nombre || '-', margin + 5, y + 14)

  // NIF
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`NIF: ${factura.cliente_nif || '-'}`, margin + 5, y + 21)

  // Dirección del cliente
  doc.setFontSize(8)
  doc.setTextColor(...COLORS.text)
  doc.setFont('helvetica', 'normal')
  
  // Primera línea: dirección completa
  if (factura.cliente_direccion) {
    doc.text(factura.cliente_direccion, margin + 5, y + 28)
  }
  
  // Segunda línea: CP y ciudad  
  const ciudadParts = []
  if (factura.cliente_cp) ciudadParts.push(factura.cliente_cp)
  if (factura.cliente_ciudad) ciudadParts.push(factura.cliente_ciudad)
  if (ciudadParts.length > 0) {
    doc.text(ciudadParts.join(' '), margin + 5, y + 34)
  }

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
  doc.text(`Desde: ${formatDate(factura.periodo_inicio)}`, periodoX + 5, y + 18)
  doc.text(`Hasta: ${formatDate(factura.periodo_fin)}`, periodoX + 5, y + 26)
  
  if (factura.es_periodo_parcial) {
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.danger)
    doc.text('(Periodo parcial)', periodoX + 5, y + 34)
  }

  y += boxHeight + 10

  // =========================================
  // DETALLE DE CONSUMOS
  // =========================================
  
  // Obtener número de contador (todas las líneas no-fijas deberían tener el mismo)
  const contadorNumero = lineas.find(l => !l.es_termino_fijo && l.contador_numero_serie)?.contador_numero_serie
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  
  // Título con número de contador
  if (contadorNumero) {
    doc.text('DETALLE DE CONSUMOS', margin, y)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...COLORS.secondary)
    doc.text(`Contador: ${contadorNumero}`, margin + 65, y)
  } else {
    doc.text('DETALLE DE CONSUMOS', margin, y)
  }
  
  y += 5

  // Preparar datos tabla
  const tableBody = lineas.map(linea => {
    // Solo el nombre del concepto, sin repetir el contador
    const concepto = linea.concepto_nombre || '-'
    
    // Lecturas (usar caracteres ASCII compatibles) - 3 decimales
    // Mostrar lecturas incluso si son 0 (para evitar confusión con lecturas iniciales)
    let lecturas = '-'
    if (!linea.es_termino_fijo && linea.lectura_actual != null) {
      lecturas = `${formatLectura(linea.lectura_anterior ?? 0)}\u00A0/\u00A0${formatLectura(linea.lectura_actual)}`
    }

    // Consumo - 3 decimales
    const consumo = linea.es_termino_fijo
      ? `${formatConsumo(linea.cantidad)} ud`
      : formatConsumo(linea.consumo || linea.cantidad, linea.unidad_medida || 'm³')

    // Precio con precisión variable según concepto
    const precioFormateado = formatPrecio(linea.precio_unitario, linea.concepto_codigo)

    return [
      concepto,
      lecturas,
      consumo,
      precioFormateado,
      formatImporte(linea.subtotal)  // Subtotal siempre 2 decimales
    ]
  })

  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Lecturas\u00A0(ant/act)', 'Consumo', 'Precio', 'Importe']],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontSize: 10,
      fontStyle: 'bold',
      cellPadding: 5
    },
    bodyStyles: {
      fontSize: 10,
      textColor: COLORS.text,
      cellPadding: 5,
      valign: 'middle',
      overflow: 'linebreak',
      cellWidth: 'wrap'
    },
    columnStyles: {
      0: { cellWidth: 46 }, // Concepto - reducido para dar espacio a Lecturas
      1: { cellWidth: 44, halign: 'center', fontSize: 8.5, overflow: 'visible' }, // Lecturas - ampliado y fuente ajustada
      2: { cellWidth: 33, halign: 'right', overflow: 'visible' }, // Consumo
      3: { cellWidth: 30, halign: 'right', overflow: 'visible' }, // Precio
      4: { cellWidth: 27, halign: 'right', fontStyle: 'bold', overflow: 'visible' } // Importe
    },
    margin: { left: margin, right: margin },
    tableWidth: contentWidth
  })

  y = doc.lastAutoTable.finalY + 20

  // =========================================
  // RESUMEN: CONDICIONES + TOTALES
  // =========================================
  
  const resumenBoxHeight = 35
  const condicionesWidth = contentWidth * 0.45
  const totalesWidth = contentWidth * 0.50

  // Caja Condiciones de pago - Diseño simplificado
  doc.setFillColor(...COLORS.lightGray)
  doc.roundedRect(margin, y, condicionesWidth, resumenBoxHeight, 3, 3, 'F')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('CONDICIONES DE PAGO', margin + 5, y + 10)
  
  doc.setFontSize(9)
  doc.setTextColor(...COLORS.text)
  doc.setFont('helvetica', 'normal')
  doc.text(getMetodoPagoLabel(factura.metodo_pago), margin + 5, y + 22)

  // Caja Totales - Diseño mejorado y más grande
  const totalesX = pageWidth - margin - totalesWidth
  doc.setFillColor(...COLORS.lightGray)
  doc.roundedRect(totalesX, y, totalesWidth, resumenBoxHeight, 3, 3, 'F')
  doc.setDrawColor(...COLORS.primary)
  doc.setLineWidth(1.2)
  doc.roundedRect(totalesX, y, totalesWidth, resumenBoxHeight, 3, 3, 'S')

  const col1 = totalesX + 10
  const col2 = totalesX + totalesWidth - 10

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.text)
  
  doc.text('Base imponible:', col1, y + 10)
  doc.text(formatImporte(factura.base_imponible), col2, y + 10, { align: 'right' })
  
  doc.text(`IVA (${factura.porcentaje_iva || 21}%):`, col1, y + 18)
  doc.text(formatImporte(factura.importe_iva), col2, y + 18, { align: 'right' })
  
  // Línea separadora más destacada
  doc.setDrawColor(...COLORS.primary)
  doc.setLineWidth(0.6)
  doc.line(col1, y + 22, col2, y + 22)
  
  // Total - Más grande y destacado
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text('TOTAL:', col1, y + 32)
  doc.text(formatImporte(factura.total), col2, y + 32, { align: 'right' })

  y += resumenBoxHeight + 15

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
