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

export default {
  getComunidadesParaExport,
  getClientesParaExport,
  getContadoresParaExport,
  contarRegistros,
  verificarIntegridad
}
