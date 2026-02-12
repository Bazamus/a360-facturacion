import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// =====================================================
// Hooks para Comentarios Internos (Notas)
// =====================================================

/**
 * Obtener comentarios de una entidad
 * @param {string} entidadTipo - 'cliente', 'comunidad', 'contador', 'factura'
 * @param {string} entidadId - UUID de la entidad
 */
export function useComentarios(entidadTipo, entidadId) {
  return useQuery({
    queryKey: ['comentarios', entidadTipo, entidadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_comentarios')
        .select('*')
        .eq('entidad_tipo', entidadTipo)
        .eq('entidad_id', entidadId)
        .order('fijado', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!entidadTipo && !!entidadId
  })
}

/**
 * Crear un nuevo comentario
 */
export function useCreateComentario() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (comentario) => {
      const { data, error } = await supabase
        .from('comentarios')
        .insert(comentario)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['comentarios', data.entidad_tipo, data.entidad_id]
      })
    }
  })
}

/**
 * Actualizar un comentario existente
 */
export function useUpdateComentario() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('comentarios')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['comentarios', data.entidad_tipo, data.entidad_id]
      })
    }
  })
}

/**
 * Eliminar un comentario
 */
export function useDeleteComentario() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, entidadTipo, entidadId }) => {
      const { error } = await supabase
        .from('comentarios')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { entidadTipo, entidadId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['comentarios', data.entidadTipo, data.entidadId]
      })
    }
  })
}
