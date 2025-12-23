/**
 * Servicios de Base de Datos para Importación/Exportación
 * Sistema de Facturación A360
 */

import { supabase } from '@/lib/supabase'

/**
 * Obtiene todas las comunidades con datos completos para exportación
 */
export async function getComunidadesParaExport() {
  const { data, error } = await supabase
    .from('comunidades')
    .select('*')
    .order('codigo')
  
  if (error) throw error
  return data || []
}

/**
 * Obtiene todos los clientes con ubicaciones para exportación
 */
export async function getClientesParaExport() {
  const { data, error } = await supabase
    .from('clientes')
    .select(`
      *,
      ubicaciones_clientes(
        es_actual,
        ubicacion:ubicaciones(
          nombre,
          agrupacion:agrupaciones(
            nombre,
            comunidad:comunidades(codigo, nombre)
          )
        )
      )
    `)
    .order('apellidos')
    .order('nombre')
  
  if (error) throw error
  return data || []
}

/**
 * Obtiene todos los contadores con ubicaciones y conceptos asignados para exportación
 */
export async function getContadoresParaExport() {
  const { data, error } = await supabase
    .from('contadores')
    .select(`
      *,
      ubicacion:ubicaciones(
        nombre,
        agrupacion:agrupaciones(
          nombre,
          comunidad:comunidades(codigo, nombre)
        )
      ),
      contadores_conceptos(
        lectura_inicial,
        fecha_lectura_inicial,
        lectura_actual,
        fecha_lectura_actual,
        activo,
        concepto:conceptos(id, codigo, nombre, unidad_medida)
      )
    `)
    .order('numero_serie')
  
  if (error) throw error
  return data || []
}

/**
 * Cuenta registros por entidad
 */
export async function contarRegistros() {
  const [comunidades, clientes, contadores] = await Promise.all([
    supabase.from('comunidades').select('id', { count: 'exact', head: true }),
    supabase.from('clientes').select('id', { count: 'exact', head: true }),
    supabase.from('contadores').select('id', { count: 'exact', head: true })
  ])
  
  return {
    comunidades: comunidades.count || 0,
    clientes: clientes.count || 0,
    contadores: contadores.count || 0
  }
}

/**
 * Verifica la integridad de los datos antes de importar
 */
export async function verificarIntegridad(entidad, filas) {
  const warnings = []
  
  switch (entidad) {
    case 'clientes':
      // Verificar comunidades referenciadas
      const codigosComunidades = [...new Set(
        filas
          .filter(f => f.comunidad_codigo)
          .map(f => f.comunidad_codigo.toString().trim().toUpperCase())
      )]
      
      if (codigosComunidades.length > 0) {
        const { data: comunidadesExistentes } = await supabase
          .from('comunidades')
          .select('codigo')
          .in('codigo', codigosComunidades)
        
        const codigosExistentes = new Set(comunidadesExistentes?.map(c => c.codigo) || [])
        const faltantes = codigosComunidades.filter(c => !codigosExistentes.has(c))
        
        if (faltantes.length > 0) {
          warnings.push(`Comunidades no encontradas: ${faltantes.join(', ')}`)
        }
      }
      break
      
    case 'contadores':
      // Similar verificación para contadores
      const codigosCom = [...new Set(
        filas
          .filter(f => f.comunidad_codigo)
          .map(f => f.comunidad_codigo.toString().trim().toUpperCase())
      )]
      
      if (codigosCom.length > 0) {
        const { data: comunidadesExist } = await supabase
          .from('comunidades')
          .select('codigo')
          .in('codigo', codigosCom)
        
        const codigosExist = new Set(comunidadesExist?.map(c => c.codigo) || [])
        const falt = codigosCom.filter(c => !codigosExist.has(c))
        
        if (falt.length > 0) {
          warnings.push(`Comunidades no encontradas: ${falt.join(', ')}`)
        }
      }
      break
  }
  
  return warnings
}

/**
 * Obtiene todos los datos de una comunidad para exportación completa
 * @param {string} comunidadId - ID de la comunidad
 */
export async function getComunidadCompletaParaExport(comunidadId) {
  // Obtener datos de la comunidad
  const { data: comunidad, error: errComunidad } = await supabase
    .from('comunidades')
    .select('*')
    .eq('id', comunidadId)
    .single()
  
  if (errComunidad) throw errComunidad
  
  // Obtener portales
  const { data: portales, error: errPortales } = await supabase
    .from('agrupaciones')
    .select('id, nombre, descripcion, orden')
    .eq('comunidad_id', comunidadId)
    .eq('activa', true)
    .order('orden')
  
  if (errPortales) throw errPortales
  
  // Obtener viviendas con nombre del portal
  const { data: viviendas, error: errViviendas } = await supabase
    .from('ubicaciones')
    .select(`
      id,
      nombre,
      descripcion,
      referencia_catastral,
      orden,
      agrupacion:agrupaciones(nombre)
    `)
    .in('agrupacion_id', portales?.map(p => p.id) || [])
    .eq('activa', true)
    .order('orden')
  
  if (errViviendas) throw errViviendas
  
  // Transformar viviendas para incluir nombre de portal
  const viviendasConPortal = viviendas?.map(v => ({
    ...v,
    agrupacion_nombre: v.agrupacion?.nombre || ''
  })) || []
  
  // Obtener precios vigentes
  const { data: precios, error: errPrecios } = await supabase
    .from('precios')
    .select(`
      id,
      precio_unitario,
      fecha_inicio,
      concepto:conceptos(codigo, nombre, unidad_medida)
    `)
    .eq('comunidad_id', comunidadId)
    .eq('activo', true)
    .is('fecha_fin', null)
    .order('fecha_inicio', { ascending: false })
  
  if (errPrecios) throw errPrecios
  
  return {
    comunidad,
    portales: portales || [],
    viviendas: viviendasConPortal,
    precios: precios || []
  }
}

export default {
  getComunidadesParaExport,
  getClientesParaExport,
  getContadoresParaExport,
  getComunidadCompletaParaExport,
  contarRegistros,
  verificarIntegridad
}

