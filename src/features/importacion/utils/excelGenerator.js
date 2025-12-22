/**
 * Generador de Plantillas Excel y Exportación de Datos
 * Sistema de Facturación A360
 */

import * as XLSX from 'xlsx'

// Configuración de columnas por entidad
const COLUMN_CONFIG = {
  comunidades: {
    headers: [
      'Código', 'Nombre', 'CIF', 'Dirección', 'Código Postal', 
      'Ciudad', 'Provincia', 'Email', 'Teléfono', 'Persona Contacto',
      'Tipo Agrupación', 'Tipo Ubicación'
    ],
    fields: [
      'codigo', 'nombre', 'cif', 'direccion', 'codigo_postal',
      'ciudad', 'provincia', 'email', 'telefono', 'persona_contacto',
      'nombre_agrupacion', 'nombre_ubicacion'
    ],
    required: ['codigo', 'nombre', 'direccion', 'codigo_postal', 'ciudad', 'provincia'],
    example: {
      codigo: 'TROYA40',
      nombre: 'Residencial Troya 40',
      cif: 'H12345678',
      direccion: 'C/ Troya, 40',
      codigo_postal: '28001',
      ciudad: 'Madrid',
      provincia: 'Madrid',
      email: 'comunidad@ejemplo.com',
      telefono: '912345678',
      persona_contacto: 'Juan García',
      nombre_agrupacion: 'Portal',
      nombre_ubicacion: 'Vivienda'
    }
  },
  clientes: {
    headers: [
      'NIF', 'Nombre', 'Apellidos', 'Tipo', 'Email', 'Teléfono',
      'Teléfono Secundario', 'IBAN', 'Titular Cuenta', 'Código Cliente',
      'Dirección', 'Código Postal', 'Ciudad', 'Provincia',
      'Código Comunidad', 'Portal', 'Vivienda'
    ],
    fields: [
      'nif', 'nombre', 'apellidos', 'tipo', 'email', 'telefono',
      'telefono_secundario', 'iban', 'titular_cuenta', 'codigo_cliente',
      'direccion_correspondencia', 'cp_correspondencia', 'ciudad_correspondencia', 'provincia_correspondencia',
      'comunidad_codigo', 'agrupacion_nombre', 'ubicacion_nombre'
    ],
    required: ['nif', 'nombre', 'apellidos', 'tipo'],
    example: {
      nif: '12345678A',
      nombre: 'Juan',
      apellidos: 'García López',
      tipo: 'propietario',
      email: 'juan@email.com',
      telefono: '600123456',
      telefono_secundario: '',
      iban: 'ES1234567890123456789012',
      titular_cuenta: 'Juan García López',
      codigo_cliente: 'CLI001',
      direccion_correspondencia: '',
      cp_correspondencia: '',
      ciudad_correspondencia: '',
      provincia_correspondencia: '',
      comunidad_codigo: 'TROYA40',
      agrupacion_nombre: '1',
      ubicacion_nombre: '1ºA'
    }
  },
  contadores: {
    headers: [
      'Nº Serie', 'Marca', 'Modelo', 'Fecha Instalación', 'Fecha Verificación',
      'Código Comunidad', 'Portal', 'Vivienda', 'Observaciones'
    ],
    fields: [
      'numero_serie', 'marca', 'modelo', 'fecha_instalacion', 'fecha_ultima_verificacion',
      'comunidad_codigo', 'agrupacion_nombre', 'ubicacion_nombre', 'observaciones'
    ],
    required: ['numero_serie', 'comunidad_codigo', 'agrupacion_nombre', 'ubicacion_nombre'],
    example: {
      numero_serie: 'ABC123456',
      marca: 'Zenner',
      modelo: 'MTKD',
      fecha_instalacion: '01/01/2024',
      fecha_ultima_verificacion: '',
      comunidad_codigo: 'TROYA40',
      agrupacion_nombre: '1',
      ubicacion_nombre: '1ºA',
      observaciones: ''
    }
  }
}

/**
 * Genera una plantilla Excel vacía para una entidad
 * @param {string} entidad - 'comunidades' | 'clientes' | 'contadores'
 * @param {boolean} incluirEjemplo - Si incluir una fila de ejemplo
 * @returns {string} Nombre del archivo generado
 */
export function generarPlantillaVacia(entidad, incluirEjemplo = true) {
  const config = COLUMN_CONFIG[entidad]
  if (!config) {
    throw new Error(`Entidad no soportada: ${entidad}`)
  }

  // Crear worksheet con cabeceras
  const wsData = [config.headers]
  
  // Añadir fila de ejemplo si se solicita
  if (incluirEjemplo) {
    const ejemploRow = config.fields.map(field => config.example[field] || '')
    wsData.push(ejemploRow)
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData)
  
  // Ajustar ancho de columnas
  const colWidths = config.headers.map(h => ({ wch: Math.max(h.length + 2, 15) }))
  ws['!cols'] = colWidths

  // Crear workbook
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')

  // Añadir hoja de instrucciones
  const instrucciones = generarHojaInstrucciones(entidad, config)
  XLSX.utils.book_append_sheet(wb, instrucciones, 'Instrucciones')

  // Generar y descargar
  const fileName = `plantilla_${entidad}_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
  
  return fileName
}

/**
 * Genera hoja de instrucciones para la plantilla
 */
function generarHojaInstrucciones(entidad, config) {
  const instrucciones = [
    [`INSTRUCCIONES PARA IMPORTAR ${entidad.toUpperCase()}`],
    [''],
    ['CAMPOS OBLIGATORIOS:'],
    ...config.required.map((field, idx) => {
      const headerIdx = config.fields.indexOf(field)
      return [`  ${idx + 1}. ${config.headers[headerIdx]}`]
    }),
    [''],
    ['FORMATO DE DATOS:'],
    ['  - Fechas: DD/MM/YYYY (ej: 01/01/2024)'],
    ['  - NIF: 8 dígitos + letra (ej: 12345678A)'],
    ['  - IBAN: 24 caracteres sin espacios (ej: ES1234567890123456789012)'],
    ['  - Tipo cliente: "propietario" o "inquilino"'],
    [''],
    ['CAMPOS DE UBICACIÓN (para Clientes y Contadores):'],
    ['  - Código Comunidad: Código único de la comunidad (ej: TROYA40)'],
    ['  - Portal: Nombre del portal/bloque (ej: 1, 2, A, B)'],
    ['  - Vivienda: Nombre de la vivienda (ej: 1ºA, 2ºB, Bajo C)'],
    [''],
    ['NOTAS:'],
    ['  - La primera fila (cabeceras) NO se importa'],
    ['  - Deje las celdas vacías si no tiene el dato'],
    ['  - Si el código/NIF/Nº serie ya existe, se actualizarán los datos']
  ]

  return XLSX.utils.aoa_to_sheet(instrucciones)
}

/**
 * Exporta datos existentes a Excel
 * @param {string} entidad - 'comunidades' | 'clientes' | 'contadores'
 * @param {Array} datos - Array de objetos con los datos
 * @returns {string} Nombre del archivo generado
 */
export function exportarDatos(entidad, datos) {
  const config = COLUMN_CONFIG[entidad]
  if (!config) {
    throw new Error(`Entidad no soportada: ${entidad}`)
  }

  if (!datos || datos.length === 0) {
    throw new Error('No hay datos para exportar')
  }

  // Transformar datos según la entidad
  const datosTransformados = datos.map(item => transformarParaExport(entidad, item))

  // Crear filas de datos
  const wsData = [config.headers]
  datosTransformados.forEach(item => {
    const row = config.fields.map(field => {
      const value = item[field]
      if (value === null || value === undefined) return ''
      if (value instanceof Date) return formatDate(value)
      return String(value)
    })
    wsData.push(row)
  })

  const ws = XLSX.utils.aoa_to_sheet(wsData)
  
  // Ajustar ancho de columnas
  const colWidths = config.headers.map(h => ({ wch: Math.max(h.length + 2, 15) }))
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')

  const fileName = `export_${entidad}_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, fileName)
  
  return fileName
}

/**
 * Transforma un registro de BD al formato de exportación
 */
function transformarParaExport(entidad, item) {
  switch (entidad) {
    case 'comunidades':
      return {
        codigo: item.codigo,
        nombre: item.nombre,
        cif: item.cif,
        direccion: item.direccion,
        codigo_postal: item.codigo_postal,
        ciudad: item.ciudad,
        provincia: item.provincia,
        email: item.email,
        telefono: item.telefono,
        persona_contacto: item.persona_contacto,
        nombre_agrupacion: item.nombre_agrupacion,
        nombre_ubicacion: item.nombre_ubicacion
      }
    
    case 'clientes':
      // Obtener ubicación actual si existe
      const ubicacionActual = item.ubicaciones_clientes?.find(uc => uc.es_actual)
      return {
        nif: item.nif,
        nombre: item.nombre,
        apellidos: item.apellidos,
        tipo: item.tipo,
        email: item.email,
        telefono: item.telefono,
        telefono_secundario: item.telefono_secundario,
        iban: item.iban,
        titular_cuenta: item.titular_cuenta,
        codigo_cliente: item.codigo_cliente,
        direccion_correspondencia: item.direccion_correspondencia,
        cp_correspondencia: item.cp_correspondencia,
        ciudad_correspondencia: item.ciudad_correspondencia,
        provincia_correspondencia: item.provincia_correspondencia,
        comunidad_codigo: ubicacionActual?.ubicacion?.agrupacion?.comunidad?.codigo || '',
        agrupacion_nombre: ubicacionActual?.ubicacion?.agrupacion?.nombre || '',
        ubicacion_nombre: ubicacionActual?.ubicacion?.nombre || ''
      }
    
    case 'contadores':
      return {
        numero_serie: item.numero_serie,
        marca: item.marca,
        modelo: item.modelo,
        fecha_instalacion: item.fecha_instalacion,
        fecha_ultima_verificacion: item.fecha_ultima_verificacion,
        comunidad_codigo: item.ubicacion?.agrupacion?.comunidad?.codigo || '',
        agrupacion_nombre: item.ubicacion?.agrupacion?.nombre || '',
        ubicacion_nombre: item.ubicacion?.nombre || '',
        observaciones: item.observaciones
      }
    
    default:
      return item
  }
}

/**
 * Formatea fecha para Excel
 */
function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Lee un archivo Excel y devuelve los datos parseados
 * @param {File} file - Archivo Excel
 * @returns {Promise<{headers: string[], rows: any[], entidad: string}>}
 */
export async function leerExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        
        // Usar la primera hoja (Datos)
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false })
        
        if (jsonData.length < 2) {
          reject(new Error('El archivo debe tener al menos una cabecera y una fila de datos'))
          return
        }

        const headers = jsonData[0]
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== '' && cell != null))
        
        // Detectar entidad basándose en las cabeceras
        const entidad = detectarEntidad(headers)
        
        // Parsear filas a objetos
        const config = COLUMN_CONFIG[entidad]
        const parsedRows = rows.map((row, index) => {
          const obj = { _rowIndex: index + 2 } // +2 por cabecera y base 1
          headers.forEach((header, colIndex) => {
            const fieldIndex = config.headers.indexOf(header)
            if (fieldIndex !== -1) {
              const field = config.fields[fieldIndex]
              obj[field] = row[colIndex] || null
            }
          })
          return obj
        })

        resolve({
          headers,
          rows: parsedRows,
          entidad,
          totalRows: parsedRows.length
        })
      } catch (error) {
        reject(new Error(`Error al leer el archivo: ${error.message}`))
      }
    }
    
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Detecta la entidad basándose en las cabeceras del Excel
 */
function detectarEntidad(headers) {
  const headersLower = headers.map(h => h?.toLowerCase() || '')
  
  // Comunidades: tiene "Código" y "Nombre" pero no "NIF" ni "Nº Serie"
  if (headersLower.includes('código') && headersLower.includes('nombre') && 
      !headersLower.includes('nif') && !headersLower.includes('nº serie')) {
    return 'comunidades'
  }
  
  // Clientes: tiene "NIF"
  if (headersLower.includes('nif')) {
    return 'clientes'
  }
  
  // Contadores: tiene "Nº Serie"
  if (headersLower.includes('nº serie')) {
    return 'contadores'
  }
  
  throw new Error('No se pudo detectar el tipo de datos. Verifica que las cabeceras sean correctas.')
}

/**
 * Obtiene la configuración de columnas para una entidad
 */
export function getColumnConfig(entidad) {
  return COLUMN_CONFIG[entidad]
}

export default {
  generarPlantillaVacia,
  exportarDatos,
  leerExcel,
  getColumnConfig,
  COLUMN_CONFIG
}
