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
import { validarDecimalesPrecio, truncarDecimales, getDecimalesPrecio } from '@/utils/precision'

// Expresiones regulares para validación
const REGEX_NIF = /^[0-9]{8}[A-Z]$/i
const REGEX_NIE = /^[XYZ][0-9]{7}[A-Z]$/i
const REGEX_CIF = /^[A-Z][0-9]{7}[A-Z0-9]$/i
const REGEX_CP = /^[0-9]{5}$/

/**
 * Convierte cualquier valor a string y hace trim
 * Útil porque Excel puede enviar números donde esperamos strings
 */
function toStr(valor) {
  if (valor === null || valor === undefined) return ''
  return String(valor).trim()
}

/**
 * Parsea una fecha en formato DD/MM/YYYY a formato ISO
 */
function parseFecha(valor) {
  if (!valor) return null

  // Si ya es un objeto Date
  if (valor instanceof Date) {
    const year = valor.getFullYear()
    const month = String(valor.getMonth() + 1).padStart(2, '0')
    const day = String(valor.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Si es un número (número serial de Excel)
  // Excel cuenta días desde el 1 de enero de 1900 (con un bug del día 29 de febrero de 1900)
  if (typeof valor === 'number' && valor > 0) {
    // Convertir número serial de Excel a fecha
    // Excel usa el día 0 como 1 de enero de 1900
    // Pero hay que restar 1 día por el bug de Excel del año bisiesto 1900
    const excelEpoch = new Date(1899, 11, 30) // 30 de diciembre de 1899
    const date = new Date(excelEpoch.getTime() + valor * 24 * 60 * 60 * 1000)
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
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
      
      // Preparar datos (usar toStr para manejar valores numéricos de Excel)
      const data = {
        codigo: toStr(fila.codigo).toUpperCase(),
        nombre: toStr(fila.nombre),
        cif: toStr(fila.cif) || null,
        direccion: toStr(fila.direccion),
        codigo_postal: toStr(fila.codigo_postal),
        ciudad: toStr(fila.ciudad),
        provincia: toStr(fila.provincia),
        email: toStr(fila.email) || null,
        telefono: toStr(fila.telefono) || null,
        persona_contacto: toStr(fila.persona_contacto) || null,
        nombre_agrupacion: toStr(fila.nombre_agrupacion) || 'Portal',
        nombre_ubicacion: toStr(fila.nombre_ubicacion) || 'Vivienda',
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
      const tipoNorm = toStr(fila.tipo).toLowerCase()
      if (tipoNorm && !['propietario', 'inquilino'].includes(tipoNorm)) {
        erroresRow.push('Tipo debe ser "propietario" o "inquilino"')
      }
      
      if (erroresRow.length > 0) {
        result.errors.push({ fila: rowNum, errores: erroresRow })
        continue
      }
      
      // Preparar datos del cliente (usar toStr para manejar valores numéricos de Excel)
      const clienteData = {
        nif: toStr(fila.nif).toUpperCase(),
        nombre: toStr(fila.nombre),
        apellidos: toStr(fila.apellidos),
        tipo: tipoNorm,
        email: toStr(fila.email) || null,
        telefono: toStr(fila.telefono) || null,
        telefono_secundario: toStr(fila.telefono_secundario) || null,
        iban: toStr(fila.iban).replace(/\s/g, '').toUpperCase() || null,
        titular_cuenta: toStr(fila.titular_cuenta) || null,
        codigo_cliente: toStr(fila.codigo_cliente) || null,
        direccion_correspondencia: toStr(fila.direccion_correspondencia) || null,
        cp_correspondencia: toStr(fila.cp_correspondencia) || null,
        ciudad_correspondencia: toStr(fila.ciudad_correspondencia) || null,
        provincia_correspondencia: toStr(fila.provincia_correspondencia) || null,
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
            .maybeSingle()
          
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
    // NOTA: lecturaValue puede ser 0 (valor válido), por eso no usamos !lecturaValue
    const tieneLetura = lecturaValue !== null && lecturaValue !== undefined && lecturaValue !== ''
    const tieneFecha = fechaValue !== null && fechaValue !== undefined && fechaValue !== ''

    if (tieneLetura && tieneFecha) {
      // Parsear lectura (puede venir con coma o punto, o ser número)
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
      
      // Preparar datos del contador (usar toStr para manejar valores numéricos de Excel)
      const contadorData = {
        numero_serie: toStr(fila.numero_serie),
        ubicacion_id: ubicacionResult.ubicacionId,
        marca: toStr(fila.marca) || null,
        modelo: toStr(fila.modelo) || null,
        fecha_instalacion: parseFecha(fila.fecha_instalacion),
        fecha_ultima_verificacion: parseFecha(fila.fecha_ultima_verificacion),
        observaciones: toStr(fila.observaciones) || null,
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
            .maybeSingle()
          
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

// ============================================================
// PROCESADORES PARA COMUNIDAD COMPLETA
// ============================================================

/**
 * Procesa la importación de portales (agrupaciones)
 * @param {Array} filas - Filas parseadas del Excel
 * @param {string} comunidadId - ID de la comunidad (opcional, si ya existe)
 * @param {Function} onProgress - Callback de progreso
 * @returns {Promise<{created: number, updated: number, errors: Array}>}
 */
export async function procesarPortales(filas, comunidadId = null, onProgress = () => {}) {
  const result = { created: 0, updated: 0, errors: [], total: filas.length }

  // Trackear portales procesados en esta importación para evitar duplicados
  const portalesProcesados = new Set()

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i]
    const rowNum = fila._rowIndex || i + 2
    const erroresRow = []

    try {
      // Validar campos obligatorios
      const codigoComunidad = toStr(fila.comunidad_codigo)
      const nombrePortal = toStr(fila.nombre)

      if (!codigoComunidad) erroresRow.push('Código Comunidad es obligatorio')
      if (!nombrePortal) erroresRow.push('Nombre Portal es obligatorio')

      if (erroresRow.length > 0) {
        result.errors.push({ fila: rowNum, errores: erroresRow })
        continue
      }

      // Resolver comunidad
      let comId = comunidadId
      if (!comId) {
        const comunidad = await resolverComunidad(codigoComunidad)
        if (!comunidad) {
          result.errors.push({ fila: rowNum, errores: [`Comunidad "${codigoComunidad}" no encontrada`] })
          continue
        }
        comId = comunidad.id
      }

      // Verificar duplicados en el archivo actual
      const portalKey = `${comId}_${nombrePortal.toUpperCase()}`
      if (portalesProcesados.has(portalKey)) {
        result.errors.push({
          fila: rowNum,
          errores: [`Portal "${nombrePortal}" ya fue procesado en este archivo (fila duplicada)`]
        })
        continue
      }

      // Preparar datos
      const data = {
        comunidad_id: comId,
        nombre: nombrePortal,
        descripcion: toStr(fila.descripcion) || null,
        orden: parseInt(fila.orden) || 0,
        activa: true
      }

      // Buscar si existe en BD
      const { data: existente } = await supabase
        .from('agrupaciones')
        .select('id')
        .eq('comunidad_id', comId)
        .eq('nombre', nombrePortal)
        .maybeSingle()

      if (existente) {
        // Actualizar
        const { error } = await supabase
          .from('agrupaciones')
          .update(data)
          .eq('id', existente.id)

        if (error) throw error
        result.updated++
      } else {
        // Crear
        const { error } = await supabase
          .from('agrupaciones')
          .insert(data)

        if (error) throw error
        result.created++
      }

      // Marcar como procesado
      portalesProcesados.add(portalKey)

    } catch (error) {
      result.errors.push({
        fila: rowNum,
        errores: [`Error: ${error.message}`]
      })
    }

    onProgress((i + 1) / filas.length, i + 1, filas.length)
  }

  return result
}

/**
 * Procesa la importación de viviendas (ubicaciones)
 * @param {Array} filas - Filas parseadas del Excel
 * @param {string} comunidadId - ID de la comunidad (opcional)
 * @param {Function} onProgress - Callback de progreso
 * @returns {Promise<{created: number, updated: number, errors: Array}>}
 */
export async function procesarViviendas(filas, comunidadId = null, onProgress = () => {}) {
  const result = { created: 0, updated: 0, errors: [], total: filas.length }

  // Cache de agrupaciones para evitar consultas repetidas
  const cacheAgrupaciones = new Map()

  // Trackear viviendas procesadas en esta importación para evitar duplicados
  const viviendasProcesadas = new Set()

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i]
    const rowNum = fila._rowIndex || i + 2
    const erroresRow = []

    try {
      // Validar campos obligatorios
      const codigoComunidad = toStr(fila.comunidad_codigo)
      const portalNombre = toStr(fila.portal_nombre)
      const nombreVivienda = toStr(fila.nombre)

      if (!codigoComunidad) erroresRow.push('Código Comunidad es obligatorio')
      if (!portalNombre) erroresRow.push('Portal es obligatorio')
      if (!nombreVivienda) erroresRow.push('Nombre Vivienda es obligatorio')

      if (erroresRow.length > 0) {
        result.errors.push({ fila: rowNum, errores: erroresRow })
        continue
      }

      // Resolver comunidad
      let comId = comunidadId
      if (!comId) {
        const comunidad = await resolverComunidad(codigoComunidad)
        if (!comunidad) {
          result.errors.push({ fila: rowNum, errores: [`Comunidad "${codigoComunidad}" no encontrada`] })
          continue
        }
        comId = comunidad.id
      }

      // Buscar agrupación (usar cache)
      const cacheKey = `${comId}_${portalNombre}`
      let agrupacionId = cacheAgrupaciones.get(cacheKey)

      if (!agrupacionId) {
        const { data: agrupacion } = await supabase
          .from('agrupaciones')
          .select('id')
          .eq('comunidad_id', comId)
          .eq('nombre', portalNombre)
          .maybeSingle()

        if (!agrupacion) {
          result.errors.push({ fila: rowNum, errores: [`Portal "${portalNombre}" no encontrado en comunidad`] })
          continue
        }
        agrupacionId = agrupacion.id
        cacheAgrupaciones.set(cacheKey, agrupacionId)
      }

      // Verificar duplicados en el archivo actual
      const viviendaKey = `${agrupacionId}_${nombreVivienda.toUpperCase()}`
      if (viviendasProcesadas.has(viviendaKey)) {
        result.errors.push({
          fila: rowNum,
          errores: [`Vivienda "${nombreVivienda}" en portal "${portalNombre}" ya fue procesada en este archivo (fila duplicada)`]
        })
        continue
      }

      // Preparar datos
      const data = {
        agrupacion_id: agrupacionId,
        nombre: nombreVivienda,
        descripcion: toStr(fila.descripcion) || null,
        referencia_catastral: toStr(fila.referencia_catastral) || null,
        orden: parseInt(fila.orden) || 0,
        activa: true
      }

      // Buscar si existe en BD
      const { data: existente } = await supabase
        .from('ubicaciones')
        .select('id')
        .eq('agrupacion_id', agrupacionId)
        .eq('nombre', nombreVivienda)
        .maybeSingle()

      if (existente) {
        // Actualizar
        const { error } = await supabase
          .from('ubicaciones')
          .update(data)
          .eq('id', existente.id)

        if (error) throw error
        result.updated++
      } else {
        // Crear
        const { error } = await supabase
          .from('ubicaciones')
          .insert(data)

        if (error) throw error
        result.created++
      }

      // Marcar como procesado
      viviendasProcesadas.add(viviendaKey)

    } catch (error) {
      result.errors.push({
        fila: rowNum,
        errores: [`Error: ${error.message}`]
      })
    }

    onProgress((i + 1) / filas.length, i + 1, filas.length)
  }

  return result
}

/**
 * Procesa la importación de precios
 * @param {Array} filas - Filas parseadas del Excel
 * @param {string} comunidadId - ID de la comunidad (opcional)
 * @param {Function} onProgress - Callback de progreso
 * @returns {Promise<{created: number, errors: Array}>}
 */
export async function procesarPrecios(filas, comunidadId = null, onProgress = () => {}) {
  const result = { created: 0, errors: [], total: filas.length }
  
  // Cache de conceptos
  const cacheConceptos = new Map()
  
  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i]
    const rowNum = fila._rowIndex || i + 2
    const erroresRow = []
    
    try {
      // Validar campos obligatorios
      const codigoComunidad = toStr(fila.comunidad_codigo)
      const codigoConcepto = toStr(fila.concepto_codigo).toUpperCase()
      let precioUnitario = parseFloat(String(fila.precio_unitario).replace(',', '.'))
      const fechaInicio = parseFecha(fila.fecha_inicio)

      if (!codigoComunidad) erroresRow.push('Código Comunidad es obligatorio')
      if (!codigoConcepto) erroresRow.push('Código Concepto es obligatorio')
      if (isNaN(precioUnitario) || precioUnitario < 0) erroresRow.push('Precio Unitario debe ser un número positivo')
      if (!fechaInicio) erroresRow.push('Fecha Inicio es obligatoria (formato DD/MM/YYYY)')

      // Validar y truncar decimales según concepto
      if (!isNaN(precioUnitario) && precioUnitario >= 0) {
        const validacion = validarDecimalesPrecio(precioUnitario, codigoConcepto)
        if (!validacion.valid) {
          // Truncar automáticamente en lugar de error
          const decimalesPermitidos = getDecimalesPrecio(codigoConcepto)
          const precioOriginal = precioUnitario
          precioUnitario = truncarDecimales(precioUnitario, decimalesPermitidos)

          console.warn(`⚠️ Fila ${rowNum}: Precio ${precioOriginal} truncado a ${precioUnitario} (máx ${decimalesPermitidos} decimales para ${codigoConcepto})`)
        }
      }

      if (erroresRow.length > 0) {
        result.errors.push({ fila: rowNum, errores: erroresRow })
        continue
      }
      
      // Resolver comunidad
      let comId = comunidadId
      if (!comId) {
        const comunidad = await resolverComunidad(codigoComunidad)
        if (!comunidad) {
          result.errors.push({ fila: rowNum, errores: [`Comunidad "${codigoComunidad}" no encontrada`] })
          continue
        }
        comId = comunidad.id
      }
      
      // Buscar concepto (usar cache)
      let conceptoId = cacheConceptos.get(codigoConcepto)
      
      if (!conceptoId) {
        const concepto = await buscarConceptoPorCodigo(codigoConcepto)
        if (!concepto) {
          result.errors.push({ fila: rowNum, errores: [`Concepto "${codigoConcepto}" no encontrado`] })
          continue
        }
        conceptoId = concepto.id
        cacheConceptos.set(codigoConcepto, conceptoId)
      }
      
      // Marcar precio anterior como histórico (si existe)
      await supabase
        .from('precios')
        .update({ fecha_fin: fechaInicio, activo: false })
        .eq('comunidad_id', comId)
        .eq('concepto_id', conceptoId)
        .is('fecha_fin', null)
      
      // Crear nuevo precio
      const { error } = await supabase
        .from('precios')
        .insert({
          comunidad_id: comId,
          concepto_id: conceptoId,
          precio_unitario: precioUnitario,
          fecha_inicio: fechaInicio,
          activo: true
        })
      
      if (error) throw error
      result.created++
      
    } catch (error) {
      result.errors.push({ 
        fila: rowNum, 
        errores: [`Error: ${error.message}`] 
      })
    }
    
    onProgress((i + 1) / filas.length, i + 1, filas.length)
  }
  
  return result
}

/**
 * Procesa la importación de una comunidad completa (multi-hoja)
 * @param {Object} hojas - Objeto con las hojas parseadas
 * @param {Function} onProgress - Callback de progreso general
 * @returns {Promise<Object>} Resultados de cada procesamiento
 */
export async function procesarComunidadCompleta(hojas, onProgress = () => {}) {
  const resultados = {
    comunidad: null,
    portales: null,
    viviendas: null,
    precios: null,
    erroresGlobales: []
  }
  
  limpiarCache()
  
  try {
    // Paso 1: Procesar comunidad (Datos Generales)
    onProgress('comunidad', 0, 'Procesando datos generales...')
    let comunidadId = null
    let codigoComunidad = ''
    
    if (hojas.datosGenerales && hojas.datosGenerales.length > 0) {
      codigoComunidad = toStr(hojas.datosGenerales[0]?.codigo).toUpperCase()
      
      resultados.comunidad = await procesarComunidades(hojas.datosGenerales, (p, c, t) => {
        onProgress('comunidad', p, `Comunidad ${c}/${t}`)
      })
      
      // Intentar obtener ID de comunidad (puede haber fallado la creación pero existir ya en BD)
      const comunidad = await resolverComunidad(codigoComunidad)
      comunidadId = comunidad?.id
      
      // Si hubo errores y no se pudo obtener comunidad, añadir error global
      if (resultados.comunidad.errors.length > 0 && resultados.comunidad.created === 0 && resultados.comunidad.updated === 0) {
        if (!comunidadId) {
          resultados.erroresGlobales.push('Error al crear/actualizar la comunidad. Revise los errores.')
        }
      }
    }
    
    // Paso 2: Procesar portales (incluso si comunidad falló, para mostrar errores de validación)
    onProgress('portales', 0, 'Procesando portales...')
    if (hojas.portales && hojas.portales.length > 0) {
      // Pasar comunidadId si existe, sino null y cada fila validará individualmente
      resultados.portales = await procesarPortales(hojas.portales, comunidadId, (p, c, t) => {
        onProgress('portales', p, `Portal ${c}/${t}`)
      })
    }
    
    // Paso 3: Procesar viviendas
    onProgress('viviendas', 0, 'Procesando viviendas...')
    if (hojas.viviendas && hojas.viviendas.length > 0) {
      resultados.viviendas = await procesarViviendas(hojas.viviendas, comunidadId, (p, c, t) => {
        onProgress('viviendas', p, `Vivienda ${c}/${t}`)
      })
    }
    
    // Paso 4: Procesar precios
    onProgress('precios', 0, 'Procesando precios...')
    if (hojas.precios && hojas.precios.length > 0) {
      resultados.precios = await procesarPrecios(hojas.precios, comunidadId, (p, c, t) => {
        onProgress('precios', p, `Precio ${c}/${t}`)
      })
    }
    
    onProgress('completado', 1, 'Importación completada')
    
  } catch (error) {
    resultados.erroresGlobales.push(`Error general: ${error.message}`)
  }
  
  return resultados
}

export default {
  procesarComunidades,
  procesarClientes,
  procesarContadores,
  procesarPortales,
  procesarViviendas,
  procesarPrecios,
  procesarComunidadCompleta,
  validarFilas
}

