import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// =====================================================
// Hooks para Clientes
// =====================================================

export function useClientes(options = {}) {
  const { search, tipo, activo, comunidadId } = options

  return useQuery({
    queryKey: ['clientes', { search, tipo, activo, comunidadId }],
    queryFn: async () => {
      let query = supabase
        .from('clientes')
        .select(`
          *,
          ubicaciones_clientes!inner(
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

      if (activo !== undefined) {
        query = query.eq('activo', activo)
      }

      const { data, error } = await query

      if (error) throw error

      // Filtrar por comunidad si se especifica
      let result = data
      if (comunidadId) {
        result = data.filter(cliente => 
          cliente.ubicaciones_clientes.some(uc => 
            uc.ubicacion?.agrupacion?.comunidad?.id === comunidadId
          )
        )
      }

      return result
    }
  })
}

// Lista simple de clientes (sin joins pesados)
export function useClientesSimple(options = {}) {
  const { search, activo = true } = options

  return useQuery({
    queryKey: ['clientes-simple', { search, activo }],
    queryFn: async () => {
      let query = supabase
        .from('clientes')
        .select('id, nombre, apellidos, nif, email, tipo, activo')
        .eq('activo', activo)
        .order('apellidos')
        .order('nombre')

      if (search) {
        query = query.or(`nombre.ilike.%${search}%,apellidos.ilike.%${search}%,nif.ilike.%${search}%`)
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

// Bloquear/Desbloquear cliente
export function useToggleBloqueoCliente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, bloqueado, motivo_bloqueo }) => {
      const { data: result, error } = await supabase
        .from('clientes')
        .update({ 
          bloqueado, 
          motivo_bloqueo: bloqueado ? motivo_bloqueo : null 
        })
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






