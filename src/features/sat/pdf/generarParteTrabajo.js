import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  LOGO_A360_BASE64,
  COLORS,
  EMPRESA,
  formatDateShort,
  formatDateTime,
  formatCurrency,
  drawCabecera,
} from '@/lib/pdfConstants'

const TIPO_LABELS = {
  correctiva: 'Correctiva',
  preventiva: 'Preventiva',
  instalacion: 'Instalación',
  inspeccion: 'Inspección',
  urgencia: 'Urgencia',
}

const PRIORIDAD_LABELS = {
  urgente: 'URGENTE',
  alta: 'Alta',
  normal: 'Normal',
  baja: 'Baja',
}

async function fetchImageBase64(url) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * Genera el PDF de un Parte de Trabajo (SAT)
 * @param {Object} intervencion - Datos completos de la intervención
 * @param {Array}  materiales   - Lista de materiales usados
 * @returns {Promise<Blob>} PDF blob listo para subir o descargar
 */
export async function generarParteTrabajoPDF(intervencion, materiales = []) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - 2 * margin

  // Pre-fetch fotos como base64
  const fotos = intervencion.fotos || []
  const fotosBase64 = await Promise.all(fotos.slice(0, 4).map(fetchImageBase64))

  // =========================================
  // CABECERA CORPORATIVA
  // =========================================
  let y = drawCabecera(
    doc,
    LOGO_A360_BASE64,
    'PARTE DE TRABAJO',
    intervencion.numero_parte || '',
    { tituloFontSize: 18 },
  )

  // =========================================
  // BLOQUE DATOS PARTE + DATOS CLIENTE
  // =========================================
  const colW = contentWidth / 2 - 3
  const rightX = margin + colW + 6
  const boxH = 32

  // Caja izquierda: datos del parte
  doc.setFillColor(...COLORS.lightGray)
  doc.roundedRect(margin, y, colW, boxH, 3, 3, 'F')

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.gray)
  doc.text('DATOS DEL PARTE', margin + 3, y + 5)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.text)

  const padLeft = margin + 3
  doc.setFont('helvetica', 'bold')
  doc.text('Nº Parte:', padLeft, y + 11)
  doc.setFont('helvetica', 'normal')
  doc.text(intervencion.numero_parte || '-', padLeft + 22, y + 11)

  doc.setFont('helvetica', 'bold')
  doc.text('Tipo:', padLeft, y + 18)
  doc.setFont('helvetica', 'normal')
  doc.text(TIPO_LABELS[intervencion.tipo] || intervencion.tipo || '-', padLeft + 22, y + 18)

  doc.setFont('helvetica', 'bold')
  doc.text('Prioridad:', padLeft, y + 25)
  doc.setFont('helvetica', 'normal')
  doc.text(PRIORIDAD_LABELS[intervencion.prioridad] || intervencion.prioridad || '-', padLeft + 22, y + 25)

  // Caja derecha: datos del cliente
  doc.setFillColor(...COLORS.lightGray)
  doc.roundedRect(rightX, y, colW, boxH, 3, 3, 'F')

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.gray)
  doc.text('CLIENTE', rightX + 3, y + 5)

  doc.setFontSize(8.5)
  doc.setTextColor(...COLORS.text)

  const clienteNombre = intervencion.cliente
    ? `${intervencion.cliente.nombre || ''} ${intervencion.cliente.apellidos || ''}`.trim()
    : (intervencion.cliente_nombre_completo || '-')

  doc.setFont('helvetica', 'bold')
  doc.text('Nombre:', rightX + 3, y + 11)
  doc.setFont('helvetica', 'normal')
  doc.text(clienteNombre, rightX + 23, y + 11)

  if (intervencion.cliente?.telefono || intervencion.cliente_telefono) {
    doc.setFont('helvetica', 'bold')
    doc.text('Tel:', rightX + 3, y + 18)
    doc.setFont('helvetica', 'normal')
    doc.text(intervencion.cliente?.telefono || intervencion.cliente_telefono || '-', rightX + 23, y + 18)
  }

  if (intervencion.comunidad?.nombre || intervencion.comunidad_nombre) {
    doc.setFont('helvetica', 'bold')
    doc.text('Comunidad:', rightX + 3, y + 25)
    doc.setFont('helvetica', 'normal')
    doc.text(intervencion.comunidad?.nombre || intervencion.comunidad_nombre || '-', rightX + 23, y + 25)
  }

  if (intervencion.direccion) {
    const dir = [intervencion.direccion, intervencion.codigo_postal, intervencion.ciudad].filter(Boolean).join(', ')
    doc.setFont('helvetica', 'bold')
    doc.text('Dir:', rightX + 3, y + 25 + (intervencion.comunidad?.nombre ? 0 : -7))
    doc.setFont('helvetica', 'normal')
    doc.text(dir.slice(0, 35), rightX + 23, y + 25 + (intervencion.comunidad?.nombre ? 0 : -7))
  }

  y += boxH + 4

  // =========================================
  // TÉCNICO Y TIEMPOS
  // =========================================
  doc.setFillColor(...COLORS.primary)
  doc.rect(margin, y, contentWidth, 7, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.white)
  doc.text('TÉCNICO Y TIEMPOS', margin + 3, y + 5)
  y += 9

  doc.setFontSize(8.5)
  doc.setTextColor(...COLORS.text)
  const tecnicoNombre = intervencion.tecnico?.nombre_completo || intervencion.tecnico_nombre || 'Sin asignar'

  const tiempoData = [
    ['Técnico asignado', tecnicoNombre, 'Fecha solicitud', formatDateShort(intervencion.fecha_solicitud)],
    ['Inicio trabajo', formatDateTime(intervencion.fecha_inicio), 'Fin trabajo', formatDateTime(intervencion.fecha_fin)],
    ['Fecha programada', formatDateShort(intervencion.fecha_programada), 'Duración', intervencion.duracion_minutos ? `${intervencion.duracion_minutos} min` : '-'],
  ]

  autoTable(doc, {
    startY: y,
    body: tiempoData,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 1.8, textColor: COLORS.text },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 38, textColor: COLORS.gray },
      1: { cellWidth: contentWidth / 2 - 38 },
      2: { fontStyle: 'bold', cellWidth: 38, textColor: COLORS.gray },
      3: { cellWidth: contentWidth / 2 - 38 },
    },
    margin: { left: margin, right: margin },
  })

  y = doc.lastAutoTable.finalY + 5

  // =========================================
  // DESCRIPCIÓN / INCIDENCIA
  // =========================================
  if (intervencion.descripcion || intervencion.titulo) {
    doc.setFillColor(...COLORS.primary)
    doc.rect(margin, y, contentWidth, 7, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.white)
    doc.text('DESCRIPCIÓN DE LA INCIDENCIA', margin + 3, y + 5)
    y += 11

    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.text)
    const descText = intervencion.descripcion || intervencion.titulo || '-'
    const descLines = doc.splitTextToSize(descText, contentWidth - 6)
    doc.setFillColor(...COLORS.lightGray)
    doc.roundedRect(margin, y, contentWidth, descLines.length * 4.5 + 6, 2, 2, 'F')
    doc.text(descLines, margin + 3, y + 5)
    y += descLines.length * 4.5 + 9
  }

  // =========================================
  // DIAGNÓSTICO Y SOLUCIÓN (ocultar si ambos vacíos)
  // =========================================
  const hayDiagnostico = !!(intervencion.diagnostico || intervencion.solucion)

  if (hayDiagnostico) {
    doc.setFillColor(...COLORS.primary)
    doc.rect(margin, y, contentWidth, 7, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.white)
    doc.text('DIAGNÓSTICO Y SOLUCIÓN', margin + 3, y + 5)
    y += 13  // 7mm header + 6mm margen inferior

    if (intervencion.diagnostico) {
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.text)
      doc.text('Diagnóstico:', margin, y)
      y += 5
      const diagLines = doc.splitTextToSize(intervencion.diagnostico, contentWidth - 6)
      doc.setFillColor(...COLORS.lightGray)
      doc.roundedRect(margin, y, contentWidth, diagLines.length * 4.5 + 6, 2, 2, 'F')
      doc.setFont('helvetica', 'normal')
      doc.text(diagLines, margin + 3, y + 5)
      y += diagLines.length * 4.5 + 10
    }

    if (intervencion.solucion) {
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.text)
      doc.text('Solución aplicada:', margin, y)
      y += 5
      const solLines = doc.splitTextToSize(intervencion.solucion, contentWidth - 6)
      doc.setFillColor(...COLORS.lightGray)
      doc.roundedRect(margin, y, contentWidth, solLines.length * 4.5 + 6, 2, 2, 'F')
      doc.setFont('helvetica', 'normal')
      doc.text(solLines, margin + 3, y + 5)
      y += solLines.length * 4.5 + 8
    }
  }

  // =========================================
  // MATERIALES UTILIZADOS
  // =========================================
  if (materiales.length > 0) {
    if (y > 220) { doc.addPage(); y = margin }

    doc.setFillColor(...COLORS.primary)
    doc.rect(margin, y, contentWidth, 7, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.white)
    doc.text('MATERIALES UTILIZADOS', margin + 3, y + 5)
    y += 5

    const materialesRows = materiales.map((m) => [
      m.material?.referencia || m.referencia || '-',
      m.material?.nombre || m.nombre || '-',
      String(m.cantidad),
      m.material?.unidad_medida || 'ud',
      formatCurrency(m.precio_unitario),
      formatCurrency(m.subtotal || (m.cantidad * m.precio_unitario)),
    ])

    autoTable(doc, {
      startY: y,
      head: [['Ref.', 'Descripción', 'Cant.', 'Ud.', 'P. Unit.', 'Subtotal']],
      body: materialesRows,
      theme: 'striped',
      headStyles: {
        fillColor: COLORS.secondary,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8, textColor: COLORS.text },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: contentWidth - 22 - 15 - 12 - 22 - 22 },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 22, halign: 'right' },
      },
      margin: { left: margin, right: margin },
    })

    y = doc.lastAutoTable.finalY + 3

    const totalMat = materiales.reduce((sum, m) => sum + (m.subtotal || (m.cantidad * m.precio_unitario) || 0), 0)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.primary)
    doc.text(`Total materiales: ${formatCurrency(totalMat)}`, pageWidth - margin, y, { align: 'right' })
    y += 6
  }

  // =========================================
  // COSTES RESUMEN (ocultar si todo es 0 o nulo)
  // =========================================
  const hayCoste = (intervencion.coste_total ?? 0) > 0
    || (intervencion.coste_materiales ?? 0) > 0
    || (intervencion.coste_mano_obra ?? 0) > 0
    || (intervencion.coste_desplazamiento ?? 0) > 0

  if (hayCoste) {
    if (y > 240) { doc.addPage(); y = margin }

    doc.setFillColor(...COLORS.primary)
    doc.rect(margin, y, contentWidth, 7, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.white)
    doc.text('RESUMEN DE COSTES', margin + 3, y + 5)
    y += 5

    const costesRows = [
      ['Materiales', formatCurrency(intervencion.coste_materiales)],
      ['Mano de obra', formatCurrency(intervencion.coste_mano_obra)],
      ['Desplazamiento', formatCurrency(intervencion.coste_desplazamiento)],
    ]

    autoTable(doc, {
      startY: y,
      body: costesRows,
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 1.8, textColor: COLORS.text },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50, textColor: COLORS.gray },
        1: { halign: 'right' },
      },
      foot: [['TOTAL', formatCurrency(intervencion.coste_total)]],
      footStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: 9,
      },
      margin: { left: margin, right: margin },
    })

    y = doc.lastAutoTable.finalY + 6
  }

  // =========================================
  // REGISTRO FOTOGRÁFICO (página 2 si hay fotos)
  // =========================================
  const hayFotos = fotosBase64.some(Boolean)

  if (hayFotos) {
    doc.addPage()
    y = margin

    doc.setFillColor(...COLORS.primary)
    doc.rect(margin, y, contentWidth, 7, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.white)
    doc.text('REGISTRO FOTOGRÁFICO', margin + 3, y + 5)
    y += 10

    const imgGap = 4
    const fotoW = (contentWidth - imgGap) / 2   // ~82mm
    const fotoH = 55

    fotosBase64.forEach((base64, i) => {
      if (!base64) return
      const col = i % 2
      const row = Math.floor(i / 2)
      const fx = margin + col * (fotoW + imgGap)
      const fy = y + row * (fotoH + imgGap)

      doc.setDrawColor(...COLORS.gray)
      doc.setLineWidth(0.3)
      doc.roundedRect(fx, fy, fotoW, fotoH, 2, 2, 'S')
      try {
        doc.addImage(base64, 'JPEG', fx + 1, fy + 1, fotoW - 2, fotoH - 2, undefined, 'FAST')
      } catch (_) {
        // Si la imagen no se puede insertar, dejar marco vacío
      }
    })

    const numRows = Math.ceil(fotosBase64.filter(Boolean).length / 2)
    y += numRows * (fotoH + imgGap) + 4
  } else {
    // Sin fotos: salto de página solo si las firmas no caben
    const espacioFirmas = 7 + 10 + 30 + 10 // header + gap + cajas + margen inferior
    if (y + espacioFirmas > pageH - 20) {
      doc.addPage()
      y = margin
    }
  }

  // =========================================
  // FIRMAS Y CONFORMIDAD
  // =========================================
  doc.setFillColor(...COLORS.primary)
  doc.rect(margin, y, contentWidth, 7, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.white)
  doc.text('FIRMAS Y CONFORMIDAD', margin + 3, y + 5)
  y += 10

  const firmaW = colW
  const firmaH = 30

  // Caja firma cliente
  doc.setDrawColor(...COLORS.gray)
  doc.setLineWidth(0.4)
  doc.roundedRect(margin, y, firmaW, firmaH, 2, 2, 'S')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.gray)
  doc.text('Firma del cliente', margin + firmaW / 2, y + 5, { align: 'center' })

  if (intervencion.firma_cliente) {
    try {
      doc.addImage(intervencion.firma_cliente, 'PNG', margin + 5, y + 7, firmaW - 10, firmaH - 14)
    } catch (_) {}
  }

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.text)
  doc.text('Conforme con el trabajo realizado', margin + firmaW / 2, y + firmaH - 3, { align: 'center' })

  // Caja firma técnico
  doc.setDrawColor(...COLORS.gray)
  doc.roundedRect(rightX, y, firmaW, firmaH, 2, 2, 'S')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.gray)
  doc.text('Firma del técnico', rightX + firmaW / 2, y + 5, { align: 'center' })

  if (intervencion.firma_tecnico) {
    try {
      doc.addImage(intervencion.firma_tecnico, 'PNG', rightX + 5, y + 7, firmaW - 10, firmaH - 14)
    } catch (_) {}
  }

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.text)
  doc.text(
    `Técnico: ${intervencion.tecnico?.nombre_completo || intervencion.tecnico_nombre || '-'}`,
    rightX + firmaW / 2,
    y + firmaH - 3,
    { align: 'center' },
  )

  // =========================================
  // PIE DE PÁGINA
  // =========================================
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const ph = doc.internal.pageSize.getHeight()
    doc.setDrawColor(...COLORS.secondary)
    doc.setLineWidth(0.5)
    doc.line(margin, ph - 12, pageWidth - margin, ph - 12)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.gray)
    doc.text(
      `${EMPRESA.nombre} · ${EMPRESA.direccion}, ${EMPRESA.cp} ${EMPRESA.ciudad} · Tel: ${EMPRESA.telefono} · CIF: ${EMPRESA.cif}`,
      pageWidth / 2,
      ph - 7,
      { align: 'center' },
    )
    doc.text(`Pág. ${i} / ${pageCount}`, pageWidth - margin, ph - 7, { align: 'right' })
  }

  return doc.output('blob')
}
