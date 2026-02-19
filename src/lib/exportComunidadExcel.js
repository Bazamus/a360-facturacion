import * as XLSX from 'xlsx'
import { formatDate } from '@/lib/utils'

/**
 * Exporta todos los datos de una comunidad a un fichero Excel.
 * Cada sección de la comunidad genera una hoja separada.
 *
 * @param {Object} params
 * @param {Object}   params.comunidad    - Objeto comunidad
 * @param {Array}    params.agrupaciones - Lista de portales/agrupaciones
 * @param {Array}    params.ubicaciones  - Lista de viviendas/ubicaciones
 * @param {Array}    params.clientes     - Lista de clientes
 * @param {Array}    params.contadores   - Lista de contadores
 * @param {Array}    params.facturas     - Lista de facturas
 * @param {Array}    params.notas        - Lista de notas/comentarios
 * @param {Array}    params.precios      - Lista de precios
 * @returns {string} Nombre del fichero descargado
 */
export function exportarComunidadExcel({
  comunidad,
  agrupaciones = [],
  ubicaciones = [],
  clientes = [],
  contadores = [],
  facturas = [],
  notas = [],
  precios = []
}) {
  const wb = XLSX.utils.book_new()
  const nombreAgrup = comunidad.nombre_agrupacion || 'Portal'
  const nombreUbic  = comunidad.nombre_ubicacion  || 'Vivienda'

  // ------------------------------------------------------------------
  // Hoja 1 – Datos Generales
  // ------------------------------------------------------------------
  const wsDatos = XLSX.utils.aoa_to_sheet([
    ['Campo', 'Valor'],
    ['Código',            comunidad.codigo || ''],
    ['Nombre',            comunidad.nombre || ''],
    ['CIF',               comunidad.cif || ''],
    ['Dirección',         comunidad.direccion || ''],
    ['Código Postal',     comunidad.codigo_postal || ''],
    ['Ciudad',            comunidad.ciudad || ''],
    ['Provincia',         comunidad.provincia || ''],
    ['Email',             comunidad.email || ''],
    ['Teléfono',          comunidad.telefono || ''],
    ['Persona Contacto',  comunidad.persona_contacto || ''],
    ['Estado',            comunidad.activa ? 'Activa' : 'Inactiva'],
    [`Nombre ${nombreAgrup}`, comunidad.nombre_agrupacion || ''],
    [`Nombre ${nombreUbic}`,  comunidad.nombre_ubicacion  || ''],
  ])
  XLSX.utils.book_append_sheet(wb, wsDatos, 'Datos Generales')

  // ------------------------------------------------------------------
  // Hoja 2 – Portales / Agrupaciones
  // ------------------------------------------------------------------
  const agrupRows = agrupaciones.map(a => ({
    'Nombre':  a.nombre || '',
    'Orden':   a.orden  ?? '',
    'Activa':  a.activa ? 'Sí' : 'No',
  }))
  const wsAgrup = XLSX.utils.json_to_sheet(agrupRows.length ? agrupRows : [{ Nombre: '', Orden: '', Activa: '' }])
  XLSX.utils.book_append_sheet(wb, wsAgrup, `${nombreAgrup}es`)

  // ------------------------------------------------------------------
  // Hoja 3 – Viviendas / Ubicaciones
  // ------------------------------------------------------------------
  const ubicRows = ubicaciones.map(u => ({
    [nombreAgrup]:       u.agrupacion_nombre || '',
    'Nombre':            u.ubicacion_nombre  || u.nombre || '',
    'Tipo':              u.tipo_ubicacion    || '',
    'Activa':            u.activa            ? 'Sí' : 'No',
  }))
  const wsUbic = XLSX.utils.json_to_sheet(ubicRows.length ? ubicRows : [{}])
  XLSX.utils.book_append_sheet(wb, wsUbic, `${nombreUbic}s`)

  // ------------------------------------------------------------------
  // Hoja 4 – Clientes
  // ------------------------------------------------------------------
  const clienteRows = clientes.map(c => ({
    'Código':    c.codigo_cliente || '',
    'Nombre':    `${c.nombre || ''} ${c.apellidos || ''}`.trim(),
    'NIF':       c.nif       || '',
    'Tipo':      c.tipo      || '',
    'Email':     c.email     || '',
    'Teléfono':  c.telefono  || '',
    'Estado':    c.estado?.nombre || '',
    'IBAN':      c.iban      || '',
  }))
  const wsClientes = XLSX.utils.json_to_sheet(clienteRows.length ? clienteRows : [{}])
  XLSX.utils.book_append_sheet(wb, wsClientes, 'Clientes')

  // ------------------------------------------------------------------
  // Hoja 5 – Contadores
  // ------------------------------------------------------------------
  const contadorRows = contadores.map(c => ({
    'N. Serie':         c.numero_serie       || '',
    'Marca':            c.marca              || '',
    'Modelo':           c.modelo             || '',
    [nombreAgrup]:      c.agrupacion_nombre  || '',
    [nombreUbic]:       c.ubicacion_nombre   || '',
    'Conceptos':        (c.conceptos || []).filter(cc => cc.activo !== false).map(cc => cc.codigo || cc.concepto_codigo).join(', '),
    'Estado':           c.activo ? 'Activo' : 'Inactivo',
  }))
  const wsContadores = XLSX.utils.json_to_sheet(contadorRows.length ? contadorRows : [{}])
  XLSX.utils.book_append_sheet(wb, wsContadores, 'Contadores')

  // ------------------------------------------------------------------
  // Hoja 6 – Facturas
  // ------------------------------------------------------------------
  const facturaRows = facturas.map(f => ({
    'Número':          f.numero_completo || f.numero_factura || '',
    'Cliente':         f.cliente_nombre  || '',
    [nombreUbic]:      f.ubicacion_nombre || '',
    'Fecha Factura':   f.fecha_factura   ? formatDate(f.fecha_factura)   : '',
    'Periodo Desde':   f.periodo_desde   ? formatDate(f.periodo_desde)   : '',
    'Periodo Hasta':   f.periodo_hasta   ? formatDate(f.periodo_hasta)   : '',
    'Base Imponible':  f.base_imponible  ?? '',
    'IVA':             f.iva_importe     ?? '',
    'Total':           f.total           ?? '',
    'Estado':          f.estado          || '',
  }))
  const wsFacturas = XLSX.utils.json_to_sheet(facturaRows.length ? facturaRows : [{}])
  XLSX.utils.book_append_sheet(wb, wsFacturas, 'Facturas')

  // ------------------------------------------------------------------
  // Hoja 7 – Notas
  // ------------------------------------------------------------------
  const notaRows = notas.map(n => ({
    'Fecha':     n.created_at ? formatDate(n.created_at) : '',
    'Tipo':      n.tipo       || '',
    'Contenido': n.contenido  || '',
    'Estado':    n.estado     || '',
    'Autor':     n.autor_nombre || n.usuario_nombre || '',
  }))
  const wsNotas = XLSX.utils.json_to_sheet(notaRows.length ? notaRows : [{}])
  XLSX.utils.book_append_sheet(wb, wsNotas, 'Notas')

  // ------------------------------------------------------------------
  // Hoja 8 – Precios
  // ------------------------------------------------------------------
  const precioRows = precios.map(p => ({
    'Concepto':       p.concepto?.codigo    || '',
    'Nombre':         p.concepto?.nombre    || '',
    'Precio':         p.precio_unitario     ?? '',
    'Unidad':         p.concepto?.unidad_medida || '',
    'Vigente Desde':  p.fecha_inicio ? formatDate(p.fecha_inicio) : '',
    'Vigente Hasta':  p.fecha_fin    ? formatDate(p.fecha_fin)    : '',
    'Activo':         p.activo ? 'Sí' : 'No',
  }))
  const wsPrecios = XLSX.utils.json_to_sheet(precioRows.length ? precioRows : [{}])
  XLSX.utils.book_append_sheet(wb, wsPrecios, 'Precios')

  // ------------------------------------------------------------------
  // Descargar fichero
  // ------------------------------------------------------------------
  const safeName = (comunidad.nombre || 'comunidad').replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ\s_-]/g, '').trim().replace(/\s+/g, '_')
  const fileName = `${comunidad.codigo}_${safeName}.xlsx`
  XLSX.writeFile(wb, fileName)
  return fileName
}
