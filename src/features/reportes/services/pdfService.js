import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'

/**
 * Captura un gráfico como imagen base64
 * @param {React.RefObject} elementRef - Referencia al elemento del gráfico
 * @returns {Promise<string>} - Imagen en formato base64
 */
export async function capturarGrafico(elementRef) {
  if (!elementRef || !elementRef.current) {
    return null
  }

  try {
    const canvas = await html2canvas(elementRef.current, {
      backgroundColor: '#ffffff',
      scale: 2 // Mejor calidad
    })
    return canvas.toDataURL('image/png')
  } catch (error) {
    console.error('Error al capturar gráfico:', error)
    return null
  }
}

/**
 * Genera un PDF de reporte con tablas y gráficos
 * @param {Object} config - Configuración del reporte
 * @returns {jsPDF} - Documento PDF generado
 */
export async function generarReportePDF({
  titulo,
  subtitulo,
  periodo,
  datos,
  columnas,
  totales,
  graficoImagen = null,
  orientacion = 'landscape'
}) {
  const doc = new jsPDF(orientacion)
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let yPosition = 20

  // Logo o Header (opcional)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(titulo, 14, yPosition)
  yPosition += 8

  // Subtítulo
  if (subtitulo) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(subtitulo, 14, yPosition)
    yPosition += 6
  }

  // Periodo
  if (periodo) {
    doc.setFontSize(10)
    doc.setTextColor(80)
    doc.text(`Periodo: ${periodo}`, 14, yPosition)
    yPosition += 10
  }

  doc.setTextColor(0)

  // Gráfico (si existe)
  if (graficoImagen) {
    try {
      const imgWidth = pageWidth - 28
      const imgHeight = 80
      doc.addImage(graficoImagen, 'PNG', 14, yPosition, imgWidth, imgHeight)
      yPosition += imgHeight + 10
    } catch (error) {
      console.error('Error al añadir gráfico al PDF:', error)
    }
  }

  // Preparar datos de tabla
  const headers = columnas.map(col => col.header || col.label || col.key)
  const rows = datos.map(row => 
    columnas.map(col => {
      const value = row[col.key]
      if (col.render) {
        return col.render(value, row)
      }
      return value ?? '-'
    })
  )

  // Tabla con autoTable
  autoTable(doc, {
    startY: yPosition,
    head: [headers],
    body: rows,
    foot: totales ? [totales] : undefined,
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246], // blue-600
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2
    },
    footStyles: {
      fillColor: [243, 244, 246], // gray-100
      textColor: 0,
      fontStyle: 'bold',
      fontSize: 9
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251] // gray-50
    },
    margin: { top: 10, left: 14, right: 14 },
    didDrawPage: function (data) {
      // Footer en cada página
      const str = `Página ${doc.internal.getCurrentPageInfo().pageNumber}`
      doc.setFontSize(9)
      doc.setTextColor(100)
      const pageSize = doc.internal.pageSize
      const pageHeight = pageSize.height || pageSize.getHeight()
      doc.text(str, 14, pageHeight - 10)
      
      // Fecha de generación
      const fecha = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      doc.text(`Generado: ${fecha}`, pageWidth - 14, pageHeight - 10, { align: 'right' })
    }
  })

  // Añadir número total de páginas
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(9)
    doc.setTextColor(100)
    const str = ` de ${pageCount}`
    doc.text(str, 14 + doc.getTextWidth(`Página ${i}`), pageHeight - 10)
  }

  return doc
}

/**
 * Genera y descarga un PDF de reporte
 * @param {Object} config - Configuración del reporte
 * @param {string} nombreArchivo - Nombre del archivo PDF
 */
export async function descargarReportePDF(config, nombreArchivo) {
  const doc = await generarReportePDF(config)
  doc.save(nombreArchivo || `reporte-${Date.now()}.pdf`)
}

/**
 * Formatea las columnas para exportación PDF
 * @param {Array} columnas - Columnas del reporte
 * @param {Array} datos - Datos del reporte
 * @returns {Object} - Columnas y datos formateados
 */
export function formatearParaPDF(columnas, datos) {
  return {
    columnas: columnas.map(col => ({
      key: col.key,
      header: col.header || col.label || col.key,
      render: col.render
    })),
    datos: datos
  }
}
