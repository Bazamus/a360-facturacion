import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Lista de tickets con filtros y paginación
export function useTickets({ estado, tipo, prioridad, asignadoId, clienteId, search, page = 0, pageSize = 20 } = {}) {
  return useQuery({
    queryKey: ['tickets', { estado, tipo, prioridad, asignadoId, clienteId, search, page, pageSize }],
    queryFn: async () => {
      let query = supabase
        .from('v_tickets_resumen')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (estado) query = query.eq('estado', estado)
      if (tipo) query = query.eq('tipo', tipo)
      if (prioridad) query = query.eq('prioridad', prioridad)
      if (asignadoId) query = query.eq('asignado_id', asignadoId)
      if (clienteId) query = query.eq('cliente_id', clienteId)
      if (search) {
        query = query.or(
          `numero_ticket.ilike.%${search}%,asunto.ilike.%${search}%,cliente_nombre.ilike.%${search}%`
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

// Ticket individual
export function useTicket(id) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets_sat')
        .select(`
          *,
          cliente:clientes(id, nombre, apellidos, telefono, email),
          comunidad:comunidades(id, nombre),
          contrato:contratos_mantenimiento(id, numero_contrato, titulo),
          intervencion:intervenciones(id, numero_parte, titulo, estado)
        `)
        .eq('id', id)
        .single()
      if (error) throw error

      // Obtener nombre del asignado desde profiles
      if (data.asignado_a) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, nombre_completo')
          .eq('id', data.asignado_a)
          .single()
        data.asignado = profile || null
      } else {
        data.asignado = null
      }

      return data
    },
    enabled: !!id,
  })
}

// Crear ticket (RPC con número automático)
export function useCrearTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params) => {
      const { data, error } = await supabase.rpc('crear_ticket', {
        p_asunto: params.asunto,
        p_tipo: params.tipo || 'incidencia',
        p_prioridad: params.prioridad || 'normal',
        p_descripcion: params.descripcion || null,
        p_cliente_id: params.cliente_id || null,
        p_comunidad_id: params.comunidad_id || null,
        p_contrato_id: params.contrato_id || null,
        p_categoria: params.categoria || null,
        p_origen: params.origen || 'interno',
        p_direccion: params.direccion || null,
        p_codigo_postal: params.codigo_postal || null,
        p_ciudad: params.ciudad || null,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['tickets-stats'] })
    },
  })
}

// Actualizar ticket
export function useActualizarTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('tickets_sat')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['tickets-stats'] })
    },
  })
}

// Crear intervención desde ticket
export function useCrearIntervencionDesdeTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ticketId) => {
      const { data, error } = await supabase.rpc('crear_intervencion_desde_ticket', {
        p_ticket_id: ticketId,
      })
      if (error) throw error
      return data
    },
    onSuccess: (_, ticketId) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
      queryClient.invalidateQueries({ queryKey: ['intervenciones'] })
      queryClient.invalidateQueries({ queryKey: ['tickets-stats'] })
    },
  })
}

// Comentarios de un ticket
export function useTicketComentarios(ticketId) {
  return useQuery({
    queryKey: ['ticket-comentarios', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_comentarios')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })
      if (error) throw error

      // Obtener nombres de usuarios
      const userIds = [...new Set((data || []).map((c) => c.usuario_id).filter(Boolean))]
      let profileMap = {}
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nombre_completo')
          .in('id', userIds)
        profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p.nombre_completo]))
      }

      return (data || []).map((c) => ({
        ...c,
        usuario_nombre: profileMap[c.usuario_id] || 'Sistema',
      }))
    },
    enabled: !!ticketId,
  })
}

// Crear comentario en ticket
export function useCrearComentario() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ticket_id, contenido, es_interno = false }) => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('ticket_comentarios')
        .insert({ ticket_id, contenido, es_interno, usuario_id: user?.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-comentarios', variables.ticket_id] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

// Eliminar ticket (solo abierto/cerrado, solo admin/encargado)
export function useEliminarTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.rpc('eliminar_ticket', { p_id: id })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['tickets-stats'] })
    },
  })
}

// Estadísticas de tickets
export function useTicketsStats() {
  return useQuery({
    queryKey: ['tickets-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tickets_stats')
      if (error) throw error
      return data
    },
    refetchInterval: 60000,
  })
}
