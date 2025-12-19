/**
 * Servicios de datos para el sistema de importación de lecturas
 * Sistema de Facturación A360
 */

import { supabase } from '@/lib/supabase'

/**
 * Obtiene todos los conceptos activos
 */
export async function getConceptosActivos() {
  const { data, error } = await supabase
    .from('conceptos')
    .select('id, codigo, nombre, unidad_medida, es_termino_fijo')
    .eq('activo', true)
    .order('orden', { ascending: true })
  
  if (error) {
    console.error('Error al obtener conceptos:', error)
    throw error
  }
  
  return data || []
}

/**
 * Busca un contador por número de serie
 */
export async function findContadorByNumeroSerie(numeroSerie) {
  if (!numeroSerie) return null
  
  const { data, error } = await supabase
    .from('contadores')
    .select('id, numero_serie, ubicacion_id, activo')
    .eq('numero_serie', String(numeroSerie).trim())
    .eq('activo', true)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null // No encontrado
    console.error('Error al buscar contador:', error)
    return null
  }
  
  return data
}

/**
 * Obtiene información de una ubicación (incluyendo comunidad)
 */
export async function getUbicacionInfo(ubicacionId) {
  if (!ubicacionId) return null
  
  const { data, error } = await supabase
    .from('ubicaciones')
    .select(`
      id,
      nombre,
      agrupacion_id,
      agrupaciones!inner (
        id,
        nombre,
        comunidad_id,
        comunidades!inner (
          id,
          nombre,
          codigo
        )
      )
    `)
    .eq('id', ubicacionId)
    .single()
  
  if (error) {
    console.error('Error al obtener ubicación:', error)
    return null
  }
  
  return {
    id: data.id,
    nombre: data.nombre,
    agrupacion_id: data.agrupacion_id,
    agrupacion_nombre: data.agrupaciones?.nombre,
    comunidad_id: data.agrupaciones?.comunidad_id,
    comunidad_nombre: data.agrupaciones?.comunidades?.nombre
  }
}

/**
 * Verifica si un contador tiene asignado un concepto
 */
export async function findContadorConcepto(contadorId, conceptoId) {
  if (!contadorId || !conceptoId) return null
  
  const { data, error } = await supabase
    .from('contadores_conceptos')
    .select('id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual')
    .eq('contador_id', contadorId)
    .eq('concepto_id', conceptoId)
    .eq('activo', true)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null // No encontrado
    console.error('Error al buscar contador_concepto:', error)
    return null
  }
  
  return data
}

/**
 * Obtiene el cliente actual de una ubicación
 */
export async function getClienteActualUbicacion(ubicacionId) {
  if (!ubicacionId) return null
  
  const { data, error } = await supabase
    .from('ubicaciones_clientes')
    .select(`
      id,
      fecha_inicio,
      clientes!inner (
        id,
        nombre,
        apellidos,
        nif,
        email,
        telefono,
        bloqueado,
        motivo_bloqueo
      )
    `)
    .eq('ubicacion_id', ubicacionId)
    .eq('es_actual', true)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null // No hay cliente asignado
    console.error('Error al obtener cliente actual:', error)
    return null
  }
  
  return {
    id: data.clientes.id,
    nombre: data.clientes.nombre,
    apellidos: data.clientes.apellidos,
    nif: data.clientes.nif,
    email: data.clientes.email,
    telefono: data.clientes.telefono,
    bloqueado: data.clientes.bloqueado,
    motivo_bloqueo: data.clientes.motivo_bloqueo,
    fecha_inicio: data.fecha_inicio
  }
}

/**
 * Obtiene la última lectura de un contador/concepto
 */
export async function getUltimaLectura(contadorId, conceptoId) {
  if (!contadorId || !conceptoId) return null
  
  const { data, error } = await supabase
    .from('lecturas')
    .select('id, lectura_valor, fecha_lectura')
    .eq('contador_id', contadorId)
    .eq('concepto_id', conceptoId)
    .order('fecha_lectura', { ascending: false })
    .limit(1)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null // No hay lecturas previas
    console.error('Error al obtener última lectura:', error)
    return null
  }
  
  return data
}

/**
 * Obtiene el precio vigente de un concepto para una comunidad
 */
export async function getPrecioVigente(comunidadId, conceptoId) {
  if (!comunidadId || !conceptoId) return null
  
  const { data, error } = await supabase
    .from('precios')
    .select('id, precio_unitario, fecha_inicio, fecha_fin')
    .eq('comunidad_id', comunidadId)
    .eq('concepto_id', conceptoId)
    .eq('activo', true)
    .is('fecha_fin', null)
    .order('fecha_inicio', { ascending: false })
    .limit(1)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null // No hay precio
    console.error('Error al obtener precio:', error)
    return null
  }
  
  return data
}

/**
 * Obtiene la configuración de alertas
 */
export async function getAlertasConfig() {
  const { data, error } = await supabase
    .from('alertas_configuracion')
    .select('*')
    .eq('activa', true)
  
  if (error) {
    console.error('Error al obtener configuración de alertas:', error)
    return []
  }
  
  return data || []
}

/**
 * Obtiene las comunidades activas
 */
export async function getComunidadesActivas() {
  const { data, error } = await supabase
    .from('comunidades')
    .select('id, nombre, codigo')
    .eq('activa', true)
    .order('nombre', { ascending: true })
  
  if (error) {
    console.error('Error al obtener comunidades:', error)
    throw error
  }
  
  return data || []
}

/**
 * Crea un registro de importación
 */
export async function createImportacion({
  comunidadId,
  nombreArchivo,
  totalContadores,
  totalLecturas,
  usuarioId
}) {
  const { data, error } = await supabase
    .from('importaciones')
    .insert({
      comunidad_id: comunidadId,
      nombre_archivo: nombreArchivo,
      total_filas: totalContadores,
      estado: 'procesando',
      usuario_id: usuarioId
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error al crear importación:', error)
    throw error
  }
  
  return data
}

/**
 * Actualiza un registro de importación
 */
export async function updateImportacion(importacionId, updates) {
  const { data, error } = await supabase
    .from('importaciones')
    .update(updates)
    .eq('id', importacionId)
    .select()
    .single()
  
  if (error) {
    console.error('Error al actualizar importación:', error)
    throw error
  }
  
  return data
}

/**
 * Guarda un registro de detalle de importación
 */
export async function saveImportacionDetalle(importacionId, registro) {
  const { data, error } = await supabase
    .from('importaciones_detalle')
    .insert({
      importacion_id: importacionId,
      fila_numero: registro.fila_numero,
      datos_originales: registro.datos_originales,
      numero_contador: registro.numero_contador,
      concepto_codigo: registro.concepto_codigo,
      lectura_valor: registro.lectura_valor,
      fecha_lectura: registro.fecha_lectura,
      contador_id: registro.contador_id,
      concepto_id: registro.concepto_id,
      ubicacion_id: registro.ubicacion_id,
      cliente_id: registro.cliente_id,
      comunidad_id: registro.comunidad_id,
      lectura_anterior: registro.lectura_anterior,
      fecha_lectura_anterior: registro.fecha_lectura_anterior,
      consumo_calculado: registro.consumo_calculado,
      precio_unitario: registro.precio_unitario,
      importe_estimado: registro.importe_estimado,
      estado: registro.estado,
      alertas: registro.alertas,
      error_mensaje: registro.error_mensaje
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error al guardar detalle:', error)
    throw error
  }
  
  return data
}

/**
 * Guarda múltiples registros de detalle en batch
 */
export async function saveImportacionDetallesBatch(importacionId, registros) {
  const detalles = registros.map(registro => ({
    importacion_id: importacionId,
    fila_numero: registro.fila_numero,
    datos_originales: registro.datos_originales,
    numero_contador: registro.numero_contador,
    concepto_codigo: registro.concepto_codigo,
    lectura_valor: registro.lectura_valor,
    fecha_lectura: registro.fecha_lectura,
    contador_id: registro.contador_id,
    concepto_id: registro.concepto_id,
    ubicacion_id: registro.ubicacion_id,
    cliente_id: registro.cliente_id,
    comunidad_id: registro.comunidad_id,
    lectura_anterior: registro.lectura_anterior,
    fecha_lectura_anterior: registro.fecha_lectura_anterior,
    consumo_calculado: registro.consumo_calculado,
    precio_unitario: registro.precio_unitario,
    importe_estimado: registro.importe_estimado,
    estado: registro.estado,
    alertas: registro.alertas,
    error_mensaje: registro.error_mensaje
  }))
  
  const { data, error } = await supabase
    .from('importaciones_detalle')
    .insert(detalles)
    .select()
  
  if (error) {
    console.error('Error al guardar detalles en batch:', error)
    throw error
  }
  
  return data
}

/**
 * Obtiene los detalles de una importación
 */
export async function getImportacionDetalles(importacionId) {
  const { data, error } = await supabase
    .from('importaciones_detalle')
    .select('*')
    .eq('importacion_id', importacionId)
    .order('fila_numero', { ascending: true })
  
  if (error) {
    console.error('Error al obtener detalles:', error)
    throw error
  }
  
  return data || []
}

/**
 * Obtiene una importación por ID
 */
export async function getImportacion(importacionId) {
  const { data, error } = await supabase
    .from('importaciones')
    .select(`
      *,
      comunidades (
        id,
        nombre,
        codigo
      )
    `)
    .eq('id', importacionId)
    .single()
  
  if (error) {
    console.error('Error al obtener importación:', error)
    throw error
  }
  
  return data
}

/**
 * Obtiene el historial de importaciones
 */
export async function getImportaciones(filtros = {}) {
  let query = supabase
    .from('importaciones')
    .select(`
      *,
      comunidades (
        id,
        nombre,
        codigo
      )
    `)
    .order('fecha_subida', { ascending: false })
  
  if (filtros.comunidadId) {
    query = query.eq('comunidad_id', filtros.comunidadId)
  }
  
  if (filtros.estado) {
    query = query.eq('estado', filtros.estado)
  }
  
  if (filtros.limit) {
    query = query.limit(filtros.limit)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error al obtener importaciones:', error)
    throw error
  }
  
  return data || []
}

/**
 * Confirma las lecturas de una importación
 */
export async function confirmarImportacion(importacionId, usuarioId) {
  const { data, error } = await supabase
    .rpc('confirmar_importacion', {
      p_importacion_id: importacionId,
      p_usuario_id: usuarioId
    })
  
  if (error) {
    console.error('Error al confirmar importación:', error)
    throw error
  }
  
  return data // Retorna el número de lecturas confirmadas
}

/**
 * Actualiza un registro de detalle (para correcciones manuales)
 */
export async function updateImportacionDetalle(detalleId, updates) {
  const { data, error } = await supabase
    .from('importaciones_detalle')
    .update(updates)
    .eq('id', detalleId)
    .select()
    .single()
  
  if (error) {
    console.error('Error al actualizar detalle:', error)
    throw error
  }
  
  return data
}

/**
 * Descarta registros de detalle seleccionados
 */
export async function descartarDetalles(detalleIds) {
  const { data, error } = await supabase
    .from('importaciones_detalle')
    .update({ estado: 'descartado' })
    .in('id', detalleIds)
    .select()
  
  if (error) {
    console.error('Error al descartar detalles:', error)
    throw error
  }
  
  return data
}

/**
 * Crea el objeto de servicios para el procesador
 */
export function createDataServices() {
  return {
    findContadorByNumeroSerie,
    getUbicacionInfo,
    findContadorConcepto,
    getClienteActualUbicacion,
    getUltimaLectura,
    getPrecioVigente,
    getAlertasConfig
  }
}
