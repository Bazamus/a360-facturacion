import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Mutación para cambiar el número de serie de un contador.
 * Delega en el RPC cambiar_numero_serie_contador que gestiona la auditoría.
 */
export function useCambioContador() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      contadorId,
      numeroSerieNuevo,
      marca,
      modelo,
      fechaInstalacion,
      tipoCambio,
      conservaLecturas,
      motivo,
      conceptosReset
    }) => {
      const { data, error } = await supabase.rpc('cambiar_numero_serie_contador', {
        p_contador_id:        contadorId,
        p_numero_serie_nuevo: numeroSerieNuevo,
        p_marca:              marca              || null,
        p_modelo:             modelo             || null,
        p_fecha_instalacion:  fechaInstalacion   || null,
        p_tipo_cambio:        tipoCambio,
        p_conserva_lecturas:  conservaLecturas,
        p_motivo:             motivo             || null,
        p_conceptos_reset:    conceptosReset     || null
      })

      if (error) throw error

      if (!data?.success) {
        throw new Error(data?.error || 'Error al cambiar el número de serie del contador')
      }

      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contadores'] })
      queryClient.invalidateQueries({ queryKey: ['contadores', variables.contadorId] })
      queryClient.invalidateQueries({ queryKey: ['historial-cambios-contador', variables.contadorId] })
    }
  })
}

/**
 * Query para obtener el historial de cambios de número de serie de un contador.
 */
export function useHistorialCambiosContador(contadorId) {
  return useQuery({
    queryKey: ['historial-cambios-contador', contadorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_contadores_cambios_historial')
        .select('*')
        .eq('contador_id', contadorId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!contadorId
  })
}

/**
 * Query para obtener el historial de cambios de lecturas de TODOS los conceptos
 * de un contador (usando numero_serie como join en la vista existente).
 */
export function useHistorialLecturasContador(contadorId) {
  return useQuery({
    queryKey: ['historial-lecturas-contador', contadorId],
    queryFn: async () => {
      // Primero obtener los ids de contadores_conceptos del contador
      const { data: conceptos, error: errorConceptos } = await supabase
        .from('contadores_conceptos')
        .select('id')
        .eq('contador_id', contadorId)

      if (errorConceptos) throw errorConceptos
      if (!conceptos || conceptos.length === 0) return []

      const ids = conceptos.map((c) => c.id)

      const { data, error } = await supabase
        .from('v_contador_conceptos_historial')
        .select('*')
        .in('contador_concepto_id', ids)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!contadorId
  })
}
