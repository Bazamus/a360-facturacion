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
 * Obtener el conteo de notas activas (abiertas + en progreso)
 * Hook ligero para el badge del sidebar
 */
export function useNotasCount() {
  return useQuery({
    queryKey: ['notas-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('comentarios')
        .select('*', { count: 'exact', head: true })
        .in('estado', ['abierto', 'en_progreso'])

      if (error) throw error
      return count || 0
    },
    refetchInterval: 30000, // Refrescar cada 30 segundos
    staleTime: 15000,
  })
}

/**
 * Obtener TODOS los comentarios (vista central) con filtros opcionales
 * @param {Object} filtros - { entidadTipo, prioridad, etiqueta, search }
 */
export function useAllComentarios(filtros = {}) {
  return useQuery({
    queryKey: ['comentarios-all', filtros],
    queryFn: async () => {
      let query = supabase
        .from('v_comentarios_central')
        .select('*')
        .order('fijado', { ascending: false })
        .order('created_at', { ascending: false })

      if (filtros.entidadTipo) {
        query = query.eq('entidad_tipo', filtros.entidadTipo)
      }
      if (filtros.prioridad) {
        query = query.eq('prioridad', filtros.prioridad)
      }
      if (filtros.etiqueta) {
        query = query.eq('etiqueta', filtros.etiqueta)
      }
      if (filtros.search) {
        query = query.or(`contenido.ilike.%${filtros.search}%,entidad_nombre.ilike.%${filtros.search}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    }
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
      queryClient.invalidateQueries({ queryKey: ['comentarios-all'] })
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
      queryClient.invalidateQueries({ queryKey: ['comentarios-all'] })
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
      queryClient.invalidateQueries({ queryKey: ['comentarios-all'] })
    }
  })
}
