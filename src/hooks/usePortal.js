import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Obtener cliente_id via RPC (SECURITY DEFINER, bypasa RLS)
async function getClienteId() {
  const { data, error } = await supabase.rpc('get_mi_cliente_id')
  if (error) throw error
  return data
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
    refetchInterval: 120000,
  })
}

// Facturas del cliente via RPC
export function usePortalFacturas({ anio, estado, page = 0, pageSize = 20 } = {}) {
  return useQuery({
    queryKey: ['portal-facturas', { anio, estado, page, pageSize }],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_portal_mis_facturas', {
        p_anio: anio ? parseInt(anio) : null,
        p_estado: estado || null,
        p_limit: pageSize,
        p_offset: page * pageSize,
      })
      if (error) throw error
      return data || { data: [], count: 0 }
    },
  })
}

// Tickets del cliente via RPC
export function usePortalTickets({ estado, page = 0, pageSize = 20 } = {}) {
  return useQuery({
    queryKey: ['portal-tickets', { estado, page, pageSize }],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_portal_mis_tickets', {
        p_estado: estado || null,
        p_limit: pageSize,
        p_offset: page * pageSize,
      })
      if (error) throw error
      return data || { data: [], count: 0 }
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

// Intervenciones del cliente via RPC
export function usePortalIntervenciones() {
  return useQuery({
    queryKey: ['portal-intervenciones'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_portal_mis_intervenciones')
      if (error) throw error
      return data || []
    },
  })
}

// Contratos del cliente via RPC
export function usePortalContratos() {
  return useQuery({
    queryKey: ['portal-contratos'],
    queryFn: async () => {
      const clienteId = await getClienteId()
      if (!clienteId) return []

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
      if (!clienteId) return []

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
