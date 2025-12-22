/**
 * Resolución de Campos Relacionados para Importación
 * Sistema de Facturación A360
 * 
 * Funciones para resolver referencias entre entidades durante la importación
 */

import { supabase } from '@/lib/supabase'

// Cache para evitar consultas repetidas
const cache = {
  comunidades: new Map(),
  agrupaciones: new Map(),
  ubicaciones: new Map(),
  conceptos: new Map()
}

/**
 * Limpia el cache de resolución
 */
export function limpiarCache() {
  cache.comunidades.clear()
  cache.agrupaciones.clear()
  cache.ubicaciones.clear()
  cache.conceptos.clear()
}

/**
 * Resuelve una comunidad por su código
 * @param {string} codigo - Código de la comunidad (ej: "TROYA40")
 * @returns {Promise<{id: string, nombre: string} | null>}
 */
export async function resolverComunidad(codigo) {
  if (!codigo) return null
  
  const codigoNorm = codigo.toString().trim().toUpperCase()
  
  // Buscar en cache
  if (cache.comunidades.has(codigoNorm)) {
    return cache.comunidades.get(codigoNorm)
  }
  
  const { data, error } = await supabase
    .from('comunidades')
    .select('id, nombre, codigo')
    .eq('codigo', codigoNorm)
    .single()
  
  if (error || !data) {
    cache.comunidades.set(codigoNorm, null)
    return null
  }
  
  cache.comunidades.set(codigoNorm, data)
  return data
}

/**
 * Busca una agrupación por nombre dentro de una comunidad
 * @param {string} comunidadId - ID de la comunidad
 * @param {string} nombre - Nombre de la agrupación (ej: "1", "A")
 * @returns {Promise<{id: string, nombre: string} | null>}
 */
export async function buscarAgrupacion(comunidadId, nombre) {
  if (!comunidadId || !nombre) return null
  
  const nombreNorm = nombre.toString().trim()
  const cacheKey = `${comunidadId}_${nombreNorm}`
  
  if (cache.agrupaciones.has(cacheKey)) {
    return cache.agrupaciones.get(cacheKey)
  }
  
  const { data, error } = await supabase
    .from('agrupaciones')
    .select('id, nombre')
    .eq('comunidad_id', comunidadId)
    .eq('nombre', nombreNorm)
    .single()
  
  if (error || !data) {
    cache.agrupaciones.set(cacheKey, null)
    return null
  }
  
  cache.agrupaciones.set(cacheKey, data)
  return data
}

/**
 * Busca o crea una agrupación
 * @param {string} comunidadId - ID de la comunidad
 * @param {string} nombre - Nombre de la agrupación
 * @param {boolean} crearSiNoExiste - Si crear cuando no existe
 * @returns {Promise<{id: string, nombre: string, created: boolean} | null>}
 */
export async function buscarOCrearAgrupacion(comunidadId, nombre, crearSiNoExiste = false) {
  if (!comunidadId || !nombre) return null
  
  const nombreNorm = nombre.toString().trim()
  
  // Primero buscar
  const existente = await buscarAgrupacion(comunidadId, nombreNorm)
  if (existente) {
    return { ...existente, created: false }
  }
  
  // Crear si se solicita
  if (crearSiNoExiste) {
    const { data, error } = await supabase
      .from('agrupaciones')
      .insert({
        comunidad_id: comunidadId,
        nombre: nombreNorm,
        activa: true
      })
      .select('id, nombre')
      .single()
    
    if (error) {
      console.error('Error al crear agrupación:', error)
      return null
    }
    
    // Actualizar cache
    const cacheKey = `${comunidadId}_${nombreNorm}`
    cache.agrupaciones.set(cacheKey, data)
    
    return { ...data, created: true }
  }
  
  return null
}

/**
 * Busca una ubicación por nombre dentro de una agrupación
 * @param {string} agrupacionId - ID de la agrupación
 * @param {string} nombre - Nombre de la ubicación (ej: "1ºA", "2ºB")
 * @returns {Promise<{id: string, nombre: string} | null>}
 */
export async function buscarUbicacion(agrupacionId, nombre) {
  if (!agrupacionId || !nombre) return null
  
  const nombreNorm = nombre.toString().trim()
  const cacheKey = `${agrupacionId}_${nombreNorm}`
  
  if (cache.ubicaciones.has(cacheKey)) {
    return cache.ubicaciones.get(cacheKey)
  }
  
  const { data, error } = await supabase
    .from('ubicaciones')
    .select('id, nombre')
    .eq('agrupacion_id', agrupacionId)
    .eq('nombre', nombreNorm)
    .single()
  
  if (error || !data) {
    cache.ubicaciones.set(cacheKey, null)
    return null
  }
  
  cache.ubicaciones.set(cacheKey, data)
  return data
}

/**
 * Busca o crea una ubicación
 * @param {string} agrupacionId - ID de la agrupación
 * @param {string} nombre - Nombre de la ubicación
 * @param {boolean} crearSiNoExiste - Si crear cuando no existe
 * @returns {Promise<{id: string, nombre: string, created: boolean} | null>}
 */
export async function buscarOCrearUbicacion(agrupacionId, nombre, crearSiNoExiste = false) {
  if (!agrupacionId || !nombre) return null
  
  const nombreNorm = nombre.toString().trim()
  
  // Primero buscar
  const existente = await buscarUbicacion(agrupacionId, nombreNorm)
  if (existente) {
    return { ...existente, created: false }
  }
  
  // Crear si se solicita
  if (crearSiNoExiste) {
    const { data, error } = await supabase
      .from('ubicaciones')
      .insert({
        agrupacion_id: agrupacionId,
        nombre: nombreNorm,
        activa: true
      })
      .select('id, nombre')
      .single()
    
    if (error) {
      console.error('Error al crear ubicación:', error)
      return null
    }
    
    // Actualizar cache
    const cacheKey = `${agrupacionId}_${nombreNorm}`
    cache.ubicaciones.set(cacheKey, data)
    
    return { ...data, created: true }
  }
  
  return null
}

/**
 * Resuelve la ubicación completa desde código de comunidad, nombre de agrupación y ubicación
 * @param {string} comunidadCodigo - Código de la comunidad
 * @param {string} agrupacionNombre - Nombre de la agrupación
 * @param {string} ubicacionNombre - Nombre de la ubicación
 * @param {Object} options - Opciones de resolución
 * @returns {Promise<{ubicacionId: string, comunidadId: string, agrupacionId: string, errors: string[]}>}
 */
export async function resolverUbicacionCompleta(comunidadCodigo, agrupacionNombre, ubicacionNombre, options = {}) {
  const { crearAgrupaciones = false, crearUbicaciones = false } = options
  const errors = []
  
  // Resolver comunidad
  const comunidad = await resolverComunidad(comunidadCodigo)
  if (!comunidad) {
    errors.push(`Comunidad "${comunidadCodigo}" no encontrada`)
    return { ubicacionId: null, comunidadId: null, agrupacionId: null, errors }
  }
  
  // Resolver agrupación
  let agrupacion = crearAgrupaciones
    ? await buscarOCrearAgrupacion(comunidad.id, agrupacionNombre, true)
    : await buscarAgrupacion(comunidad.id, agrupacionNombre)
  
  if (!agrupacion) {
    errors.push(`Portal/Bloque "${agrupacionNombre}" no existe en comunidad "${comunidadCodigo}"`)
    return { ubicacionId: null, comunidadId: comunidad.id, agrupacionId: null, errors }
  }
  
  // Resolver ubicación
  let ubicacion = crearUbicaciones
    ? await buscarOCrearUbicacion(agrupacion.id, ubicacionNombre, true)
    : await buscarUbicacion(agrupacion.id, ubicacionNombre)
  
  if (!ubicacion) {
    errors.push(`Vivienda "${ubicacionNombre}" no existe en Portal "${agrupacionNombre}" de comunidad "${comunidadCodigo}"`)
    return { ubicacionId: null, comunidadId: comunidad.id, agrupacionId: agrupacion.id, errors }
  }
  
  return {
    ubicacionId: ubicacion.id,
    comunidadId: comunidad.id,
    agrupacionId: agrupacion.id,
    errors: [],
    agrupacionCreada: agrupacion.created,
    ubicacionCreada: ubicacion.created
  }
}

/**
 * Busca un cliente por NIF
 * @param {string} nif - NIF del cliente
 * @returns {Promise<{id: string} | null>}
 */
export async function buscarClientePorNif(nif) {
  if (!nif) return null
  
  const nifNorm = nif.toString().trim().toUpperCase()
  
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre, apellidos, nif')
    .eq('nif', nifNorm)
    .single()
  
  if (error || !data) return null
  return data
}

/**
 * Busca una comunidad por código para verificar si existe
 * @param {string} codigo - Código de la comunidad
 * @returns {Promise<{id: string} | null>}
 */
export async function buscarComunidadPorCodigo(codigo) {
  if (!codigo) return null
  
  const codigoNorm = codigo.toString().trim().toUpperCase()
  
  const { data, error } = await supabase
    .from('comunidades')
    .select('id, codigo, nombre')
    .eq('codigo', codigoNorm)
    .single()
  
  if (error || !data) return null
  return data
}

/**
 * Busca un contador por número de serie
 * @param {string} numeroSerie - Número de serie del contador
 * @returns {Promise<{id: string} | null>}
 */
export async function buscarContadorPorSerie(numeroSerie) {
  if (!numeroSerie) return null
  
  const serieNorm = numeroSerie.toString().trim()
  
  const { data, error } = await supabase
    .from('contadores')
    .select('id, numero_serie')
    .eq('numero_serie', serieNorm)
    .single()
  
  if (error || !data) return null
  return data
}

/**
 * Busca un concepto por código
 * @param {string} codigo - Código del concepto (ej: "ACS", "CAL", "CLI")
 * @returns {Promise<{id: string, codigo: string, nombre: string, unidad_medida: string} | null>}
 */
export async function buscarConceptoPorCodigo(codigo) {
  if (!codigo) return null
  
  const codigoNorm = codigo.toString().trim().toUpperCase()
  
  // Buscar en cache
  if (cache.conceptos.has(codigoNorm)) {
    return cache.conceptos.get(codigoNorm)
  }
  
  const { data, error } = await supabase
    .from('conceptos')
    .select('id, codigo, nombre, unidad_medida')
    .eq('codigo', codigoNorm)
    .single()
  
  if (error || !data) {
    cache.conceptos.set(codigoNorm, null)
    return null
  }
  
  cache.conceptos.set(codigoNorm, data)
  return data
}

/**
 * Obtiene todos los conceptos activos
 * @returns {Promise<Array<{id: string, codigo: string, nombre: string, unidad_medida: string}>>}
 */
export async function obtenerConceptosActivos() {
  const { data, error } = await supabase
    .from('conceptos')
    .select('id, codigo, nombre, unidad_medida')
    .eq('activo', true)
    .order('orden')
  
  if (error || !data) return []
  
  // Poblar cache
  data.forEach(concepto => {
    cache.conceptos.set(concepto.codigo, concepto)
  })
  
  return data
}

export default {
  limpiarCache,
  resolverComunidad,
  buscarAgrupacion,
  buscarOCrearAgrupacion,
  buscarUbicacion,
  buscarOCrearUbicacion,
  resolverUbicacionCompleta,
  buscarClientePorNif,
  buscarComunidadPorCodigo,
  buscarContadorPorSerie,
  buscarConceptoPorCodigo,
  obtenerConceptosActivos
}
