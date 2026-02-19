import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// =====================================================
// Hooks para Clientes
// =====================================================

export function useClientes(options = {}) {
  const { search, tipo, estadoId, comunidadId } = options

  return useQuery({
    queryKey: ['clientes', { search, tipo, estadoId, comunidadId }],
    queryFn: async () => {
      let query = supabase
        .from('clientes')
        .select(`
          *,
          estado:estados_cliente(*),
          ubicaciones_clientes(
            ubicacion_id,
            es_actual,
            ubicacion:ubicaciones(
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

      if (search) {
        query = query.or(`nombre.ilike.%${search}%,apellidos.ilike.%${search}%,nif.ilike.%${search}%,codigo_cliente.ilike.%${search}%`)
      }

      if (tipo) {
        query = query.eq('tipo', tipo)
      }

      if (estadoId) {
        query = query.eq('estado_id', estadoId)
      }

      // Filtrado server-side por comunidad (evita el límite de 1000 filas de Supabase)
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

        const clienteIds = [...new Set(ucData?.map(uc => uc.cliente_id).filter(Boolean))]
        if (clienteIds.length === 0) return []

        query = query.in('id', clienteIds)
      }

      const { data, error } = await query

      if (error) throw error

      return data
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






