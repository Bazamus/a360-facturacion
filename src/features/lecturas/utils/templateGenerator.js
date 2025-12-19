/**
 * Generador de Plantilla Maestra Excel
 * Sistema de Facturación A360
 */

import * as XLSX from 'xlsx'

/**
 * Genera y descarga una plantilla Excel vacía con los conceptos dinámicos
 * @param {Array} conceptos - Lista de conceptos activos
 * @param {string} comunidadNombre - Nombre de la comunidad (opcional)
 */
export function generarPlantillaMaestra(conceptos, comunidadNombre = '') {
  // Columnas fijas
  const columnasBase = ['Fecha', 'Nº Contador', 'Portal', 'Vivienda']
  
  // Añadir columnas de conceptos dinámicamente
  const columnasConceptos = conceptos.map(c => c.codigo)
  
  // Todas las columnas
  const headers = [...columnasBase, ...columnasConceptos]
  
  // Crear datos de ejemplo (2 filas de muestra)
  const ejemploData = [
    headers,
    [
      '17/12/2025',
      '22804101',
      '1',
      '1ºA',
      ...columnasConceptos.map((_, i) => i === 0 ? '150.5' : '')
    ],
    [
      '17/12/2025',
      '22804102',
      '1',
      '1ºB',
      ...columnasConceptos.map((_, i) => i === 0 ? '89.0' : (i === 1 ? '3200' : ''))
    ]
  ]
  
  // Crear libro de Excel
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_array ? 
    XLSX.utils.aoa_to_sheet(ejemploData) : 
    XLSX.utils.aoa_to_sheet(ejemploData)
  
  // Aplicar estilos a los headers (ancho de columnas)
  const colWidths = headers.map(h => ({ wch: Math.max(h.length + 2, 12) }))
  ws['!cols'] = colWidths
  
  // Añadir hoja al libro
  XLSX.utils.book_append_sheet(wb, ws, 'Lecturas')
  
  // Crear hoja de instrucciones
  const instrucciones = [
    ['INSTRUCCIONES DE USO'],
    [''],
    ['1. Columnas obligatorias:'],
    ['   - Fecha: Fecha de la lectura (formato DD/MM/YYYY)'],
    ['   - Nº Contador: Número de serie del contador'],
    [''],
    ['2. Columnas opcionales de referencia:'],
    ['   - Portal: Número de portal'],
    ['   - Vivienda: Identificador de vivienda (ej: 1ºA, 2ºB)'],
    [''],
    ['3. Columnas de conceptos:'],
    ...conceptos.map(c => [`   - ${c.codigo}: ${c.nombre} (${c.unidad_medida || 'unidades'})`]),
    [''],
    ['4. Notas importantes:'],
    ['   - Una fila por contador'],
    ['   - Deja en blanco las celdas de conceptos que no apliquen'],
    ['   - Los valores numéricos pueden usar coma o punto decimal'],
    ['   - No modifiques los nombres de las columnas'],
    [''],
    ['Conceptos disponibles:'],
    ...conceptos.map(c => [`   ${c.codigo} - ${c.nombre}`])
  ]
  
  const wsInstrucciones = XLSX.utils.aoa_to_sheet(instrucciones)
  wsInstrucciones['!cols'] = [{ wch: 60 }]
  XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'Instrucciones')
  
  // Generar nombre de archivo
  const fecha = new Date().toISOString().split('T')[0]
  const nombreArchivo = comunidadNombre 
    ? `Plantilla_Lecturas_${comunidadNombre.replace(/\s+/g, '_')}_${fecha}.xlsx`
    : `Plantilla_Maestra_Lecturas_${fecha}.xlsx`
  
  // Descargar
  XLSX.writeFile(wb, nombreArchivo)
  
  return nombreArchivo
}

/**
 * Genera una plantilla con los contadores de una comunidad pre-cargados
 * @param {Array} contadores - Lista de contadores con sus ubicaciones
 * @param {Array} conceptos - Lista de conceptos activos
 * @param {string} comunidadNombre - Nombre de la comunidad
 */
export function generarPlantillaConContadores(contadores, conceptos, comunidadNombre) {
  // Columnas fijas
  const columnasBase = ['Fecha', 'Nº Contador', 'Portal', 'Vivienda']
  
  // Añadir columnas de conceptos
  const columnasConceptos = conceptos.map(c => c.codigo)
  const headers = [...columnasBase, ...columnasConceptos]
  
  // Fecha actual
  const fechaHoy = new Date().toLocaleDateString('es-ES')
  
  // Crear filas con los contadores
  const filas = contadores.map(contador => {
    // Obtener conceptos asignados al contador
    const conceptosContador = contador.contadores_conceptos || []
    
    return [
      fechaHoy,
      contador.numero_serie,
      contador.ubicacion?.agrupacion?.nombre || '',
      contador.ubicacion?.nombre || '',
      ...columnasConceptos.map(codigo => {
        // Si el contador tiene este concepto asignado, dejar en blanco para rellenar
        const tieneConcepto = conceptosContador.some(cc => 
          cc.concepto?.codigo === codigo && cc.activo
        )
        return tieneConcepto ? '' : '—' // Guion indica que no aplica
      })
    ]
  })
  
  // Crear datos
  const data = [headers, ...filas]
  
  // Crear libro
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(data)
  
  // Anchos de columna
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 12) }))
  
  XLSX.utils.book_append_sheet(wb, ws, 'Lecturas')
  
  // Nombre de archivo
  const fecha = new Date().toISOString().split('T')[0]
  const nombreArchivo = `Plantilla_${comunidadNombre.replace(/\s+/g, '_')}_${fecha}.xlsx`
  
  // Descargar
  XLSX.writeFile(wb, nombreArchivo)
  
  return nombreArchivo
}

export default { generarPlantillaMaestra, generarPlantillaConContadores }
