import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// =====================================================
// Hooks para Clientes
// =====================================================

export function useClientes(options = {}) {
  const { search, tipo, estadoId, comunidadId, page = 1, pageSize = 50 } = options

  return useQuery({
    queryKey: ['clientes', { search, tipo, estadoId, comunidadId, page, pageSize }],
    queryFn: async () => {
      // Filtrado server-side por comunidad — obtener IDs de clientes vinculados
      let clienteIdsFiltro = null
      if (comunidadId) {
        const { data: agrupData, error: errAgrup } = await supabase
          .from('agrupaciones')
          .select('id')
          .eq('comunidad_id', comunidadId)

        if (errAgrup) throw errAgrup

        const agrupacionIds = agrupData?.map(a => a.id) || []
        if (agrupacionIds.length === 0) return { data: [], count: 0 }

        const { data: ubicData, error: errUbic } = await supabase
          .from('ubicaciones')
          .select('id')
          .in('agrupacion_id', agrupacionIds)

        if (errUbic) throw errUbic

        const ubicacionIds = ubicData?.map(u => u.id) || []
        if (ubicacionIds.length === 0) return { data: [], count: 0 }

        const { data: ucData, error: errUc } = await supabase
          .from('ubicaciones_clientes')
          .select('cliente_id')
          .in('ubicacion_id', ubicacionIds)

        if (errUc) throw errUc

        clienteIdsFiltro = [...new Set(ucData?.map(uc => uc.cliente_id).filter(Boolean))]
        if (clienteIdsFiltro.length === 0) return { data: [], count: 0 }
      }

      // Query principal con paginación server-side
      let query = supabase
        .from('clientes')
        .select(`
          *,
          estado:estados_cliente(*),
          ubicaciones_clientes(
            ubicacion_id,
            es_actual,
            ubicacion:ubicaciones(
              id,
              nombre,
              agrupacion:agrupaciones(
                nombre,
                comunidad:comunidades(id, nombre, codigo)
              )
            )
          )
        `, { count: 'exact' })
        .order('apellidos')
        .order('nombre')
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (search) {
        query = query.or(`nombre.ilike.%${search}%,apellidos.ilike.%${search}%,nif.ilike.%${search}%,codigo_cliente.ilike.%${search}%,email.ilike.%${search}%`)
      }

      if (tipo) {
        query = query.eq('tipo', tipo)
      }

      if (estadoId) {
        query = query.eq('estado_id', estadoId)
      }

      if (clienteIdsFiltro) {
        query = query.in('id', clienteIdsFiltro)
      }

      const { data, error, count } = await query

      if (error) throw error

      // Obtener nº contador para las ubicaciones actuales de estos clientes
      if (data?.length > 0) {
        const ubicacionIds = data
          .flatMap(c => c.ubicaciones_clientes?.filter(uc => uc.es_actual).map(uc => uc.ubicacion_id) || [])
          .filter(Boolean)

        if (ubicacionIds.length > 0) {
          const { data: contadores } = await supabase
            .from('contadores')
            .select('id, numero_serie, ubicacion_id')
            .in('ubicacion_id', ubicacionIds)
            .eq('activo', true)

          if (contadores?.length > 0) {
            const contadorMap = {}
            contadores.forEach(c => {
              if (!contadorMap[c.ubicacion_id]) {
                contadorMap[c.ubicacion_id] = c.numero_serie
              }
            })

            data.forEach(cliente => {
              const ubicActual = cliente.ubicaciones_clientes?.find(uc => uc.es_actual)
              cliente.numero_contador = ubicActual ? contadorMap[ubicActual.ubicacion_id] || null : null
            })
          }
        }
      }

      return { data: data || [], count: count || 0 }
    }
  })
}

// Lista simple de clientes (sin joins pesados)
export function useClientesSimple(options = {}) {
  const { search, estadoId } = options

  return useQuery({
    queryKey: ['clientes-simple', { search, estadoId }],
    queryFn: async () => {
      let query = supabase
        .from('clientes')
        .select('id, nombre, apellidos, nif, email, tipo, estado_id, estado:estados_cliente(*)')
        .order('apellidos')
        .order('nombre')

      if (search) {
        query = query.or(`nombre.ilike.%${search}%,apellidos.ilike.%${search}%,nif.ilike.%${search}%`)
      }

      if (estadoId) {
        query = query.eq('estado_id', estadoId)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    }
  })
}

// Obtener un cliente por ID
export function useCliente(id) {
  return useQuery({
    queryKey: ['clientes', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select(`
          *,
          estado:estados_cliente(*),
          ubicaciones_clientes(
            id,
            fecha_inicio,
            fecha_fin,
            es_actual,
            ubicacion:ubicaciones(
              id,
              nombre,
              agrupacion:agrupaciones(
                id,
                nombre,
                comunidad:comunidades(id, nombre, codigo)
              )
            )
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id
  })
}

// Crear cliente
// Helper para sanitizar datos del cliente
// Convierte cadenas vacías en null para campos opcionales
function sanitizeClienteData(data) {
  const optionalFields = [
    'codigo_cliente',
    'email',
    'telefono',
    'telefono_secundario',
    'direccion_correspondencia',
    'cp_correspondencia',
    'ciudad_correspondencia',
    'provincia_correspondencia',
    'iban',
    'titular_cuenta',
    'observaciones'
  ]

  const sanitized = { ...data }
  
  optionalFields.forEach(field => {
    if (sanitized[field] === '' || sanitized[field] === undefined) {
      sanitized[field] = null
    }
  })

  return sanitized
}

export function useCreateCliente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data) => {
      // Sanitizar datos antes de insertar
      const sanitizedData = sanitizeClienteData(data)
      
      const { data: result, error } = await supabase
        .from('clientes')
        .insert(sanitizedData)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
    }
  })
}

// Actualizar cliente
export function useUpdateCliente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      // Sanitizar datos antes de actualizar
      const sanitizedData = sanitizeClienteData(data)
      
      const { data: result, error } = await supabase
        .from('clientes')
        .update(sanitizedData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      queryClient.invalidateQueries({ queryKey: ['clientes', id] })
    }
  })
}

// Asignar cliente a ubicación
export function useAsignarClienteUbicacion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase
        .from('ubicaciones_clientes')
        .insert({
          ...data,
          es_actual: true
        })
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (_, { cliente_id }) => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      queryClient.invalidateQueries({ queryKey: ['clientes', cliente_id] })
      queryClient.invalidateQueries({ queryKey: ['ubicaciones'] })
    }
  })
}

// Obtener TODOS los clientes en lotes (para exportación)
export async function fetchAllClientes(filters = {}) {
  const { search, tipo, estadoId, comunidadId } = filters
  const all = []
  let from = 0
  const batchSize = 1000

  // Pre-filtrar por comunidad (mismo patrón que useClientes)
  let clienteIdsFiltro = null
  if (comunidadId) {
    const { data: agrupData, error: errAgrup } = await supabase
      .from('agrupaciones')
      .select('id')
      .eq('comunidad_id', comunidadId)

    if (errAgrup) throw errAgrup

    const agrupacionIds = agrupData?.map(a => a.id) || []
    if (agrupacionIds.length === 0) return []

    const { data: ubicData, error: errUbic } = await supabase
      .from('ubicaciones')
      .select('id')
      .in('agrupacion_id', agrupacionIds)

    if (errUbic) throw errUbic

    const ubicacionIds = ubicData?.map(u => u.id) || []
    if (ubicacionIds.length === 0) return []

    const { data: ucData, error: errUc } = await supabase
      .from('ubicaciones_clientes')
      .select('cliente_id')
      .in('ubicacion_id', ubicacionIds)

    if (errUc) throw errUc

    clienteIdsFiltro = [...new Set(ucData?.map(uc => uc.cliente_id).filter(Boolean))]
    if (clienteIdsFiltro.length === 0) return []
  }

  while (true) {
    let query = supabase
      .from('clientes')
      .select(`
        *,
        estado:estados_cliente(*),
        ubicaciones_clientes(
          ubicacion_id,
          es_actual,
          ubicacion:ubicaciones(
            id,
            nombre,
            agrupacion:agrupaciones(
              nombre,
              comunidad:comunidades(id, nombre, codigo)
            )
          )
        )
      `)
      .order('apellidos')
      .order('nombre')
      .range(from, from + batchSize - 1)

    if (search) {
      query = query.or(`nombre.ilike.%${search}%,apellidos.ilike.%${search}%,nif.ilike.%${search}%,codigo_cliente.ilike.%${search}%,email.ilike.%${search}%`)
    }
    if (tipo) query = query.eq('tipo', tipo)
    if (estadoId) query = query.eq('estado_id', estadoId)
    if (clienteIdsFiltro) query = query.in('id', clienteIdsFiltro)

    const { data, error } = await query
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < batchSize) break
    from += batchSize
  }

  return all
}

// Finalizar ocupación de cliente
export function useFinalizarOcupacion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, fecha_fin }) => {
      const { data: result, error } = await supabase
        .from('ubicaciones_clientes')
        .update({ 
          es_actual: false, 
          fecha_fin 
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      queryClient.invalidateQueries({ queryKey: ['ubicaciones'] })
    }
  })
}






