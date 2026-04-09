import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

export function useSLADashboard(rango = 30) {
  return useQuery({
    queryKey: ['sla-dashboard', rango],
    queryFn: async () => {
      const desde = new Date()
      desde.setDate(desde.getDate() - rango)
      const { data, error } = await supabase.rpc('get_sla_dashboard', {
        p_fecha_desde: desde.toISOString(),
        p_fecha_hasta: new Date().toISOString(),
      })
      if (error) throw error
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useSLAConfiguraciones() {
  return useQuery({
    queryKey: ['sla-configuraciones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_configuracion')
        .select('*')
        .order('tiempo_respuesta_horas', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    staleTime: 10 * 60 * 1000,
  })
}

export function useCrearSLAConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from('sla_configuracion')
        .insert(values)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sla-configuraciones'] }),
  })
}

export function useActualizarSLAConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from('sla_configuracion')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sla-configuraciones'] }),
  })
}

export function useEliminarSLAConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('sla_configuracion')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sla-configuraciones'] }),
  })
}

// SLA calculado para una intervencion individual (para badges en detalle)
export function useSLAIntervencion(intervencionId) {
  return useQuery({
    queryKey: ['sla-intervencion', intervencionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_intervenciones_sla')
        .select(
          'id, sla_nombre, tiempo_respuesta_horas, tiempo_resolucion_horas, sla_limite_respuesta, sla_limite_resolucion, horas_transcurridas, sla_respuesta_estado, sla_resolucion_estado, sla_porcentaje'
        )
        .eq('id', intervencionId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!intervencionId,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}
