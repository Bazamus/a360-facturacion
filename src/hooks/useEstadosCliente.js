import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// =====================================================
// Hooks para Estados de Cliente
// =====================================================

export function useEstadosCliente(options = {}) {
  const { activo } = options

  return useQuery({
    queryKey: ['estados-cliente', { activo }],
    queryFn: async () => {
      let query = supabase
        .from('estados_cliente')
        .select('*')
        .order('orden')

      if (activo !== undefined) {
        query = query.eq('activo', activo)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    }
  })
}

export function useEstadoCliente(id) {
  return useQuery({
    queryKey: ['estados-cliente', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estados_cliente')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id
  })
}

export function useCreateEstadoCliente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase
        .from('estados_cliente')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estados-cliente'] })
    }
  })
}

export function useUpdateEstadoCliente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: result, error } = await supabase
        .from('estados_cliente')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['estados-cliente'] })
      queryClient.invalidateQueries({ queryKey: ['estados-cliente', id] })
    }
  })
}
