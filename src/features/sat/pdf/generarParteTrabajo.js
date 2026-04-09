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

/**
 * Genera el PDF de un Parte de Trabajo (SAT)
 * @param {Object} intervencion - Datos completos de la intervención
 * @param {Array}  materiales   - Lista de materiales usados
 * @returns {Blob} PDF blob listo para subir o descargar
 */
export function generarParteTrabajoPDF(intervencion, materiales = []) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  const contentWidth = pageWidth - 2 * margin

  // =========================================
  // CABECERA CORPORATIVA
  // =========================================
  let y = drawCabecera(
    doc,
    LOGO_A360_BASE64,
    'PARTE DE TRABAJO',
    intervencion.numero_parte || '',
  )

  // =========================================
  // BLOQUE DATOS PARTE + DATOS CLIENTE
  // =========================================
  const colW = contentWidth / 2 - 3
  const boxH = 38

  // Caja izquierda: datos del parte
  doc.setFillColor(...COLORS.lightGray)
  doc.roundedRect(margin, y, colW, boxH, 3, 3, 'F')

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.gray)
  doc.text('DATOS DEL PARTE', margin + 3, y + 6)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.text)

  const padLeft = margin + 3
  doc.setFont('helvetica', 'bold')
  doc.text('Nº Parte:', padLeft, y + 13)
  doc.setFont('helvetica', 'normal')
  doc.text(intervencion.numero_parte || '-', padLeft + 22, y + 13)

  doc.setFont('helvetica', 'bold')
  doc.text('Tipo:', padLeft, y + 20)
  doc.setFont('helvetica', 'normal')
  doc.text(TIPO_LABELS[intervencion.tipo] || intervencion.tipo || '-', padLeft + 22, y + 20)

  doc.setFont('helvetica', 'bold')
  doc.text('Prioridad:', padLeft, y + 27)
  doc.setFont('helvetica', 'normal')
  doc.text(PRIORIDAD_LABELS[intervencion.prioridad] || intervencion.prioridad || '-', padLeft + 22, y + 27)

  doc.setFont('helvetica', 'bold')
  doc.text('Fecha:', padLeft, y + 34)
  doc.setFont('helvetica', 'normal')
  doc.text(formatDateShort(intervencion.fecha_solicitud), padLeft + 22, y + 34)

  // Caja derecha: datos del cliente
  const rightX = margin + colW + 6
  doc.setFillColor(...COLORS.lightGray)
  doc.roundedRect(rightX, y, colW, boxH, 3, 3, 'F')

  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.gray)
  doc.text('CLIENTE', rightX + 3, y + 6)

  doc.setFontSize(8.5)
  doc.setTextColor(...COLORS.text)

  const clienteNombre = intervencion.cliente
    ? `${intervencion.cliente.nombre || ''} ${intervencion.cliente.apellidos || ''}`.trim()
    : (intervencion.cliente_nombre_completo || '-')

  doc.setFont('helvetica', 'bold')
  doc.text('Nombre:', rightX + 3, y + 13)
  doc.setFont('helvetica', 'normal')
  doc.text(clienteNombre, rightX + 23, y + 13)

  if (intervencion.cliente?.telefono || intervencion.cliente_telefono) {
    doc.setFont('helvetica', 'bold')
    doc.text('Tel:', rightX + 3, y + 20)
    doc.setFont('helvetica', 'normal')
    doc.text(intervencion.cliente?.telefono || intervencion.cliente_telefono || '-', rightX + 23, y + 20)
  }

  if (intervencion.comunidad?.nombre || intervencion.comunidad_nombre) {
    doc.setFont('helvetica', 'bold')
    doc.text('Comunidad:', rightX + 3, y + 27)
    doc.setFont('helvetica', 'normal')
    doc.text(intervencion.comunidad?.nombre || intervencion.comunidad_nombre || '-', rightX + 23, y + 27)
  }

  if (intervencion.direccion) {
    doc.setFont('helvetica', 'bold')
    doc.text('Dirección:', rightX + 3, y + 34)
    doc.setFont('helvetica', 'normal')
    const dir = [intervencion.direccion, intervencion.codigo_postal, intervencion.ciudad].filter(Boolean).join(', ')
    doc.text(dir.slice(0, 38), rightX + 23, y + 34)
  }

  y += boxH + 6

  // =========================================
  // TÉCNICO Y TIEMPOS
  // =========================================
  doc.setFillColor(...COLORS.primary)
  doc.rect(margin, y, contentWidth, 7, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.white)
  doc.text('TÉCNICO Y TIEMPOS', margin + 3, y + 5)
  y += 10

  doc.setFontSize(8.5)
  doc.setTextColor(...COLORS.text)
  const tecnicoNombre = intervencion.tecnico?.nombre_completo || intervencion.tecnico_nombre || 'Sin asignar'

  const tiempoData = [
    ['Técnico asignado', tecnicoNombre, 'Fecha solicitud', formatDateShort(intervencion.fecha_solicitud)],
    ['Fecha programada', formatDateShort(intervencion.fecha_programada), 'Inicio trabajo', formatDateTime(intervencion.fecha_inicio)],
    ['Fin trabajo', formatDateTime(intervencion.fecha_fin), 'Duración', intervencion.duracion_minutos ? `${intervencion.duracion_minutos} min` : '-'],
  ]

  autoTable(doc, {
    startY: y,
    body: tiempoData,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 2, textColor: COLORS.text },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 38, textColor: COLORS.gray },
      1: { cellWidth: contentWidth / 2 - 38 },
      2: { fontStyle: 'bold', cellWidth: 38, textColor: COLORS.gray },
      3: { cellWidth: contentWidth / 2 - 38 },
    },
    margin: { left: margin, right: margin },
  })

  y = doc.lastAutoTable.finalY + 6

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
    y += 10

    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.text)
    const descText = intervencion.descripcion || intervencion.titulo || '-'
    const descLines = doc.splitTextToSize(descText, contentWidth - 6)
    doc.setFillColor(...COLORS.lightGray)
    doc.roundedRect(margin, y, contentWidth, descLines.length * 4.5 + 6, 2, 2, 'F')
    doc.text(descLines, margin + 3, y + 5)
    y += descLines.length * 4.5 + 10
  }

  // =========================================
  // DIAGNÓSTICO Y SOLUCIÓN
  // =========================================
  doc.setFillColor(...COLORS.primary)
  doc.rect(margin, y, contentWidth, 7, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.white)
  doc.text('DIAGNÓSTICO Y SOLUCIÓN', margin + 3, y + 5)
  y += 10

  // Diagnóstico
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.text)
  doc.text('Diagnóstico:', margin, y)
  y += 4
  const diagText = intervencion.diagnostico || 'Sin diagnóstico registrado'
  const diagLines = doc.splitTextToSize(diagText, contentWidth - 6)
  doc.setFillColor(...COLORS.lightGray)
  doc.roundedRect(margin, y, contentWidth, diagLines.length * 4.5 + 6, 2, 2, 'F')
  doc.setFont('helvetica', 'normal')
  doc.text(diagLines, margin + 3, y + 5)
  y += diagLines.length * 4.5 + 10

  // Solución
  doc.setFont('helvetica', 'bold')
  doc.text('Solución aplicada:', margin, y)
  y += 4
  const solText = intervencion.solucion || 'Sin solución registrada'
  const solLines = doc.splitTextToSize(solText, contentWidth - 6)
  doc.setFillColor(...COLORS.lightGray)
  doc.roundedRect(margin, y, contentWidth, solLines.length * 4.5 + 6, 2, 2, 'F')
  doc.setFont('helvetica', 'normal')
  doc.text(solLines, margin + 3, y + 5)
  y += solLines.length * 4.5 + 10

  // =========================================
  // MATERIALES UTILIZADOS
  // =========================================
  if (materiales.length > 0) {
    // Nueva página si no hay espacio
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

    y = doc.lastAutoTable.finalY + 4

    // Total materiales
    const totalMat = materiales.reduce((sum, m) => sum + (m.subtotal || (m.cantidad * m.precio_unitario) || 0), 0)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.primary)
    doc.text(`Total materiales: ${formatCurrency(totalMat)}`, pageWidth - margin, y, { align: 'right' })
    y += 8
  }

  // =========================================
  // COSTES RESUMEN
  // =========================================
  if (intervencion.coste_total != null) {
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
      styles: { fontSize: 8.5, cellPadding: 2, textColor: COLORS.text },
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

    y = doc.lastAutoTable.finalY + 10
  }

  // =========================================
  // FIRMAS
  // =========================================
  if (y > 230) { doc.addPage(); y = margin }

  doc.setFillColor(...COLORS.primary)
  doc.rect(margin, y, contentWidth, 7, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.white)
  doc.text('FIRMAS Y CONFORMIDAD', margin + 3, y + 5)
  y += 10

  const firmaW = colW
  const firmaH = 35

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
      doc.addImage(intervencion.firma_cliente, 'PNG', margin + 5, y + 8, firmaW - 10, firmaH - 16)
    } catch (_) {
      // Si la firma no se puede insertar, dejar espacio en blanco
    }
  }

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.text)
  doc.text('El cliente confirma la realización del trabajo descrito', margin + firmaW / 2, y + firmaH - 3, { align: 'center' })

  // Caja firma técnico
  doc.setDrawColor(...COLORS.gray)
  doc.roundedRect(rightX, y, firmaW, firmaH, 2, 2, 'S')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.gray)
  doc.text('Firma del técnico', rightX + firmaW / 2, y + 5, { align: 'center' })

  if (intervencion.firma_tecnico) {
    try {
      doc.addImage(intervencion.firma_tecnico, 'PNG', rightX + 5, y + 8, firmaW - 10, firmaH - 16)
    } catch (_) {
      // Dejar espacio en blanco
    }
  }

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.text)
  doc.text(`Técnico: ${intervencion.tecnico?.nombre_completo || intervencion.tecnico_nombre || '-'}`, rightX + firmaW / 2, y + firmaH - 3, { align: 'center' })

  y += firmaH + 10

  // =========================================
  // PIE DE PÁGINA
  // =========================================
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const pageH = doc.internal.pageSize.getHeight()
    doc.setDrawColor(...COLORS.secondary)
    doc.setLineWidth(0.5)
    doc.line(margin, pageH - 12, pageWidth - margin, pageH - 12)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.gray)
    doc.text(
      `${EMPRESA.nombre} · ${EMPRESA.direccion}, ${EMPRESA.cp} ${EMPRESA.ciudad} · Tel: ${EMPRESA.telefono} · CIF: ${EMPRESA.cif}`,
      pageWidth / 2,
      pageH - 7,
      { align: 'center' },
    )
    doc.text(`Pág. ${i} / ${pageCount}`, pageWidth - margin, pageH - 7, { align: 'right' })
  }

  return doc.output('blob')
}
