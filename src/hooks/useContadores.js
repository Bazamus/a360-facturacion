import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { applyTokenizedIlikeOr } from '@/utils/supabaseSearch'

const CONTADOR_VISTA_SEARCH_COLUMNS = [
  'numero_serie',
  'ubicacion_nombre',
  'comunidad_nombre',
  'agrupacion_nombre',
  'cliente_nombre',
  'concepto_codigo'
]

// =====================================================
// Hooks para Contadores
// =====================================================

export function useContadores(options = {}) {
  const { search, comunidadId, conceptoId, activo, page = 1, pageSize = 50 } = options

  return useQuery({
    queryKey: ['contadores', { search, comunidadId, conceptoId, activo, page, pageSize }],
    queryFn: async () => {
      // Pre-filtro por comunidad → resolver ubicacion IDs
      let ubicacionIdsFiltro = null
      if (comunidadId) {
        const { data: agrupData, error: errAgrup } = await supabase
          .from('agrupaciones')
          .select('id')
          .eq('comunidad_id', comunidadId)
        if (errAgrup) throw errAgrup

        const agrupIds = agrupData?.map(a => a.id) || []
        if (agrupIds.length === 0) return { data: [], count: 0 }

        const { data: ubicData, error: errUbic } = await supabase
          .from('ubicaciones')
          .select('id')
          .in('agrupacion_id', agrupIds)
        if (errUbic) throw errUbic

        ubicacionIdsFiltro = ubicData?.map(u => u.id) || []
        if (ubicacionIdsFiltro.length === 0) return { data: [], count: 0 }
      }

      // Pre-filtro por concepto → resolver contador IDs
      let contadorIdsFiltro = null
      if (conceptoId) {
        const { data: ccData, error: errCc } = await supabase
          .from('contadores_conceptos')
          .select('contador_id')
          .eq('concepto_id', conceptoId)
          .eq('activo', true)
        if (errCc) throw errCc

        contadorIdsFiltro = [...new Set(ccData?.map(cc => cc.contador_id))]
        if (contadorIdsFiltro.length === 0) return { data: [], count: 0 }
      }

      // Pre-filtro por búsqueda → resolver contador IDs desde la vista (multi-campo)
      let searchContadorIds = null
      if (search) {
        let searchQuery = supabase
          .from('v_contadores_completos')
          .select('contador_id')
        searchQuery = applyTokenizedIlikeOr(searchQuery, search, CONTADOR_VISTA_SEARCH_COLUMNS)
        const { data: searchData, error: searchError } = await searchQuery.range(0, 9999)
        if (searchError) throw searchError

        searchContadorIds = [...new Set(searchData?.map(r => r.contador_id))]
        if (searchContadorIds.length === 0) return { data: [], count: 0 }
      }

      // Query paginada de contadores (solo IDs + count)
      let query = supabase
        .from('contadores')
        .select('id', { count: 'exact' })
        .order('numero_serie')
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (searchContadorIds) {
        query = query.in('id', searchContadorIds)
      }

      if (activo !== undefined) {
        query = query.eq('activo', activo)
      }

      if (ubicacionIdsFiltro) {
        query = query.in('ubicacion_id', ubicacionIdsFiltro)
      }

      if (contadorIdsFiltro) {
        query = query.in('id', contadorIdsFiltro)
      }

      const { data: contadoresPage, count, error } = await query
      if (error) throw error
      if (!contadoresPage?.length) return { data: [], count: count || 0 }

      const contadorIds = contadoresPage.map(c => c.id)

      // Datos completos de la vista para los IDs paginados
      const { data: viewData, error: viewError } = await supabase
        .from('v_contadores_completos')
        .select('*')
        .in('contador_id', contadorIds)
      if (viewError) throw viewError

      // Agrupar conceptos por contador
      const contadoresMap = new Map()
      viewData.forEach(row => {
        if (!contadoresMap.has(row.contador_id)) {
          contadoresMap.set(row.contador_id, {
            id: row.contador_id,
            numero_serie: row.numero_serie,
            marca: row.marca,
            modelo: row.modelo,
            activo: row.contador_activo,
            ubicacion_id: row.ubicacion_id,
            ubicacion_nombre: row.ubicacion_nombre,
            agrupacion_id: row.agrupacion_id,
            agrupacion_nombre: row.agrupacion_nombre,
            comunidad_id: row.comunidad_id,
            comunidad_nombre: row.comunidad_nombre,
            comunidad_codigo: row.comunidad_codigo,
            cliente_id: row.cliente_id,
            cliente_nombre: row.cliente_nombre,
            cliente_codigo: row.cliente_codigo,
            conceptos: []
          })
        }

        if (row.concepto_id) {
          contadoresMap.get(row.contador_id).conceptos.push({
            id: row.concepto_id,
            codigo: row.concepto_codigo,
            nombre: row.concepto_nombre,
            unidad_medida: row.unidad_medida,
            es_termino_fijo: row.es_termino_fijo,
            lectura_inicial: row.lectura_inicial,
            lectura_actual: row.lectura_actual,
            fecha_lectura_actual: row.fecha_lectura_actual,
            precio_unitario: row.precio_unitario
          })
        }
      })

      // Mantener orden de la paginación
      const orderedData = contadorIds
        .map(id => contadoresMap.get(id))
        .filter(Boolean)

      return { data: orderedData, count: count || 0 }
    }
  })
}

function agruparViewRowsPorContador(viewRows, orderedIds) {
  const contadoresMap = new Map()
  viewRows.forEach(row => {
    if (!contadoresMap.has(row.contador_id)) {
      contadoresMap.set(row.contador_id, {
        id: row.contador_id,
        numero_serie: row.numero_serie,
        marca: row.marca,
        modelo: row.modelo,
        activo: row.contador_activo,
        ubicacion_id: row.ubicacion_id,
        ubicacion_nombre: row.ubicacion_nombre,
        agrupacion_id: row.agrupacion_id,
        agrupacion_nombre: row.agrupacion_nombre,
        comunidad_id: row.comunidad_id,
        comunidad_nombre: row.comunidad_nombre,
        comunidad_codigo: row.comunidad_codigo,
        cliente_id: row.cliente_id,
        cliente_nombre: row.cliente_nombre,
        cliente_codigo: row.cliente_codigo,
        conceptos: []
      })
    }

    if (row.concepto_id) {
      contadoresMap.get(row.contador_id).conceptos.push({
        id: row.concepto_id,
        codigo: row.concepto_codigo,
        nombre: row.concepto_nombre,
        unidad_medida: row.unidad_medida,
        es_termino_fijo: row.es_termino_fijo,
        lectura_inicial: row.lectura_inicial,
        lectura_actual: row.lectura_actual,
        fecha_lectura_actual: row.fecha_lectura_actual,
        precio_unitario: row.precio_unitario
      })
    }
  })

  return orderedIds
    .map(id => contadoresMap.get(id))
    .filter(Boolean)
}

/**
 * Obtener TODOS los contadores filtrados (para exportación).
 * Reutiliza el mismo criterio que `useContadores` (vista v_contadores_completos + pre-filtros).
 */
export async function fetchAllContadores(filters = {}) {
  const { search, comunidadId, conceptoId, activo } = filters

  // Pre-filtro por comunidad → resolver ubicacion IDs
  let ubicacionIdsFiltro = null
  if (comunidadId) {
    const { data: agrupData, error: errAgrup } = await supabase
      .from('agrupaciones')
      .select('id')
      .eq('comunidad_id', comunidadId)
    if (errAgrup) throw errAgrup

    const agrupIds = agrupData?.map(a => a.id) || []
    if (agrupIds.length === 0) return []

    const { data: ubicData, error: errUbic } = await supabase
      .from('ubicaciones')
      .select('id')
      .in('agrupacion_id', agrupIds)
    if (errUbic) throw errUbic

    ubicacionIdsFiltro = ubicData?.map(u => u.id) || []
    if (ubicacionIdsFiltro.length === 0) return []
  }

  // Pre-filtro por concepto → resolver contador IDs
  let contadorIdsFiltro = null
  if (conceptoId) {
    const { data: ccData, error: errCc } = await supabase
      .from('contadores_conceptos')
      .select('contador_id')
      .eq('concepto_id', conceptoId)
      .eq('activo', true)
    if (errCc) throw errCc

    contadorIdsFiltro = [...new Set(ccData?.map(cc => cc.contador_id))]
    if (contadorIdsFiltro.length === 0) return []
  }

  // Pre-filtro por búsqueda → resolver contador IDs desde la vista (multi-campo)
  let searchContadorIds = null
  if (search) {
    let searchQuery = supabase
      .from('v_contadores_completos')
      .select('contador_id')
    searchQuery = applyTokenizedIlikeOr(searchQuery, search, CONTADOR_VISTA_SEARCH_COLUMNS)
    const { data: searchData, error: searchError } = await searchQuery.range(0, 9999)
    if (searchError) throw searchError

    searchContadorIds = [...new Set(searchData?.map(r => r.contador_id))]
    if (searchContadorIds.length === 0) return []
  }

  // Obtener IDs de contadores en lotes (para respetar orden y filtros)
  const allIds = []
  let from = 0
  const batchSize = 1000

  while (true) {
    let query = supabase
      .from('contadores')
      .select('id')
      .order('numero_serie')
      .range(from, from + batchSize - 1)

    if (searchContadorIds) query = query.in('id', searchContadorIds)
    if (activo !== undefined) query = query.eq('activo', activo)
    if (ubicacionIdsFiltro) query = query.in('ubicacion_id', ubicacionIdsFiltro)
    if (contadorIdsFiltro) query = query.in('id', contadorIdsFiltro)

    const { data, error } = await query
    if (error) throw error
    if (!data || data.length === 0) break

    allIds.push(...data.map(r => r.id))
    if (data.length < batchSize) break
    from += batchSize
  }

  if (allIds.length === 0) return []

  // Obtener datos completos desde la vista por chunks de IDs
  const viewRows = []
  const idChunkSize = 500
  for (let i = 0; i < allIds.length; i += idChunkSize) {
    const chunk = allIds.slice(i, i + idChunkSize)
    const { data: chunkRows, error: viewError } = await supabase
      .from('v_contadores_completos')
      .select('*')
      .in('contador_id', chunk)
    if (viewError) throw viewError
    viewRows.push(...(chunkRows || []))
  }

  return agruparViewRowsPorContador(viewRows, allIds)
}

// Lista simple de contadores
export function useContadoresSimple(ubicacionId) {
  return useQuery({
    queryKey: ['contadores', 'ubicacion', ubicacionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contadores')
        .select('*')
        .eq('ubicacion_id', ubicacionId)
        .eq('activo', true)
        .order('numero_serie')

      if (error) throw error
      return data
    },
    enabled: !!ubicacionId
  })
}

// Obtener contador por ID
export function useContador(id) {
  return useQuery({
    queryKey: ['contadores', id],
    queryFn: async () => {
      const { data: contador, error } = await supabase
        .from('contadores')
        .select(`
          *,
          ubicacion:ubicaciones(
            id,
            nombre,
            agrupacion:agrupaciones(
              id,
              nombre,
              comunidad:comunidades(id, nombre, codigo)
            )
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      // Obtener conceptos asignados
      const { data: conceptos, error: errorConceptos } = await supabase
        .from('contadores_conceptos')
        .select(`
          *,
          concepto:conceptos(id, codigo, nombre, unidad_medida, es_termino_fijo)
        `)
        .eq('contador_id', id)
        .eq('activo', true)

      if (errorConceptos) throw errorConceptos

      return { ...contador, conceptos }
    },
    enabled: !!id
  })
}

// Crear contador
export function useCreateContador() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase
        .from('contadores')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contadores'] })
      queryClient.invalidateQueries({ queryKey: ['comunidades'] })
    }
  })
}

// Actualizar contador
export function useUpdateContador() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: result, error } = await supabase
        .from('contadores')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['contadores'] })
      queryClient.invalidateQueries({ queryKey: ['contadores', id] })
    }
  })
}

// Desactivar contador
export function useDeleteContador() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('contadores')
        .update({ activo: false })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contadores'] })
      queryClient.invalidateQueries({ queryKey: ['comunidades'] })
    }
  })
}

// Verificar si un contador es eliminable
export function useVerificarContadorEliminable(contadorId) {
  return useQuery({
    queryKey: ['contador-eliminable', contadorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('verificar_contador_eliminable', { p_contador_id: contadorId })
        .single()

      if (error) throw error
      return data
    },
    enabled: !!contadorId
  })
}

// Eliminar contador permanentemente (solo si es seguro)
export function useEliminarContadorPermanente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (contadorId) => {
      const { data, error } = await supabase
        .rpc('eliminar_contador_seguro', { 
          p_contador_id: contadorId
        })
        .single()

      if (error) throw error
      
      if (!data.success) {
        throw new Error(data.message)
      }
      
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contadores'] })
      queryClient.invalidateQueries({ queryKey: ['contador-eliminable'] })
      queryClient.invalidateQueries({ queryKey: ['comunidades'] })
    }
  })
}

// =====================================================
// Hooks para Conceptos de Contador
// =====================================================

export function useAsignarConcepto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data) => {
      // Verificar si ya existe el registro (activo o inactivo)
      const { data: existing } = await supabase
        .from('contadores_conceptos')
        .select('id, activo')
        .eq('contador_id', data.contador_id)
        .eq('concepto_id', data.concepto_id)
        .maybeSingle()

      if (existing) {
        // Ya existe - actualizar con nuevos valores
        const { data: result, error } = await supabase
          .from('contadores_conceptos')
          .update({
            lectura_inicial: data.lectura_inicial || 0,
            lectura_actual: data.lectura_inicial || 0,
            fecha_lectura_inicial: data.fecha_lectura_inicial || new Date().toISOString().split('T')[0],
            fecha_lectura_actual: data.fecha_lectura_inicial || new Date().toISOString().split('T')[0],
            activo: true
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) throw error
        return result
      } else {
        // No existe - insertar nuevo
        const { data: result, error } = await supabase
          .from('contadores_conceptos')
          .insert({
            contador_id: data.contador_id,
            concepto_id: data.concepto_id,
            lectura_inicial: data.lectura_inicial || 0,
            lectura_actual: data.lectura_inicial || 0,
            fecha_lectura_inicial: data.fecha_lectura_inicial || new Date().toISOString().split('T')[0],
            fecha_lectura_actual: data.fecha_lectura_inicial || new Date().toISOString().split('T')[0],
            activo: true
          })
          .select()
          .single()

        if (error) throw error
        return result
      }
    },
    onSuccess: (_, { contador_id }) => {
      queryClient.invalidateQueries({ queryKey: ['contadores'] })
      queryClient.invalidateQueries({ queryKey: ['contadores', contador_id] })
    }
  })
}

export function useDesasignarConcepto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ contadorId, conceptoId }) => {
      const { error } = await supabase
        .from('contadores_conceptos')
        .update({ activo: false })
        .eq('contador_id', contadorId)
        .eq('concepto_id', conceptoId)

      if (error) throw error
    },
    onSuccess: (_, { contadorId }) => {
      queryClient.invalidateQueries({ queryKey: ['contadores'] })
      queryClient.invalidateQueries({ queryKey: ['contadores', contadorId] })
    }
  })
}






