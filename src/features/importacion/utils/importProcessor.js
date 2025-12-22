/**
 * Procesador de Importación de Datos
 * Sistema de Facturación A360
 * 
 * Procesa las filas del Excel y las convierte en operaciones de BD
 */

import { supabase } from '@/lib/supabase'
import {
  resolverComunidad,
  resolverUbicacionCompleta,
  buscarClientePorNif,
  buscarComunidadPorCodigo,
  buscarContadorPorSerie,
  buscarConceptoPorCodigo,
  limpiarCache
} from './fieldResolvers'

// Expresiones regulares para validación
const REGEX_NIF = /^[0-9]{8}[A-Z]$/i
const REGEX_NIE = /^[XYZ][0-9]{7}[A-Z]$/i
const REGEX_CIF = /^[A-Z][0-9]{7}[A-Z0-9]$/i
const REGEX_CP = /^[0-9]{5}$/

/**
 * Parsea una fecha en formato DD/MM/YYYY a formato ISO
 */
function parseFecha(valor) {
  if (!valor) return null
  
  // Si ya es un objeto Date
  if (valor instanceof Date) {
    return valor.toISOString().split('T')[0]
  }
  
  const str = String(valor).trim()
  
  // Formato DD/MM/YYYY o DD-MM-YYYY
  const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (match) {
    const [, day, month, year] = match
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  
  // Formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str
  }
  
  return null
}

/**
 * Valida un NIF/NIE/CIF
 */
function validarNif(nif) {
  if (!nif) return false
  const nifUpper = nif.toString().trim().toUpperCase()
  return REGEX_NIF.test(nifUpper) || REGEX_NIE.test(nifUpper) || REGEX_CIF.test(nifUpper)
}

/**
 * Procesa la importación de comunidades
 * @param {Array} filas - Filas parseadas del Excel
 * @param {Function} onProgress - Callback de progreso
 * @returns {Promise<{created: number, updated: number, errors: Array}>}
 */
export async function procesarComunidades(filas, onProgress = () => {}) {
  const result = { created: 0, updated: 0, errors: [], total: filas.length }
  limpiarCache()
  
  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i]
    const rowNum = fila._rowIndex || i + 2
    const erroresRow = []
    
    try {
      // Validar campos obligatorios
      if (!fila.codigo) erroresRow.push('Código es obligatorio')
      if (!fila.nombre) erroresRow.push('Nombre es obligatorio')
      if (!fila.direccion) erroresRow.push('Dirección es obligatoria')
      if (!fila.codigo_postal) erroresRow.push('Código Postal es obligatorio')
      if (!fila.ciudad) erroresRow.push('Ciudad es obligatoria')
      if (!fila.provincia) erroresRow.push('Provincia es obligatoria')
      
      // Validar formato CP
      if (fila.codigo_postal && !REGEX_CP.test(fila.codigo_postal)) {
        erroresRow.push('Código Postal debe tener 5 dígitos')
      }
      
      if (erroresRow.length > 0) {
        result.errors.push({ fila: rowNum, errores: erroresRow })
        continue
      }
      
      // Preparar datos
      const data = {
        codigo: fila.codigo.toString().trim().toUpperCase(),
        nombre: fila.nombre.trim(),
        cif: fila.cif?.trim() || null,
        direccion: fila.direccion.trim(),
        codigo_postal: fila.codigo_postal.trim(),
        ciudad: fila.ciudad.trim(),
        provincia: fila.provincia.trim(),
        email: fila.email?.trim() || null,
        telefono: fila.telefono?.trim() || null,
        persona_contacto: fila.persona_contacto?.trim() || null,
        nombre_agrupacion: fila.nombre_agrupacion?.trim() || 'Portal',
        nombre_ubicacion: fila.nombre_ubicacion?.trim() || 'Vivienda',
        activa: true
      }
      
      // Verificar si existe
      const existente = await buscarComunidadPorCodigo(data.codigo)
      
      if (existente) {
        // Actualizar
        const { error } = await supabase
          .from('comunidades')
          .update(data)
          .eq('id', existente.id)
        
        if (error) throw error
        result.updated++
      } else {
        // Crear
        const { error } = await supabase
          .from('comunidades')
          .insert(data)
        
        if (error) throw error
        result.created++
      }
      
    } catch (error) {
      result.errors.push({ 
        fila: rowNum, 
        errores: [`Error de base de datos: ${error.message}`] 
      })
    }
    
    onProgress((i + 1) / filas.length, i + 1, filas.length)
  }
  
  return result
}

/**
 * Procesa la importación de clientes
 * @param {Array} filas - Filas parseadas del Excel
 * @param {Function} onProgress - Callback de progreso
 * @returns {Promise<{created: number, updated: number, errors: Array}>}
 */
export async function procesarClientes(filas, onProgress = () => {}) {
  const result = { created: 0, updated: 0, ubicacionesAsignadas: 0, errors: [], total: filas.length }
  limpiarCache()
  
  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i]
    const rowNum = fila._rowIndex || i + 2
    const erroresRow = []
    
    try {
      // Validar campos obligatorios
      if (!fila.nif) erroresRow.push('NIF es obligatorio')
      if (!fila.nombre) erroresRow.push('Nombre es obligatorio')
      if (!fila.apellidos) erroresRow.push('Apellidos es obligatorio')
      if (!fila.tipo) erroresRow.push('Tipo es obligatorio')
      
      // Validar formato NIF
      if (fila.nif && !validarNif(fila.nif)) {
        erroresRow.push('Formato de NIF/NIE/CIF inválido')
      }
      
      // Validar tipo
      const tipoNorm = fila.tipo?.toString().toLowerCase().trim()
      if (tipoNorm && !['propietario', 'inquilino'].includes(tipoNorm)) {
        erroresRow.push('Tipo debe ser "propietario" o "inquilino"')
      }
      
      if (erroresRow.length > 0) {
        result.errors.push({ fila: rowNum, errores: erroresRow })
        continue
      }
      
      // Preparar datos del cliente
      const clienteData = {
        nif: fila.nif.toString().trim().toUpperCase(),
        nombre: fila.nombre.trim(),
        apellidos: fila.apellidos.trim(),
        tipo: tipoNorm,
        email: fila.email?.trim() || null,
        telefono: fila.telefono?.trim() || null,
        telefono_secundario: fila.telefono_secundario?.trim() || null,
        iban: fila.iban?.replace(/\s/g, '').toUpperCase() || null,
        titular_cuenta: fila.titular_cuenta?.trim() || null,
        codigo_cliente: fila.codigo_cliente?.trim() || null,
        direccion_correspondencia: fila.direccion_correspondencia?.trim() || null,
        cp_correspondencia: fila.cp_correspondencia?.trim() || null,
        ciudad_correspondencia: fila.ciudad_correspondencia?.trim() || null,
        provincia_correspondencia: fila.provincia_correspondencia?.trim() || null,
        activo: true
      }
      
      // Verificar si existe el cliente
      const existente = await buscarClientePorNif(clienteData.nif)
      let clienteId
      
      if (existente) {
        // Actualizar
        const { data, error } = await supabase
          .from('clientes')
          .update(clienteData)
          .eq('id', existente.id)
          .select('id')
          .single()
        
        if (error) throw error
        clienteId = existente.id
        result.updated++
      } else {
        // Crear
        const { data, error } = await supabase
          .from('clientes')
          .insert(clienteData)
          .select('id')
          .single()
        
        if (error) throw error
        clienteId = data.id
        result.created++
      }
      
      // Resolver y asignar ubicación si se especificó
      if (fila.comunidad_codigo && fila.agrupacion_nombre && fila.ubicacion_nombre) {
        const ubicacionResult = await resolverUbicacionCompleta(
          fila.comunidad_codigo,
          fila.agrupacion_nombre,
          fila.ubicacion_nombre
        )
        
        if (ubicacionResult.errors.length > 0) {
          result.errors.push({ 
            fila: rowNum, 
            errores: ubicacionResult.errors.map(e => `Ubicación: ${e}`) 
          })
        } else {
          // Verificar si ya tiene esta ubicación asignada
          const { data: asignacionExistente } = await supabase
            .from('ubicaciones_clientes')
            .select('id')
            .eq('cliente_id', clienteId)
            .eq('ubicacion_id', ubicacionResult.ubicacionId)
            .eq('es_actual', true)
            .single()
          
          if (!asignacionExistente) {
            // Asignar ubicación
            const { error: asignError } = await supabase
              .from('ubicaciones_clientes')
              .insert({
                cliente_id: clienteId,
                ubicacion_id: ubicacionResult.ubicacionId,
                fecha_inicio: new Date().toISOString().split('T')[0],
                es_actual: true
              })
            
            if (!asignError) {
              result.ubicacionesAsignadas++
            }
          }
        }
      }
      
    } catch (error) {
      result.errors.push({ 
        fila: rowNum, 
        errores: [`Error de base de datos: ${error.message}`] 
      })
    }
    
    onProgress((i + 1) / filas.length, i + 1, filas.length)
  }
  
  return result
}

/**
 * Detecta conceptos en una fila del Excel
 * Busca campos con patrón {CODIGO}_lectura y {CODIGO}_fecha
 * @param {Object} fila - Fila parseada del Excel
 * @returns {Array<{codigo: string, lectura: number, fecha: string}>}
 */
function detectarConceptosEnFila(fila) {
  const conceptos = []
  const codigosEncontrados = new Set()
  
  // Buscar campos que terminen en _lectura o _fecha
  Object.keys(fila).forEach(key => {
    const keyLower = key.toLowerCase()
    
    if (keyLower.endsWith('_lectura')) {
      const codigo = keyLower.replace('_lectura', '').toUpperCase()
      codigosEncontrados.add(codigo)
    } else if (keyLower.endsWith('_fecha')) {
      const codigo = keyLower.replace('_fecha', '').toUpperCase()
      codigosEncontrados.add(codigo)
    }
  })
  
  // Para cada código encontrado, extraer lectura y fecha
  codigosEncontrados.forEach(codigo => {
    const lecturaKey = `${codigo.toLowerCase()}_lectura`
    const fechaKey = `${codigo.toLowerCase()}_fecha`
    
    const lecturaValue = fila[lecturaKey]
    const fechaValue = fila[fechaKey]
    
    // Solo incluir si tiene AMBOS valores (lectura y fecha)
    if (lecturaValue !== null && lecturaValue !== undefined && lecturaValue !== '' &&
        fechaValue !== null && fechaValue !== undefined && fechaValue !== '') {
      // Parsear lectura (puede venir con coma o punto)
      let lectura = 0
      if (typeof lecturaValue === 'number') {
        lectura = lecturaValue
      } else {
        const lecturaStr = String(lecturaValue).replace(',', '.').trim()
        lectura = parseFloat(lecturaStr) || 0
      }
      
      conceptos.push({
        codigo,
        lectura,
        fecha: parseFecha(fechaValue)
      })
    }
  })
  
  return conceptos
}

/**
 * Procesa la importación de contadores
 * @param {Array} filas - Filas parseadas del Excel
 * @param {Function} onProgress - Callback de progreso
 * @returns {Promise<{created: number, updated: number, conceptosAsignados: number, errors: Array}>}
 */
export async function procesarContadores(filas, onProgress = () => {}) {
  const result = { created: 0, updated: 0, conceptosAsignados: 0, errors: [], total: filas.length }
  limpiarCache()
  
  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i]
    const rowNum = fila._rowIndex || i + 2
    const erroresRow = []
    
    try {
      // Validar campos obligatorios
      if (!fila.numero_serie) erroresRow.push('Nº Serie es obligatorio')
      if (!fila.comunidad_codigo) erroresRow.push('Código Comunidad es obligatorio')
      if (!fila.agrupacion_nombre) erroresRow.push('Portal es obligatorio')
      if (!fila.ubicacion_nombre) erroresRow.push('Vivienda es obligatoria')
      
      if (erroresRow.length > 0) {
        result.errors.push({ fila: rowNum, errores: erroresRow })
        continue
      }
      
      // Resolver ubicación
      const ubicacionResult = await resolverUbicacionCompleta(
        fila.comunidad_codigo,
        fila.agrupacion_nombre,
        fila.ubicacion_nombre
      )
      
      if (ubicacionResult.errors.length > 0) {
        result.errors.push({ fila: rowNum, errores: ubicacionResult.errors })
        continue
      }
      
      // Preparar datos del contador
      const contadorData = {
        numero_serie: fila.numero_serie.toString().trim(),
        ubicacion_id: ubicacionResult.ubicacionId,
        marca: fila.marca?.trim() || null,
        modelo: fila.modelo?.trim() || null,
        fecha_instalacion: parseFecha(fila.fecha_instalacion),
        fecha_ultima_verificacion: parseFecha(fila.fecha_ultima_verificacion),
        observaciones: fila.observaciones?.trim() || null,
        activo: true
      }
      
      // Verificar si existe
      const existente = await buscarContadorPorSerie(contadorData.numero_serie)
      let contadorId
      
      if (existente) {
        // Actualizar
        const { error } = await supabase
          .from('contadores')
          .update(contadorData)
          .eq('id', existente.id)
        
        if (error) throw error
        contadorId = existente.id
        result.updated++
      } else {
        // Crear
        const { data: nuevoContador, error } = await supabase
          .from('contadores')
          .insert(contadorData)
          .select('id')
          .single()
        
        if (error) throw error
        contadorId = nuevoContador.id
        result.created++
      }
      
      // Detectar y procesar conceptos en la fila
      const conceptosEnFila = detectarConceptosEnFila(fila)
      
      for (const conceptoData of conceptosEnFila) {
        try {
          // Resolver el concepto por código
          const concepto = await buscarConceptoPorCodigo(conceptoData.codigo)
          
          if (!concepto) {
            erroresRow.push(`Concepto "${conceptoData.codigo}" no existe`)
            continue
          }
          
          if (!conceptoData.fecha) {
            erroresRow.push(`Fecha inválida para concepto ${conceptoData.codigo}`)
            continue
          }
          
          // Verificar si ya existe la asignación
          const { data: asignacionExistente } = await supabase
            .from('contadores_conceptos')
            .select('id')
            .eq('contador_id', contadorId)
            .eq('concepto_id', concepto.id)
            .single()
          
          if (asignacionExistente) {
            // Actualizar asignación existente
            const { error: updateError } = await supabase
              .from('contadores_conceptos')
              .update({
                lectura_inicial: conceptoData.lectura,
                fecha_lectura_inicial: conceptoData.fecha,
                lectura_actual: conceptoData.lectura,
                fecha_lectura_actual: conceptoData.fecha,
                activo: true
              })
              .eq('id', asignacionExistente.id)
            
            if (updateError) {
              erroresRow.push(`Error actualizando concepto ${conceptoData.codigo}: ${updateError.message}`)
            }
          } else {
            // Crear nueva asignación
            const { error: insertError } = await supabase
              .from('contadores_conceptos')
              .insert({
                contador_id: contadorId,
                concepto_id: concepto.id,
                lectura_inicial: conceptoData.lectura,
                fecha_lectura_inicial: conceptoData.fecha,
                lectura_actual: conceptoData.lectura,
                fecha_lectura_actual: conceptoData.fecha,
                activo: true
              })
            
            if (insertError) {
              erroresRow.push(`Error asignando concepto ${conceptoData.codigo}: ${insertError.message}`)
            } else {
              result.conceptosAsignados++
            }
          }
        } catch (conceptoError) {
          erroresRow.push(`Error procesando concepto ${conceptoData.codigo}: ${conceptoError.message}`)
        }
      }
      
      // Si hubo errores con conceptos pero el contador se procesó, reportar como advertencias
      if (erroresRow.length > 0) {
        result.errors.push({ fila: rowNum, errores: erroresRow })
      }
      
    } catch (error) {
      result.errors.push({ 
        fila: rowNum, 
        errores: [`Error de base de datos: ${error.message}`] 
      })
    }
    
    onProgress((i + 1) / filas.length, i + 1, filas.length)
  }
  
  return result
}

/**
 * Valida las filas antes de procesarlas (sin guardar en BD)
 * @param {string} entidad - Tipo de entidad
 * @param {Array} filas - Filas a validar
 * @returns {Promise<{validas: number, errores: Array}>}
 */
export async function validarFilas(entidad, filas) {
  const errores = []
  let validas = 0
  
  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i]
    const rowNum = fila._rowIndex || i + 2
    const erroresRow = []
    
    switch (entidad) {
      case 'comunidades':
        if (!fila.codigo) erroresRow.push('Código es obligatorio')
        if (!fila.nombre) erroresRow.push('Nombre es obligatorio')
        if (!fila.direccion) erroresRow.push('Dirección es obligatoria')
        if (!fila.codigo_postal) erroresRow.push('Código Postal es obligatorio')
        if (!fila.ciudad) erroresRow.push('Ciudad es obligatoria')
        if (!fila.provincia) erroresRow.push('Provincia es obligatoria')
        break
        
      case 'clientes':
        if (!fila.nif) erroresRow.push('NIF es obligatorio')
        if (!fila.nombre) erroresRow.push('Nombre es obligatorio')
        if (!fila.apellidos) erroresRow.push('Apellidos es obligatorio')
        if (!fila.tipo) erroresRow.push('Tipo es obligatorio')
        if (fila.nif && !validarNif(fila.nif)) {
          erroresRow.push('Formato de NIF inválido')
        }
        break
        
      case 'contadores':
        if (!fila.numero_serie) erroresRow.push('Nº Serie es obligatorio')
        if (!fila.comunidad_codigo) erroresRow.push('Código Comunidad es obligatorio')
        if (!fila.agrupacion_nombre) erroresRow.push('Portal es obligatorio')
        if (!fila.ubicacion_nombre) erroresRow.push('Vivienda es obligatoria')
        break
    }
    
    if (erroresRow.length > 0) {
      errores.push({ fila: rowNum, errores: erroresRow })
    } else {
      validas++
    }
  }
  
  return { validas, errores, total: filas.length }
}

export default {
  procesarComunidades,
  procesarClientes,
  procesarContadores,
  validarFilas
}
