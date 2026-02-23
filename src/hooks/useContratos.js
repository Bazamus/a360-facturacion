import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Lista de contratos con filtros
export function useContratos({ estado, clienteId, comunidadId, search } = {}) {
  return useQuery({
    queryKey: ['contratos', { estado, clienteId, comunidadId, search }],
    queryFn: async () => {
      let query = supabase
        .from('v_contratos_activos')
        .select('*')
        .order('created_at', { ascending: false })

      if (estado) query = query.eq('estado', estado)
      if (clienteId) query = query.eq('cliente_id', clienteId)
      if (comunidadId) query = query.eq('comunidad_id', comunidadId)
      if (search) {
        query = query.or(
          `numero_contrato.ilike.%${search}%,titulo.ilike.%${search}%,cliente_nombre.ilike.%${search}%`
        )
      }

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })
}

// Contrato individual con intervenciones vinculadas
export function useContrato(id) {
  return useQuery({
    queryKey: ['contrato', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contratos_mantenimiento')
        .select(`
          *,
          cliente:clientes(id, nombre, apellidos, telefono, email),
          comunidad:comunidades(id, nombre),
          intervenciones(id, numero_parte, titulo, tipo, estado, fecha_solicitud, fecha_fin)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

// Crear contrato (con número automático)
export function useCrearContrato() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (contrato) => {
      // Generar número de contrato
      const { data: numero, error: numError } = await supabase.rpc('generar_numero_contrato')
      if (numError) throw numError

      const { data, error } = await supabase
        .from('contratos_mantenimiento')
        .insert({ ...contrato, numero_contrato: numero })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
    },
  })
}

// Actualizar contrato
export function useActualizarContrato() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('contratos_mantenimiento')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] })
      queryClient.invalidateQueries({ queryKey: ['contrato', variables.id] })
    },
  })
}
