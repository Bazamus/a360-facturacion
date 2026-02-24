import { useMutation } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'

/**
 * Hook para exportar clientes a Excel
 * Ofrece diferentes modos de exportación con opciones avanzadas
 */
export function useExportarClientes() {
  const exportar = useMutation({
    mutationFn: async ({ clientes, config, onProgress }) => {
      const {
        formato = 'completo',
        columnasAdicionales = {},
        formatoNumeros = 'espanol',
        formatoAvanzado = true
      } = config

      // Callback de progreso
      const reportProgress = (current, total, message) => {
        if (onProgress) onProgress({ current, total, message })
      }

      reportProgress(0, 100, 'Preparando datos...')

      let wb, resultado

      switch (formato) {
        case 'basico':
          resultado = await generarBasico(clientes, { columnasAdicionales, formatoNumeros, formatoAvanzado })
          wb = resultado.workbook
          break
        case 'completo':
          resultado = await generarCompleto(clientes, { columnasAdicionales, formatoNumeros, formatoAvanzado })
          wb = resultado.workbook
          break
        case 'detallado':
          resultado = await generarDetallado(clientes, { formatoNumeros, formatoAvanzado })
          wb = resultado.workbook
          break
        default:
          throw new Error('Formato no válido')
      }

      reportProgress(80, 100, 'Descargando archivo...')

      // Generar y descargar archivo
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      const nombreArchivo = generarNombreArchivo(clientes, config)
      descargarBlob(blob, nombreArchivo)

      reportProgress(100, 100, 'Completado')

      return {
        success: true,
        totalClientes: clientes.length,
        formato
      }
    }
  })

  return { exportar }
}

// ==============================================
// FUNCIONES GENERADORAS DE FORMATOS
// ==============================================

async function generarBasico(clientes, opciones) {
  const { columnasAdicionales, formatoNumeros, formatoAvanzado } = opciones

  // Construir columnas base
  const columnas = [
    'CÓDIGO',
    'NIF',
    'NOMBRE',
    'APELLIDOS',
    'TIPO',
    'Nº CONTADOR',
    'EMAIL',
    'TELÉFONO',
    'TELÉFONO 2'
  ]

  // Añadir columnas adicionales
  if (columnasAdicionales.estadoCliente) columnas.push('ESTADO')
  if (columnasAdicionales.direccionCorrespondencia) {
    columnas.push('DIRECCIÓN', 'CP', 'CIUDAD', 'PROVINCIA')
  }
  if (columnasAdicionales.iban) columnas.push('IBAN')
  if (columnasAdicionales.titular) columnas.push('TITULAR CUENTA')
  if (columnasAdicionales.comunidades) columnas.push('COMUNIDADES')
  if (columnasAdicionales.ubicaciones) columnas.push('UBICACIONES ACTUALES')

  // Preparar datos
  const datos = clientes.map(c => {
    const fila = {
      'CÓDIGO': c.codigo_cliente || '-',
      'NIF': c.nif || '-',
      'NOMBRE': c.nombre || '-',
      'APELLIDOS': c.apellidos || '-',
      'TIPO': c.tipo === 'propietario' ? 'Propietario' : 'Inquilino',
      'Nº CONTADOR': c.numero_contador || '-',
      'EMAIL': c.email || '-',
      'TELÉFONO': c.telefono || '-',
      'TELÉFONO 2': c.telefono_secundario || '-'
    }

    // Añadir columnas adicionales
    if (columnasAdicionales.estadoCliente) {
      fila['ESTADO'] = c.estado?.nombre || '-'
    }

    if (columnasAdicionales.direccionCorrespondencia) {
      fila['DIRECCIÓN'] = c.direccion_correspondencia || '-'
      fila['CP'] = c.cp_correspondencia || '-'
      fila['CIUDAD'] = c.ciudad_correspondencia || '-'
      fila['PROVINCIA'] = c.provincia_correspondencia || '-'
    }

    if (columnasAdicionales.iban) {
      fila['IBAN'] = c.iban || '-'
    }

    if (columnasAdicionales.titular) {
      fila['TITULAR CUENTA'] = c.titular_cuenta || '-'
    }

    if (columnasAdicionales.comunidades) {
      const comunidades = c.ubicaciones_clientes?.map(uc => uc.ubicacion?.comunidad?.nombre || uc.ubicacion?.comunidad?.codigo).filter(Boolean)
      fila['COMUNIDADES'] = comunidades?.length ? [...new Set(comunidades)].join(', ') : '-'
    }

    if (columnasAdicionales.ubicaciones) {
      const ubicaciones = c.ubicaciones_clientes?.filter(uc => uc.es_actual).map(uc => uc.ubicacion?.nombre).filter(Boolean)
      fila['UBICACIONES ACTUALES'] = ubicaciones?.length ? ubicaciones.join(', ') : '-'
    }

    return fila
  })

  // Crear workbook
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(datos)

  // Aplicar formato
  if (formatoAvanzado) {
    aplicarFormatoAvanzado(ws, datos.length, columnas, formatoNumeros)
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Clientes')

  return { workbook: wb }
}

async function generarCompleto(clientes, opciones) {
  const { columnasAdicionales, formatoNumeros, formatoAvanzado } = opciones

  // Incluir todos los campos
  const columnas = [
    'CÓDIGO',
    'NIF',
    'NOMBRE',
    'APELLIDOS',
    'TIPO',
    'Nº CONTADOR',
    'EMAIL',
    'TELÉFONO',
    'TELÉFONO 2',
    'DIRECCIÓN CORRESP.',
    'CP CORRESP.',
    'CIUDAD CORRESP.',
    'PROVINCIA CORRESP.',
    'IBAN',
    'TITULAR CUENTA'
  ]

  if (columnasAdicionales.estadoCliente) columnas.push('ESTADO')
  if (columnasAdicionales.comunidades) columnas.push('COMUNIDADES')
  if (columnasAdicionales.ubicaciones) columnas.push('UBICACIONES ACTUALES')

  const datos = clientes.map(c => {
    const fila = {
      'CÓDIGO': c.codigo_cliente || '-',
      'NIF': c.nif || '-',
      'NOMBRE': c.nombre || '-',
      'APELLIDOS': c.apellidos || '-',
      'TIPO': c.tipo === 'propietario' ? 'Propietario' : 'Inquilino',
      'Nº CONTADOR': c.numero_contador || '-',
      'EMAIL': c.email || '-',
      'TELÉFONO': c.telefono || '-',
      'TELÉFONO 2': c.telefono_secundario || '-',
      'DIRECCIÓN CORRESP.': c.direccion_correspondencia || '-',
      'CP CORRESP.': c.cp_correspondencia || '-',
      'CIUDAD CORRESP.': c.ciudad_correspondencia || '-',
      'PROVINCIA CORRESP.': c.provincia_correspondencia || '-',
      'IBAN': c.iban || '-',
      'TITULAR CUENTA': c.titular_cuenta || '-'
    }

    if (columnasAdicionales.estadoCliente) {
      fila['ESTADO'] = c.estado?.nombre || '-'
    }

    if (columnasAdicionales.comunidades) {
      const comunidades = c.ubicaciones_clientes?.map(uc => uc.ubicacion?.comunidad?.nombre || uc.ubicacion?.comunidad?.codigo).filter(Boolean)
      fila['COMUNIDADES'] = comunidades?.length ? [...new Set(comunidades)].join(', ') : '-'
    }

    if (columnasAdicionales.ubicaciones) {
      const ubicaciones = c.ubicaciones_clientes?.filter(uc => uc.es_actual).map(uc => uc.ubicacion?.nombre).filter(Boolean)
      fila['UBICACIONES ACTUALES'] = ubicaciones?.length ? ubicaciones.join(', ') : '-'
    }

    return fila
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(datos)

  if (formatoAvanzado) {
    aplicarFormatoAvanzado(ws, datos.length, columnas, formatoNumeros)
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Clientes')

  return { workbook: wb }
}

async function generarDetallado(clientes, opciones) {
  const { formatoNumeros, formatoAvanzado } = opciones

  // Formato detallado: una fila por ubicación del cliente
  const columnas = [
    'CÓDIGO CLIENTE',
    'NIF',
    'NOMBRE',
    'APELLIDOS',
    'TIPO',
    'ESTADO',
    'Nº CONTADOR',
    'COMUNIDAD',
    'CÓD. COMUNIDAD',
    'UBICACIÓN',
    'FECHA INICIO',
    'FECHA FIN',
    'ES ACTUAL',
    'EMAIL',
    'TELÉFONO',
    'IBAN'
  ]

  const datos = []

  clientes.forEach(c => {
    const ubicaciones = c.ubicaciones_clientes || []

    if (ubicaciones.length === 0) {
      // Cliente sin ubicaciones
      datos.push({
        'CÓDIGO CLIENTE': c.codigo_cliente || '-',
        'NIF': c.nif || '-',
        'NOMBRE': c.nombre || '-',
        'APELLIDOS': c.apellidos || '-',
        'TIPO': c.tipo === 'propietario' ? 'Propietario' : 'Inquilino',
        'ESTADO': c.estado?.nombre || '-',
        'Nº CONTADOR': c.numero_contador || '-',
        'COMUNIDAD': '-',
        'CÓD. COMUNIDAD': '-',
        'UBICACIÓN': '-',
        'FECHA INICIO': '-',
        'FECHA FIN': '-',
        'ES ACTUAL': '-',
        'EMAIL': c.email || '-',
        'TELÉFONO': c.telefono || '-',
        'IBAN': c.iban || '-'
      })
    } else {
      // Una fila por ubicación
      ubicaciones.forEach(uc => {
        datos.push({
          'CÓDIGO CLIENTE': c.codigo_cliente || '-',
          'NIF': c.nif || '-',
          'NOMBRE': c.nombre || '-',
          'APELLIDOS': c.apellidos || '-',
          'TIPO': c.tipo === 'propietario' ? 'Propietario' : 'Inquilino',
          'ESTADO': c.estado?.nombre || '-',
          'Nº CONTADOR': c.numero_contador || '-',
          'COMUNIDAD': uc.ubicacion?.comunidad?.nombre || '-',
          'CÓD. COMUNIDAD': uc.ubicacion?.comunidad?.codigo || '-',
          'UBICACIÓN': uc.ubicacion?.nombre || '-',
          'FECHA INICIO': formatDate(uc.fecha_inicio),
          'FECHA FIN': uc.fecha_fin ? formatDate(uc.fecha_fin) : '-',
          'ES ACTUAL': uc.es_actual ? 'Sí' : 'No',
          'EMAIL': c.email || '-',
          'TELÉFONO': c.telefono || '-',
          'IBAN': c.iban || '-'
        })
      })
    }
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(datos)

  if (formatoAvanzado) {
    aplicarFormatoAvanzado(ws, datos.length, columnas, formatoNumeros)
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Clientes Detallado')

  return { workbook: wb }
}

// ==============================================
// FUNCIONES AUXILIARES
// ==============================================

function aplicarFormatoAvanzado(ws, numFilas, columnas, formatoNumeros) {
  const range = XLSX.utils.decode_range(ws['!ref'])

  // Anchos de columna
  const anchos = columnas.map(col => {
    if (col.includes('NOMBRE') || col.includes('APELLIDOS')) return { wch: 25 }
    if (col.includes('DIRECCIÓN') || col.includes('UBICACIÓN')) return { wch: 30 }
    if (col.includes('EMAIL')) return { wch: 25 }
    if (col.includes('IBAN')) return { wch: 24 }
    if (col.includes('CONTADOR')) return { wch: 18 }
    if (col.includes('COMUNIDAD')) return { wch: 30 }
    if (col.includes('FECHA')) return { wch: 12 }
    return { wch: 15 }
  })
  ws['!cols'] = anchos

  // Congelar primera fila
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }

  // Filtros automáticos
  ws['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(columnas.length - 1)}${numFilas}` }

  // Estilos de encabezado
  for (let C = 0; C < columnas.length; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C })
    if (!ws[cellAddress]) continue
    
    ws[cellAddress].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4472C4' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    }
  }
}

function generarNombreArchivo(clientes, config) {
  const fecha = new Date().toISOString().split('T')[0]
  const formato = config.formato.charAt(0).toUpperCase() + config.formato.slice(1)
  return `Clientes_${formato}_${fecha}.xlsx`
}

function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nombreArchivo
  link.click()
  URL.revokeObjectURL(url)
}

function formatDate(dateString) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}
