import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Lista de equipos con filtros
export function useEquipos({ tipo, estado, clienteId, comunidadId, search, soloActivos = false } = {}) {
  return useQuery({
    queryKey: ['equipos', { tipo, estado, clienteId, comunidadId, search, soloActivos }],
    queryFn: async () => {
      let query = supabase
        .from('v_equipos_resumen')
        .select('*')
        .order('created_at', { ascending: false })

      if (tipo) query = query.eq('tipo', tipo)
      if (estado) query = query.eq('estado', estado)
      if (soloActivos) query = query.eq('estado', 'activo')
      if (clienteId) query = query.eq('cliente_id', clienteId)
      if (comunidadId) query = query.eq('comunidad_id', comunidadId)
      if (search) {
        query = query.or(
          `nombre.ilike.%${search}%,marca.ilike.%${search}%,modelo.ilike.%${search}%,numero_serie.ilike.%${search}%,cliente_nombre.ilike.%${search}%`
        )
      }

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })
}

// Equipo individual con intervenciones
export function useEquipo(id) {
  return useQuery({
    queryKey: ['equipo', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipos')
        .select(`
          *,
          cliente:clientes(id, nombre, apellidos, telefono, email),
          comunidad:comunidades(id, nombre),
          contrato:contratos_mantenimiento(id, numero_contrato, titulo),
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

// Crear equipo
export function useCrearEquipo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (equipo) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('equipos')
        .insert({ ...equipo, created_by: user?.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipos'] })
    },
  })
}

// Actualizar equipo
export function useActualizarEquipo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('equipos')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['equipos'] })
      queryClient.invalidateQueries({ queryKey: ['equipo', variables.id] })
    },
  })
}
