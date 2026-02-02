import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Hook para detectar envíos atascados
 */
export function useDetectarEnviosAtascados(timeoutMinutos = 60) {
  return useQuery({
    queryKey: ['envios-atascados', timeoutMinutos],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('detectar_envios_atascados', {
          p_timeout_minutos: timeoutMinutos
        })
      
      if (error) throw error
      return data || []
    },
    refetchInterval: 60000, // Recargar cada minuto
    staleTime: 30000 // Considerar datos obsoletos después de 30 segundos
  })
}

/**
 * Hook para limpiar envíos atascados
 */
export function useLimpiarEnviosAtascados() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ timeoutMinutos = 30 }) => {
      const { data, error } = await supabase
        .rpc('limpiar_envios_atascados', {
          p_timeout_minutos: timeoutMinutos,
          p_marcar_como: 'timeout'
        })
      
      if (error) throw error
      
      if (!data.success) {
        throw new Error('Error al limpiar envíos atascados')
      }
      
      return data
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['envios'] })
      queryClient.invalidateQueries({ queryKey: ['envios-atascados'] })
      queryClient.invalidateQueries({ queryKey: ['envios-stats'] })
    }
  })
}

/**
 * Hook para obtener envíos en proceso con alertas
 */
export function useEnviosEnProceso() {
  return useQuery({
    queryKey: ['envios-en-proceso'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_envios_en_proceso')
        .select('*')
        .order('minutos_en_proceso', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    refetchInterval: 30000, // Recargar cada 30 segundos
    staleTime: 15000
  })
}

/**
 * Hook para cancelar un envío específico
 */
export function useCancelarEnvio() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (envioId) => {
      const { data, error } = await supabase
        .from('envios_email')
        .update({
          estado: 'fallido',
          error_codigo: 'CANCELADO',
          error_mensaje: 'Envío cancelado manualmente por el usuario',
          updated_at: new Date().toISOString()
        })
        .eq('id', envioId)
        .eq('estado', 'enviando') // Solo cancelar si está en "enviando"
        .select()
      
      if (error) throw error
      
      if (!data || data.length === 0) {
        throw new Error('No se pudo cancelar el envío (ya no está en estado enviando)')
      }
      
      return data[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['envios'] })
      queryClient.invalidateQueries({ queryKey: ['envios-atascados'] })
      queryClient.invalidateQueries({ queryKey: ['envios-en-proceso'] })
    }
  })
}
