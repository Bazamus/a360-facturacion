import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Lista de citas con filtros
export function useCitas({ tecnicoId, estado, fechaInicio, fechaFin } = {}) {
  return useQuery({
    queryKey: ['citas', { tecnicoId, estado, fechaInicio, fechaFin }],
    queryFn: async () => {
      let query = supabase
        .from('v_agenda_tecnicos')
        .select('*')
        .order('fecha_hora', { ascending: true })

      if (tecnicoId) query = query.eq('tecnico_id', tecnicoId)
      if (estado) query = query.eq('cita_estado', estado)
      if (fechaInicio) query = query.gte('fecha_hora', fechaInicio)
      if (fechaFin) query = query.lte('fecha_hora', fechaFin)

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })
}

// Cita individual
export function useCita(id) {
  return useQuery({
    queryKey: ['cita', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('citas')
        .select(`
          *,
          intervencion:intervenciones(id, numero_parte, titulo, tipo, prioridad, estado),
          cliente:clientes(id, nombre, apellidos, telefono, email),
          tecnico:profiles!citas_tecnico_id_fkey(id, nombre_completo)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

// Crear cita
export function useCrearCita() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (cita) => {
      const { data, error } = await supabase
        .from('citas')
        .insert(cita)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citas'] })
      queryClient.invalidateQueries({ queryKey: ['agenda-tecnico'] })
    },
  })
}

// Actualizar cita
export function useActualizarCita() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('citas')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['citas'] })
      queryClient.invalidateQueries({ queryKey: ['cita', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['agenda-tecnico'] })
    },
  })
}

// Cancelar cita
export function useCancelarCita() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { data, error } = await supabase
        .from('citas')
        .update({ estado: 'cancelada' })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['citas'] })
      queryClient.invalidateQueries({ queryKey: ['cita', id] })
      queryClient.invalidateQueries({ queryKey: ['agenda-tecnico'] })
    },
  })
}

// Agenda de un técnico (RPC)
export function useAgendaTecnico(tecnicoId, fechaInicio, fechaFin) {
  return useQuery({
    queryKey: ['agenda-tecnico', tecnicoId, fechaInicio, fechaFin],
    queryFn: async () => {
      const params = { p_tecnico_id: tecnicoId }
      if (fechaInicio) params.p_fecha_inicio = fechaInicio
      if (fechaFin) params.p_fecha_fin = fechaFin

      const { data, error } = await supabase.rpc('get_agenda_tecnico', params)
      if (error) throw error
      return data ?? []
    },
    enabled: !!tecnicoId,
  })
}
