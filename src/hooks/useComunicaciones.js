import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useComunicaciones({ canal, estado, clienteId, limit = 50 } = {}) {
  return useQuery({
    queryKey: ['comunicaciones', { canal, estado, clienteId, limit }],
    queryFn: async () => {
      let query = supabase
        .from('v_comunicaciones_resumen')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (canal) query = query.eq('canal', canal)
      if (estado) query = query.eq('estado', estado)
      if (clienteId) query = query.eq('cliente_id', clienteId)

      const { data, error } = await query
      if (error) throw error
      return data
    },
    refetchInterval: 30000,
  })
}

export function useComunicacionesStats(fechaInicio, fechaFin) {
  return useQuery({
    queryKey: ['comunicaciones-stats', fechaInicio, fechaFin],
    queryFn: async () => {
      const params = {}
      if (fechaInicio) params.p_fecha_inicio = fechaInicio
      if (fechaFin) params.p_fecha_fin = fechaFin

      const { data, error } = await supabase.rpc('get_comunicaciones_stats', params)
      if (error) throw error
      return data
    },
    refetchInterval: 60000,
  })
}

export function useRegistrarComunicacion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (comunicacion) => {
      const { data, error } = await supabase
        .from('comunicaciones')
        .insert(comunicacion)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comunicaciones'] })
      queryClient.invalidateQueries({ queryKey: ['comunicaciones-stats'] })
    }
  })
}

export function usePlantillas(canal) {
  return useQuery({
    queryKey: ['plantillas-mensaje', canal],
    queryFn: async () => {
      let query = supabase
        .from('plantillas_mensaje')
        .select('*')
        .eq('activa', true)
        .order('categoria')

      if (canal && canal !== 'todos') {
        query = query.or(`canal.eq.${canal},canal.eq.todos`)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    }
  })
}

export function useCreatePlantilla() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (plantilla) => {
      const { data, error } = await supabase
        .from('plantillas_mensaje')
        .insert(plantilla)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantillas-mensaje'] })
    }
  })
}

export function useUpdatePlantilla() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('plantillas_mensaje')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantillas-mensaje'] })
    }
  })
}

export function useCanalesConfig() {
  return useQuery({
    queryKey: ['canales-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canales_configuracion')
        .select('*')
        .order('canal')
      if (error) throw error
      return data
    }
  })
}

export function useUpdateCanalConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('canales_configuracion')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canales-config'] })
    }
  })
}
