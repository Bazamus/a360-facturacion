import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Lista de intervenciones con filtros y paginación
export function useIntervenciones({ estado, tipo, prioridad, tecnicoId, comunidadId, clienteId, search, fechaDesde, fechaHasta, page = 0, pageSize = 20 } = {}) {
  return useQuery({
    queryKey: ['intervenciones', { estado, tipo, prioridad, tecnicoId, comunidadId, clienteId, search, fechaDesde, fechaHasta, page, pageSize }],
    queryFn: async () => {
      let query = supabase
        .from('v_intervenciones_resumen')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (estado) query = query.eq('estado', estado)
      if (tipo) query = query.eq('tipo', tipo)
      if (prioridad) query = query.eq('prioridad', prioridad)
      if (tecnicoId) query = query.eq('tecnico_id', tecnicoId)
      if (comunidadId) query = query.eq('comunidad_id', comunidadId)
      if (clienteId) query = query.eq('cliente_id', clienteId)
      if (fechaDesde) query = query.gte('created_at', fechaDesde)
      if (fechaHasta) query = query.lte('created_at', fechaHasta + 'T23:59:59')
      if (search) {
        query = query.or(
          `numero_parte.ilike.%${search}%,titulo.ilike.%${search}%,cliente_nombre.ilike.%${search}%,tecnico_nombre.ilike.%${search}%`
        )
      }

      const from = page * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, count, error } = await query
      if (error) throw error
      return { data: data ?? [], count: count ?? 0 }
    },
  })
}

// Intervención individual (desde tabla directa con relaciones)
// Nota: tecnico_id y encargado_id referencian auth.users, no profiles,
// por lo que no se puede hacer join directo con profiles via PostgREST.
// Se obtienen los nombres en una consulta separada.
export function useIntervencion(id) {
  return useQuery({
    queryKey: ['intervencion', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intervenciones')
        .select(`
          *,
          cliente:clientes(id, nombre, apellidos, telefono, email),
          comunidad:comunidades(id, nombre),
          contrato:contratos_mantenimiento(id, numero_contrato, titulo)
        `)
        .eq('id', id)
        .single()
      if (error) throw error

      // Obtener nombres de técnico y encargado desde profiles
      const profileIds = [data.tecnico_id, data.encargado_id].filter(Boolean)
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nombre_completo')
          .in('id', profileIds)

        const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]))
        data.tecnico = profileMap[data.tecnico_id] || null
        data.encargado = profileMap[data.encargado_id] || null
      } else {
        data.tecnico = null
        data.encargado = null
      }

      return data
    },
    enabled: !!id,
  })
}

// Crear intervención (RPC con número automático)
export function useCrearIntervencion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params) => {
      const { data, error } = await supabase.rpc('crear_intervencion', {
        p_titulo: params.titulo,
        p_tipo: params.tipo || 'correctiva',
        p_prioridad: params.prioridad || 'normal',
        p_descripcion: params.descripcion || null,
        p_cliente_id: params.cliente_id || null,
        p_comunidad_id: params.comunidad_id || null,
        p_contrato_id: params.contrato_id || null,
        p_tecnico_id: params.tecnico_id || null,
        p_direccion: params.direccion || null,
        p_codigo_postal: params.codigo_postal || null,
        p_ciudad: params.ciudad || null,
      })
      if (error) throw error
      return data // UUID del nuevo registro
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intervenciones'] })
      queryClient.invalidateQueries({ queryKey: ['sat-stats'] })
    },
  })
}

// Actualizar intervención (UPDATE directo)
export function useActualizarIntervencion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('intervenciones')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['intervenciones'] })
      queryClient.invalidateQueries({ queryKey: ['intervencion', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['sat-stats'] })
    },
  })
}

// Cerrar intervención (RPC con cálculos automáticos)
export function useCerrarIntervencion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params) => {
      const { data, error } = await supabase.rpc('cerrar_intervencion', {
        p_intervencion_id: params.id,
        p_diagnostico: params.diagnostico || null,
        p_solucion: params.solucion || null,
        p_firma_cliente: params.firma_cliente || null,
        p_firma_tecnico: params.firma_tecnico || null,
      })
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['intervenciones'] })
      queryClient.invalidateQueries({ queryKey: ['intervencion', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['sat-stats'] })
      queryClient.invalidateQueries({ queryKey: ['materiales'] })
    },
  })
}

// Materiales de una intervención
export function useMaterialesIntervencion(intervencionId) {
  return useQuery({
    queryKey: ['intervenciones-materiales', intervencionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intervenciones_materiales')
        .select(`
          *,
          material:materiales(id, nombre, referencia, unidad_medida)
        `)
        .eq('intervencion_id', intervencionId)
        .order('created_at')
      if (error) throw error
      return data ?? []
    },
    enabled: !!intervencionId,
  })
}

// Añadir material a intervención
export function useAnadirMaterialIntervencion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ intervencion_id, material_id, cantidad, precio_unitario, notas }) => {
      const { data, error } = await supabase
        .from('intervenciones_materiales')
        .insert({ intervencion_id, material_id, cantidad, precio_unitario, notas })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['intervenciones-materiales', variables.intervencion_id] })
      queryClient.invalidateQueries({ queryKey: ['intervencion', variables.intervencion_id] })
    },
  })
}

// Eliminar material de intervención
export function useEliminarMaterialIntervencion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, intervencion_id }) => {
      const { error } = await supabase
        .from('intervenciones_materiales')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['intervenciones-materiales', variables.intervencion_id] })
      queryClient.invalidateQueries({ queryKey: ['intervencion', variables.intervencion_id] })
    },
  })
}

// Historial de cambios de estado de una intervención
export function useHistorialIntervencion(intervencionId) {
  return useQuery({
    queryKey: ['intervencion-historial', intervencionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intervenciones_historial')
        .select('*')
        .eq('intervencion_id', intervencionId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    enabled: !!intervencionId,
  })
}

// Estadísticas SAT
export function useSATStats(fechaInicio, fechaFin) {
  return useQuery({
    queryKey: ['sat-stats', fechaInicio, fechaFin],
    queryFn: async () => {
      const params = {}
      if (fechaInicio) params.p_fecha_inicio = fechaInicio
      if (fechaFin) params.p_fecha_fin = fechaFin

      const { data, error } = await supabase.rpc('get_sat_stats', params)
      if (error) throw error
      return data
    },
    refetchInterval: 60000,
  })
}

// Eliminar intervención (solo pendiente/cancelada, solo admin/encargado)
export function useEliminarIntervencion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.rpc('eliminar_intervencion', { p_id: id })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intervenciones'] })
      queryClient.invalidateQueries({ queryKey: ['sat-stats'] })
    },
  })
}
