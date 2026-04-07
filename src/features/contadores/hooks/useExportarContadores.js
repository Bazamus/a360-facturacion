import { useMutation } from '@tanstack/react-query'
import * as XLSX from 'xlsx'

/**
 * Exportación de contadores a Excel alineada con el listado de /contadores.
 */
export function useExportarContadores() {
  const exportar = useMutation({
    mutationFn: async ({ contadores }) => {
      if (!contadores || contadores.length === 0) {
        throw new Error('No hay contadores para exportar')
      }

      const columnas = [
        'Nº SERIE',
        'COMUNIDAD',
        'UBICACIÓN',
        'CONCEPTOS',
        'CLIENTE',
        'ESTADO'
      ]

      const datos = contadores.map((c) => ({
        'Nº SERIE': c.numero_serie || '-',
        'COMUNIDAD': c.comunidad_nombre || '-',
        'UBICACIÓN': `${c.agrupacion_nombre || ''}${c.agrupacion_nombre ? ' — ' : ''}${c.ubicacion_nombre || ''}`.trim() || '-',
        'CONCEPTOS': c.conceptos?.length ? c.conceptos.map(x => x.codigo).filter(Boolean).join(', ') : '-',
        'CLIENTE': c.cliente_nombre || '-',
        'ESTADO': c.activo ? 'Activo' : 'Inactivo',
      }))

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(datos, { header: columnas })
      ws['!cols'] = columnas.map((col) => {
        if (col.includes('UBICACIÓN') || col.includes('COMUNIDAD')) return { wch: 32 }
        if (col.includes('CONCEPTOS')) return { wch: 22 }
        if (col.includes('CLIENTE')) return { wch: 28 }
        if (col.includes('Nº SERIE')) return { wch: 16 }
        return { wch: 14 }
      })

      XLSX.utils.book_append_sheet(wb, ws, 'Contadores')

      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      const fecha = new Date().toISOString().split('T')[0]
      const fileName = `Contadores_${fecha}.xlsx`
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.click()
      URL.revokeObjectURL(url)

      return { success: true, fileName, count: contadores.length }
    }
  })

  return { exportar }
}

