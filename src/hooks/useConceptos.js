import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// =====================================================
// Hooks para Conceptos
// =====================================================

export function useConceptos(options = {}) {
  const { activo = true } = options

  return useQuery({
    queryKey: ['conceptos', { activo }],
    queryFn: async () => {
      let query = supabase
        .from('conceptos')
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

export function useConcepto(id) {
  return useQuery({
    queryKey: ['conceptos', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conceptos')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id
  })
}

export function useCreateConcepto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase
        .from('conceptos')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conceptos'] })
    }
  })
}

export function useUpdateConcepto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: result, error } = await supabase
        .from('conceptos')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['conceptos'] })
      queryClient.invalidateQueries({ queryKey: ['conceptos', id] })
    }
  })
}






