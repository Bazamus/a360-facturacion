/**
 * Resoluci?n de Campos Relacionados para Importaci?n
 * Sistema de Facturaci?n A360
 * 
 * Funciones para resolver referencias entre entidades durante la importaci?n
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
 * Limpia el cache de resoluci?n
 */
export function limpiarCache() {
  cache.comunidades.clear()
  cache.agrupaciones.clear()
  cache.ubicaciones.clear()
  cache.conceptos.clear()
}

/**
 * Resuelve una comunidad por su c?digo
 * Realiza b?squeda flexible: primero exacta, luego parcial
 * @param {string} codigo - C?digo de la comunidad (ej: "TROYA40", "TRO40")
 * @returns {Promise<{id: string, nombre: string} | null>}
 */
export async function resolverComunidad(codigo) {
  if (!codigo) return null
  
  const codigoNorm = codigo.toString().trim().toUpperCase()
  
  // Buscar en cache
  if (cache.comunidades.has(codigoNorm)) {
    return cache.comunidades.get(codigoNorm)
  }
  
  // Primero buscar coincidencia exacta
  const { data: exactMatch, error: errorExact } = await supabase
    .from('comunidades')
    .select('id, nombre, codigo')
    .eq('codigo', codigoNorm)
    .maybeSingle()
  
  if (exactMatch) {
    cache.comunidades.set(codigoNorm, exactMatch)
    return exactMatch
  }
  
  // Si no hay coincidencia exacta, buscar coincidencia parcial
  const { data: partialMatches, error: errorPartial } = await supabase
    .from('comunidades')
    .select('id, nombre, codigo')
    .ilike('codigo', `%${codigoNorm}%`)
  
  if (partialMatches && partialMatches.length > 0) {
    const bestMatch = partialMatches[0]
    cache.comunidades.set(codigoNorm, bestMatch)
    return bestMatch
  }
  
  cache.comunidades.set(codigoNorm, null)
  return null
}

/**
 * Busca una agrupaci?n por nombre dentro de una comunidad
 * Realiza b?squeda flexible: primero exacta, luego parcial (para coincidir "3" con "Portal 3")
 * @param {string} comunidadId - ID de la comunidad
 * @param {string} nombre - Nombre de la agrupaci?n (ej: "1", "A", "Portal 1")
 * @returns {Promise<{id: string, nombre: string} | null>}
 */
export async function buscarAgrupacion(comunidadId, nombre) {
  if (!comunidadId || !nombre) return null
  
  const nombreNorm = nombre.toString().trim()
  const cacheKey = `${comunidadId}_${nombreNorm}`
  
  if (cache.agrupaciones.has(cacheKey)) {
    return cache.agrupaciones.get(cacheKey)
  }
  
  // Primero buscar coincidencia exacta
  const { data: exactMatch, error: errorExact } = await supabase
    .from('agrupaciones')
    .select('id, nombre')
    .eq('comunidad_id', comunidadId)
    .eq('nombre', nombreNorm)
    .maybeSingle()
  
  if (exactMatch) {
    cache.agrupaciones.set(cacheKey, exactMatch)
    return exactMatch
  }
  
  // Si no hay coincidencia exacta, buscar coincidencia parcial
  // Esto permite que "3" coincida con "Portal 3" o "Escalera 3"
  const { data: partialMatches, error: errorPartial } = await supabase
    .from('agrupaciones')
    .select('id, nombre')
    .eq('comunidad_id', comunidadId)
    .ilike('nombre', `%${nombreNorm}%`)
  
  if (partialMatches && partialMatches.length > 0) {
    // Preferir coincidencia que termine con el n?mero/texto buscado
    const bestMatch = partialMatches.find(a => 
      a.nombre.endsWith(nombreNorm) || 
      a.nombre.endsWith(` ${nombreNorm}`)
    ) || partialMatches[0]
    
    cache.agrupaciones.set(cacheKey, bestMatch)
    return bestMatch
  }
  
  cache.agrupaciones.set(cacheKey, null)
  return null
}

/**
 * Busca o crea una agrupaci?n
 * @param {string} comunidadId - ID de la comunidad
 * @param {string} nombre - Nombre de la agrupaci?n
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
      console.error('Error al crear agrupaci?n:', error)
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
 * Busca una ubicaci?n por nombre dentro de una agrupaci?n
 * Realiza b?squeda flexible: primero exacta, luego parcial (para coincidir "1?A" con "Vivienda 1?A")
 * @param {string} agrupacionId - ID de la agrupaci?n
 * @param {string} nombre - Nombre de la ubicaci?n (ej: "1?A", "2?B", "Vivienda 1?A")
 * @returns {Promise<{id: string, nombre: string} | null>}
 */
export async function buscarUbicacion(agrupacionId, nombre) {
  if (!agrupacionId || !nombre) return null
  
  const nombreNorm = nombre.toString().trim()
  const cacheKey = `${agrupacionId}_${nombreNorm}`
  
  if (cache.ubicaciones.has(cacheKey)) {
    return cache.ubicaciones.get(cacheKey)
  }
  
  // Primero buscar coincidencia exacta
  const { data: exactMatch, error: errorExact } = await supabase
    .from('ubicaciones')
    .select('id, nombre')
    .eq('agrupacion_id', agrupacionId)
    .eq('nombre', nombreNorm)
    .maybeSingle()
  
  if (exactMatch) {
    cache.ubicaciones.set(cacheKey, exactMatch)
    return exactMatch
  }
  
  // Si no hay coincidencia exacta, buscar coincidencia parcial
  // Esto permite que "1?A" coincida con "Vivienda 1?A"
  const { data: partialMatches, error: errorPartial } = await supabase
    .from('ubicaciones')
    .select('id, nombre')
    .eq('agrupacion_id', agrupacionId)
    .ilike('nombre', `%${nombreNorm}%`)
  
  if (partialMatches && partialMatches.length > 0) {
    // Preferir coincidencia que termine con el nombre buscado
    const bestMatch = partialMatches.find(u => 
      u.nombre.endsWith(nombreNorm) || 
      u.nombre.endsWith(` ${nombreNorm}`)
    ) || partialMatches[0]
    
    cache.ubicaciones.set(cacheKey, bestMatch)
    return bestMatch
  }
  
  cache.ubicaciones.set(cacheKey, null)
  return null
}

/**
 * Busca o crea una ubicaci?n
 * @param {string} agrupacionId - ID de la agrupaci?n
 * @param {string} nombre - Nombre de la ubicaci?n
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
      console.error('Error al crear ubicaci?n:', error)
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
 * Resuelve la ubicaci?n completa desde c?digo de comunidad, nombre de agrupaci?n y ubicaci?n
 * @param {string} comunidadCodigo - C?digo de la comunidad
 * @param {string} agrupacionNombre - Nombre de la agrupaci?n
 * @param {string} ubicacionNombre - Nombre de la ubicaci?n
 * @param {Object} options - Opciones de resoluci?n
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
  
  // Resolver agrupaci?n
  let agrupacion = crearAgrupaciones
    ? await buscarOCrearAgrupacion(comunidad.id, agrupacionNombre, true)
    : await buscarAgrupacion(comunidad.id, agrupacionNombre)
  
  if (!agrupacion) {
    errors.push(`Portal/Bloque "${agrupacionNombre}" no existe en comunidad "${comunidadCodigo}"`)
    return { ubicacionId: null, comunidadId: comunidad.id, agrupacionId: null, errors }
  }
  
  // Resolver ubicaci?n
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
    .maybeSingle()
  
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
    .maybeSingle()
  
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
    .maybeSingle()
  
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
    .maybeSingle()
  
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
