/**
 * Constantes compartidas para generación de PDFs corporativos A360
 * Reutilizadas en: generarPDF.js (facturas) y generarParteTrabajo.js (partes)
 */
export { LOGO_A360_BASE64 } from '@/features/facturacion/pdf/logoA360'

// Colores corporativos
export const COLORS = {
  primary: [27, 79, 114],      // #1B4F72
  secondary: [46, 134, 171],   // #2E86AB
  text: [51, 51, 51],          // #333333
  lightGray: [245, 245, 245],  // #F5F5F5
  gray: [120, 120, 120],
  success: [40, 167, 69],      // #28A745
  danger: [220, 53, 69],       // #DC3545
  white: [255, 255, 255],
}

// Datos de la empresa
export const EMPRESA = {
  nombre: 'A360 SERVICIOS ENERGÉTICOS S.L.',
  direccion: 'C/ Polvoranca Nº 138',
  cp: '28923',
  ciudad: 'Alcorcón',
  provincia: 'Madrid',
  telefono: '91 159 11 70',
  email: 'facturacion@a360se.com',
  cif: 'B88313473',
}

// Formatear fecha corta DD/MM/YYYY
export function formatDateShort(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Formatear fecha y hora DD/MM/YYYY HH:mm
export function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Formatear moneda EUR
export function formatCurrency(value) {
  if (value == null) return '0,00 €'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

/**
 * Dibuja la cabecera corporativa estándar A360 en un documento jsPDF
 * @returns {number} La coordenada Y después de la cabecera
 */
export function drawCabecera(doc, LOGO, titulo, subtitulo) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  let y = margin

  // Logo
  const logoWidth = 32
  const logoHeight = 32
  doc.addImage(LOGO, 'JPEG', margin, y - 2, logoWidth, logoHeight)

  // Datos empresa
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

  // Título del documento
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text(titulo, pageWidth - margin, y + 10, { align: 'right' })
  if (subtitulo) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.text)
    doc.text(subtitulo, pageWidth - margin, y + 20, { align: 'right' })
  }

  y += 35

  // Línea separadora
  doc.setDrawColor(...COLORS.secondary)
  doc.setLineWidth(0.8)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  return y
}
