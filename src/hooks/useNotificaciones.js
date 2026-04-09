import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Lista de notificaciones del usuario autenticado
export function useNotificaciones({ leida, limit = 30 } = {}) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['notificaciones', { leida, limit }],
    queryFn: async () => {
      let q = supabase
        .from('notificaciones')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (leida !== undefined) q = q.eq('leida', leida)

      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
    refetchInterval: 30000, // refresco cada 30s como fallback
  })

  // Realtime subscription para actualizaciones instantáneas
  useEffect(() => {
    const channel = supabase
      .channel('notificaciones-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notificaciones'] })
          queryClient.invalidateQueries({ queryKey: ['notificaciones-count'] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return query
}

// Conteo de no leídas (para badge)
export function useNotificacionesCount() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['notificaciones-count'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_notificaciones_count')
      if (error) return 0
      return data ?? 0
    },
    refetchInterval: 30000,
  })

  useEffect(() => {
    const channel = supabase
      .channel('notificaciones-count-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notificaciones' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notificaciones-count'] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return query
}

// Marcar una notificación como leída
export function useMarcarLeida() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.rpc('marcar_notificacion_leida', { p_id: id })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] })
      queryClient.invalidateQueries({ queryKey: ['notificaciones-count'] })
    },
  })
}

// Marcar todas como leídas
export function useMarcarTodasLeidas() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('marcar_todas_notificaciones_leidas')
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] })
      queryClient.invalidateQueries({ queryKey: ['notificaciones-count'] })
    },
  })
}
