import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Hook para validar si una lectura inicial puede ser editada
 */
export function useValidarEdicionLecturaInicial(contadorConceptoId) {
  return useQuery({
    queryKey: ['validar-edicion-lectura', contadorConceptoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('validar_edicion_lectura_inicial', {
          p_contador_concepto_id: contadorConceptoId
        })
      
      if (error) throw error
      return data?.[0] || { puede_editar: false, razon_bloqueo: 'Error al validar' }
    },
    enabled: !!contadorConceptoId,
    staleTime: 30000 // 30 segundos
  })
}

/**
 * Hook para editar lectura inicial con auditoría
 */
export function useEditarLecturaInicial() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      contadorConceptoId, 
      nuevaLectura, 
      nuevaFecha, 
      motivo 
    }) => {
      const { data, error } = await supabase
        .rpc('editar_lectura_inicial', {
          p_contador_concepto_id: contadorConceptoId,
          p_nueva_lectura: nuevaLectura !== undefined ? nuevaLectura : null,
          p_nueva_fecha: nuevaFecha || null,
          p_motivo: motivo || null,
          p_usuario_id: null // Se obtiene automáticamente con auth.uid()
        })
      
      if (error) throw error
      
      // La función retorna un JSON con success/error
      if (!data.success) {
        throw new Error(data.error || 'Error al editar lectura inicial')
      }
      
      return data
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['contador'] })
      queryClient.invalidateQueries({ queryKey: ['contadores'] })
      queryClient.invalidateQueries({ queryKey: ['validar-edicion-lectura', variables.contadorConceptoId] })
      queryClient.invalidateQueries({ queryKey: ['historial-contador-concepto', variables.contadorConceptoId] })
    }
  })
}

/**
 * Hook para obtener el historial de cambios de un contador_concepto
 */
export function useHistorialContadorConcepto(contadorConceptoId) {
  return useQuery({
    queryKey: ['historial-contador-concepto', contadorConceptoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_contador_conceptos_historial')
        .select('*')
        .eq('contador_concepto_id', contadorConceptoId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!contadorConceptoId
  })
}
