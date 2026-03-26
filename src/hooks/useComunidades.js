import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { applySearchFilters } from '@/utils/buildSearchFilter'

// =====================================================
// Hooks para Comunidades
// =====================================================

// Listar comunidades
export function useComunidades(options = {}) {
  const { activa, search } = options

  return useQuery({
    queryKey: ['comunidades', { activa, search }],
    queryFn: async () => {
      let query = supabase
        .from('v_comunidades_resumen')
        .select('*')
        .order('nombre')

      if (activa !== undefined) {
        query = query.eq('activa', activa)
      }

      if (search) {
        query = applySearchFilters(query, search, ['nombre', 'codigo'])
      }

      const { data, error } = await query
      if (error) throw error
      return data
    }
  })
}

// Obtener una comunidad por ID
export function useComunidad(id) {
  return useQuery({
    queryKey: ['comunidades', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comunidades')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id
  })
}

// Crear comunidad
export function useCreateComunidad() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase
        .from('comunidades')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comunidades'] })
    }
  })
}

// Actualizar comunidad
export function useUpdateComunidad() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: result, error } = await supabase
        .from('comunidades')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['comunidades'] })
      queryClient.invalidateQueries({ queryKey: ['comunidades', id] })
    }
  })
}

// Eliminar/Desactivar comunidad
export function useDeleteComunidad() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('comunidades')
        .update({ activa: false })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comunidades'] })
    }
  })
}

// =====================================================
// Hooks para Agrupaciones
// =====================================================

export function useAgrupaciones(comunidadId) {
  return useQuery({
    queryKey: ['agrupaciones', comunidadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agrupaciones')
        .select('*')
        .eq('comunidad_id', comunidadId)
        .order('orden', { ascending: true })
        .order('nombre', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!comunidadId
  })
}

export function useCreateAgrupacion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase
        .from('agrupaciones')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (_, { comunidad_id }) => {
      queryClient.invalidateQueries({ queryKey: ['agrupaciones', comunidad_id] })
      queryClient.invalidateQueries({ queryKey: ['comunidades'] })
    }
  })
}

export function useUpdateAgrupacion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: result, error } = await supabase
        .from('agrupaciones')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['agrupaciones', result.comunidad_id] })
    }
  })
}

export function useDeleteAgrupacion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, comunidadId }) => {
      const { error } = await supabase
        .from('agrupaciones')
        .update({ activa: false })
        .eq('id', id)

      if (error) throw error
      return { comunidadId }
    },
    onSuccess: (_, { comunidadId }) => {
      queryClient.invalidateQueries({ queryKey: ['agrupaciones', comunidadId] })
      queryClient.invalidateQueries({ queryKey: ['comunidades'] })
    }
  })
}

// =====================================================
// Hooks para Ubicaciones
// =====================================================

export function useUbicaciones(agrupacionId) {
  return useQuery({
    queryKey: ['ubicaciones', agrupacionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_ubicaciones_completas')
        .select('*')
        .eq('agrupacion_id', agrupacionId)
        .order('ubicacion_nombre')

      if (error) throw error
      return data
    },
    enabled: !!agrupacionId
  })
}

export function useUbicacionesByComunidad(comunidadId) {
  return useQuery({
    queryKey: ['ubicaciones', 'comunidad', comunidadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_ubicaciones_completas')
        .select('*')
        .eq('comunidad_id', comunidadId)
        .order('agrupacion_nombre')
        .order('ubicacion_nombre')

      if (error) throw error
      return data
    },
    enabled: !!comunidadId
  })
}

export function useCreateUbicacion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase
        .from('ubicaciones')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (_, { agrupacion_id }) => {
      queryClient.invalidateQueries({ queryKey: ['ubicaciones'] })
      queryClient.invalidateQueries({ queryKey: ['comunidades'] })
    }
  })
}

export function useUpdateUbicacion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: result, error } = await supabase
        .from('ubicaciones')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ubicaciones'] })
    }
  })
}

export function useDeleteUbicacion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('ubicaciones')
        .update({ activa: false })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ubicaciones'] })
      queryClient.invalidateQueries({ queryKey: ['comunidades'] })
    }
  })
}

// =====================================================
// Hooks para Precios
// =====================================================

export function usePrecios(comunidadId) {
  return useQuery({
    queryKey: ['precios', comunidadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('precios')
        .select(`
          *,
          concepto:conceptos(codigo, nombre, unidad_medida)
        `)
        .eq('comunidad_id', comunidadId)
        .order('concepto_id')
        .order('fecha_inicio', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!comunidadId
  })
}

export function usePreciosVigentes(comunidadId) {
  return useQuery({
    queryKey: ['precios', comunidadId, 'vigentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('precios')
        .select(`
          *,
          concepto:conceptos(codigo, nombre, unidad_medida)
        `)
        .eq('comunidad_id', comunidadId)
        .eq('activo', true)
        .is('fecha_fin', null)
        .order('concepto_id')

      if (error) throw error
      return data
    },
    enabled: !!comunidadId
  })
}

export function useCreatePrecio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data) => {
      // Primero cerramos el precio anterior si existe
      await supabase
        .from('precios')
        .update({ 
          fecha_fin: data.fecha_inicio,
          activo: false 
        })
        .eq('comunidad_id', data.comunidad_id)
        .eq('concepto_id', data.concepto_id)
        .eq('activo', true)
        .is('fecha_fin', null)

      // Creamos el nuevo precio
      const { data: result, error } = await supabase
        .from('precios')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (_, { comunidad_id }) => {
      queryClient.invalidateQueries({ queryKey: ['precios', comunidad_id] })
    }
  })
}






