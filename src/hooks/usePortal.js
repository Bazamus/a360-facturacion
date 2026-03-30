import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Obtener cliente_id del usuario actual (por email)
async function getClienteId() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null
  const { data } = await supabase
    .from('clientes')
    .select('id')
    .eq('email', user.email)
    .limit(1)
    .single()
  return data?.id || null
}

// Dashboard: datos completos del portal (una sola llamada RPC)
export function usePortalDatos() {
  return useQuery({
    queryKey: ['portal-datos'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_portal_cliente_datos')
      if (error) throw error
      return data
    },
    refetchInterval: 120000, // cada 2 minutos
  })
}

// Facturas del cliente con filtros
export function usePortalFacturas({ anio, estado, page = 0, pageSize = 20 } = {}) {
  return useQuery({
    queryKey: ['portal-facturas', { anio, estado, page, pageSize }],
    queryFn: async () => {
      const clienteId = await getClienteId()
      if (!clienteId) throw new Error('Cliente no encontrado')

      let query = supabase
        .from('facturas')
        .select('id, serie, numero, fecha_factura, periodo_inicio, periodo_fin, base_imponible, importe_iva, total, estado, pdf_url', { count: 'exact' })
        .eq('cliente_id', clienteId)
        .in('estado', ['emitida', 'pagada'])
        .order('fecha_factura', { ascending: false })

      if (anio) {
        query = query.gte('fecha_factura', `${anio}-01-01`).lte('fecha_factura', `${anio}-12-31`)
      }
      if (estado) query = query.eq('estado', estado)

      const from = page * pageSize
      query = query.range(from, from + pageSize - 1)

      const { data, count, error } = await query
      if (error) throw error
      return { data: data ?? [], count: count ?? 0 }
    },
  })
}

// Tickets del cliente
export function usePortalTickets({ estado, page = 0, pageSize = 20 } = {}) {
  return useQuery({
    queryKey: ['portal-tickets', { estado, page, pageSize }],
    queryFn: async () => {
      const clienteId = await getClienteId()
      if (!clienteId) throw new Error('Cliente no encontrado')

      let query = supabase
        .from('tickets_sat')
        .select('id, numero_ticket, asunto, tipo, prioridad, estado, origen, created_at', { count: 'exact' })
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })

      if (estado) query = query.eq('estado', estado)

      const from = page * pageSize
      query = query.range(from, from + pageSize - 1)

      const { data, count, error } = await query
      if (error) throw error
      return { data: data ?? [], count: count ?? 0 }
    },
  })
}

// Crear ticket desde el portal
export function usePortalCrearTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params) => {
      const clienteId = await getClienteId()
      const { data, error } = await supabase.rpc('crear_ticket', {
        p_asunto: params.asunto,
        p_tipo: params.tipo || 'incidencia',
        p_prioridad: params.prioridad || 'normal',
        p_descripcion: params.descripcion || null,
        p_cliente_id: clienteId,
        p_origen: 'portal_cliente',
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-tickets'] })
      queryClient.invalidateQueries({ queryKey: ['portal-datos'] })
    },
  })
}

// Intervenciones del cliente
export function usePortalIntervenciones() {
  return useQuery({
    queryKey: ['portal-intervenciones'],
    queryFn: async () => {
      const clienteId = await getClienteId()
      if (!clienteId) throw new Error('Cliente no encontrado')

      const { data, error } = await supabase
        .from('intervenciones')
        .select('id, numero_parte, titulo, tipo, prioridad, estado, fecha_solicitud, fecha_fin, diagnostico, solucion')
        .eq('cliente_id', clienteId)
        .order('fecha_solicitud', { ascending: false })
        .limit(50)

      if (error) throw error
      return data ?? []
    },
  })
}

// Contratos del cliente
export function usePortalContratos() {
  return useQuery({
    queryKey: ['portal-contratos'],
    queryFn: async () => {
      const clienteId = await getClienteId()
      if (!clienteId) throw new Error('Cliente no encontrado')

      const { data, error } = await supabase
        .from('contratos_mantenimiento')
        .select('id, numero_contrato, titulo, tipo, estado, fecha_inicio, fecha_fin, periodicidad')
        .eq('cliente_id', clienteId)
        .eq('estado', 'activo')
        .order('fecha_inicio', { ascending: false })

      if (error) throw error
      return data ?? []
    },
  })
}

// Equipos del cliente
export function usePortalEquipos() {
  return useQuery({
    queryKey: ['portal-equipos'],
    queryFn: async () => {
      const clienteId = await getClienteId()
      if (!clienteId) throw new Error('Cliente no encontrado')

      const { data, error } = await supabase
        .from('equipos')
        .select('id, nombre, tipo, marca, modelo, numero_serie, estado, fecha_garantia_fin, ultima_revision, proxima_revision')
        .eq('cliente_id', clienteId)
        .eq('estado', 'activo')
        .order('nombre')

      if (error) throw error
      return data ?? []
    },
  })
}
