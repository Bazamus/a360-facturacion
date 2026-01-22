import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Hook para resetear todos los datos del sistema
 * Solo admins pueden ejecutar esta operación
 */
export function useResetSistema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('reset_datos_sistema')

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Invalidar todas las queries para forzar recarga
      queryClient.invalidateQueries()
      
      return data
    }
  })
}
