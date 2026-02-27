import { useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Consulta mensajes con paginación, búsqueda y filtros
// Usa la vista v_comunicaciones_resumen que ya incluye datos de cliente aplanados
// Retorna { data: [...], count: N } en lugar del array directamente
export function useComunicaciones({ canal, estado, clienteId, search, page = 0, pageSize = 10 } = {}) {
  return useQuery({
    queryKey: ['comunicaciones', { canal, estado, clienteId, search, page, pageSize }],
    queryFn: async () => {
      let query = supabase
        .from('v_comunicaciones_resumen')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (canal) query = query.eq('canal', canal)
      if (estado) query = query.eq('estado', estado)
      if (clienteId) query = query.eq('cliente_id', clienteId)
      if (search) {
        query = query.or(
          `contenido.ilike.%${search}%,remitente_nombre.ilike.%${search}%,remitente_telefono.ilike.%${search}%`
        )
      }

      const from = page * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, count, error } = await query
      if (error) throw error

      return { data: data ?? [], count: count ?? 0 }
    },
    refetchInterval: 30000,
  })
}

export function useComunicacionesStats(fechaInicio, fechaFin) {
  return useQuery({
    queryKey: ['comunicaciones-stats', fechaInicio, fechaFin],
    queryFn: async () => {
      const params = {}
      if (fechaInicio) params.p_fecha_inicio = fechaInicio
      if (fechaFin) params.p_fecha_fin = fechaFin

      const { data, error } = await supabase.rpc('get_comunicaciones_stats', params)
      if (error) throw error
      return data
    },
    refetchInterval: 60000,
  })
}

export function useRegistrarComunicacion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (comunicacion) => {
      const { data, error } = await supabase
        .from('comunicaciones')
        .insert(comunicacion)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comunicaciones'] })
      queryClient.invalidateQueries({ queryKey: ['comunicaciones-stats'] })
    }
  })
}

// Datos de tendencia temporal (mensajes por día) para el gráfico de línea
// Retorna array de { fecha, total, entrantes, salientes } rellenando días sin actividad
export function useComunicacionesTrend(fechaInicio, fechaFin) {
  const { data: rawData, ...rest } = useQuery({
    queryKey: ['comunicaciones-trend', fechaInicio, fechaFin],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comunicaciones')
        .select('created_at, canal, direccion')
        .gte('created_at', fechaInicio)
        .lte('created_at', `${fechaFin}T23:59:59`)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data ?? []
    },
    enabled: !!(fechaInicio && fechaFin),
  })

  const trend = useMemo(() => {
    if (!rawData || !fechaInicio || !fechaFin) return []

    // Agregar por día
    const byDay = {}
    for (const msg of rawData) {
      const day = msg.created_at.slice(0, 10) // 'YYYY-MM-DD'
      if (!byDay[day]) byDay[day] = { fecha: day, total: 0, entrantes: 0, salientes: 0 }
      byDay[day].total++
      if (msg.direccion === 'entrante') byDay[day].entrantes++
      else byDay[day].salientes++
    }

    // Rellenar días sin actividad para que el gráfico sea continuo
    const result = []
    const start = new Date(fechaInicio)
    const end = new Date(fechaFin)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.toISOString().slice(0, 10)
      result.push(byDay[day] || { fecha: day, total: 0, entrantes: 0, salientes: 0 })
    }
    return result
  }, [rawData, fechaInicio, fechaFin])

  return { data: trend, ...rest }
}

export function usePlantillas(canal) {
  return useQuery({
    queryKey: ['plantillas-mensaje', canal],
    queryFn: async () => {
      let query = supabase
        .from('plantillas_mensaje')
        .select('*')
        .eq('activa', true)
        .order('categoria')

      if (canal && canal !== 'todos') {
        query = query.or(`canal.eq.${canal},canal.eq.todos`)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    }
  })
}

export function useCreatePlantilla() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (plantilla) => {
      const { data, error } = await supabase
        .from('plantillas_mensaje')
        .insert(plantilla)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantillas-mensaje'] })
    }
  })
}

export function useUpdatePlantilla() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('plantillas_mensaje')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantillas-mensaje'] })
    }
  })
}

// Archiva un mensaje individual (estado='archivado')
// Usa RPC SECURITY DEFINER para evitar conflictos con RLS en UPDATE directo
export function useArchivarComunicacion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.rpc('archivar_comunicacion', { p_id: id })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comunicaciones'] })
      queryClient.invalidateQueries({ queryKey: ['comunicaciones-stats'] })
      queryClient.invalidateQueries({ queryKey: ['conversaciones'] })
      queryClient.invalidateQueries({ queryKey: ['conversacion-mensajes'] })
    },
  })
}

// Archiva TODOS los mensajes pendientes de una conversación (por teléfono)
// Opcionalmente resuelve la conversación en Chatwoot via n8n webhook
export function useArchivarConversacion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ telefono, chatwootConversationId }) => {
      // 1. Archivar localmente en Supabase
      const { error } = await supabase.rpc('archivar_conversacion', { p_telefono: telefono })
      if (error) throw error

      // 2. Resolver en Chatwoot via n8n webhook (best-effort)
      if (chatwootConversationId) {
        try {
          const n8nWebhookUrl = import.meta.env.VITE_N8N_RESOLVE_WEBHOOK
          if (n8nWebhookUrl) {
            await fetch(n8nWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ conversation_id: chatwootConversationId }),
            })
          }
        } catch (e) {
          console.warn('No se pudo resolver la conversación en Chatwoot:', e)
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comunicaciones'] })
      queryClient.invalidateQueries({ queryKey: ['comunicaciones-stats'] })
      queryClient.invalidateQueries({ queryKey: ['conversaciones'] })
      queryClient.invalidateQueries({ queryKey: ['conversacion-mensajes'] })
      queryClient.invalidateQueries({ queryKey: ['conversaciones-archivadas'] })
    },
  })
}

export function useDeletePlantilla() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('plantillas_mensaje')
        .update({ activa: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantillas-mensaje'] })
    }
  })
}

// Conversaciones agrupadas por remitente_telefono (para Dashboard rediseñado)
// Llama a RPC get_conversaciones_pendientes que agrupa mensajes y devuelve resumen
export function useConversaciones({ canal, search, page = 0, pageSize = 20 } = {}) {
  return useQuery({
    queryKey: ['conversaciones', { canal, search, page, pageSize }],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_conversaciones_pendientes', {
        p_canal: canal || null,
        p_search: search || null,
        p_limit: pageSize,
        p_offset: page * pageSize,
      })
      if (error) throw error
      return data ?? []
    },
    refetchInterval: 30000,
  })
}

// Mensajes individuales de una conversación (por teléfono)
// Se activa solo cuando el thread está expandido (enabled)
export function useMensajesConversacion(telefono, enabled = false) {
  return useQuery({
    queryKey: ['conversacion-mensajes', telefono],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_mensajes_conversacion', {
        p_telefono: telefono,
        p_limit: 50,
      })
      if (error) throw error
      return data ?? []
    },
    enabled: !!telefono && enabled,
    refetchInterval: enabled ? 30000 : false,
  })
}

export function useCanalesConfig() {
  return useQuery({
    queryKey: ['canales-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('canales_configuracion')
        .select('*')
        .order('canal')
      if (error) throw error
      return data
    }
  })
}

const CONFIG_DEFAULTS = {
  chatwootUrl: 'https://chat.a360se.com',
  chatwootAccountId: 1,
  fromEmail: 'facturacion@a360se.com',
  fromName: 'A360 Servicios Energéticos',
  enlaces: {
    chatwoot: 'https://chat.a360se.com',
    evolution: 'https://api-wa.a360se.com/manager',
    n8n: 'https://n8n.a360se.com',
  },
}

export function useComunicacionesConfig() {
  const { data: canales, isLoading } = useCanalesConfig()

  const config = useMemo(() => {
    if (!canales) return CONFIG_DEFAULTS

    const whatsapp = canales.find((c) => c.canal === 'whatsapp')
    const email = canales.find((c) => c.canal === 'email')
    const cfg = whatsapp?.configuracion || {}
    const emailCfg = email?.configuracion || {}

    return {
      chatwootUrl: cfg.chatwoot_url || CONFIG_DEFAULTS.chatwootUrl,
      chatwootAccountId: cfg.chatwoot_account_id != null ? Number(cfg.chatwoot_account_id) : CONFIG_DEFAULTS.chatwootAccountId,
      fromEmail: emailCfg.from_email || CONFIG_DEFAULTS.fromEmail,
      fromName: emailCfg.from_name || CONFIG_DEFAULTS.fromName,
      enlaces: {
        chatwoot: cfg.enlace_chatwoot || CONFIG_DEFAULTS.enlaces.chatwoot,
        evolution: cfg.enlace_evolution || CONFIG_DEFAULTS.enlaces.evolution,
        n8n: cfg.enlace_n8n || CONFIG_DEFAULTS.enlaces.n8n,
      },
    }
  }, [canales])

  return { ...config, canales, isLoading }
}

export function useUpdateCanalConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('canales_configuracion')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canales-config'] })
    }
  })
}

// =====================================================
// Nuevos hooks — Mejoras Dashboard Comunicaciones
// =====================================================

// Intenta propagar chatwoot_conversation_id desde registros que lo tienen
// a registros huérfanos del mismo teléfono
export function useSyncChatwootId() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (telefono) => {
      const { data, error } = await supabase.rpc('backfill_chatwoot_conversation_id', {
        p_telefono: telefono,
      })
      if (error) throw error
      return data // número de registros actualizados
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversaciones'] })
    },
  })
}

// Conversaciones archivadas/resueltas para la página de historial
export function useConversacionesArchivadas({ canal, search, page = 0, pageSize = 20 } = {}) {
  return useQuery({
    queryKey: ['conversaciones-archivadas', { canal, search, page, pageSize }],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_conversaciones_archivadas', {
        p_canal: canal || null,
        p_search: search || null,
        p_limit: pageSize,
        p_offset: page * pageSize,
      })
      if (error) throw error
      return data ?? []
    },
    refetchInterval: 60000,
  })
}

// Restaura una conversación archivada (vuelve a 'recibido')
export function useRestaurarConversacion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (telefono) => {
      const { data, error } = await supabase.rpc('restaurar_conversacion', {
        p_telefono: telefono,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversaciones'] })
      queryClient.invalidateQueries({ queryKey: ['conversaciones-archivadas'] })
      queryClient.invalidateQueries({ queryKey: ['comunicaciones-stats'] })
    },
  })
}

// Suscripción Supabase Realtime para mensajes entrantes
// Invalida queries al recibir INSERT y muestra notificación del navegador
export function useRealtimeComunicaciones() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('comunicaciones-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comunicaciones' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['conversaciones'] })
          queryClient.invalidateQueries({ queryKey: ['comunicaciones-stats'] })

          // Notificación del navegador para mensajes entrantes
          if (payload.new.direccion === 'entrante' && Notification.permission === 'granted') {
            new Notification('Nuevo mensaje entrante', {
              body: `${payload.new.remitente_nombre || payload.new.remitente_telefono}: ${payload.new.contenido?.slice(0, 80) || ''}`,
              icon: '/favicon.ico',
              tag: 'com-' + payload.new.id,
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}

// Mensajes de una conversación archivada (todos los estados, por teléfono)
export function useMensajesArchivados(telefono) {
  return useQuery({
    queryKey: ['historial-mensajes', telefono],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comunicaciones')
        .select('id, canal, direccion, contenido, contenido_tipo, estado, remitente_nombre, created_at')
        .eq('remitente_telefono', telefono)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data ?? []
    },
    enabled: !!telefono,
  })
}

// Historial de comunicaciones de un cliente específico (para el modal QuickView)
export function useHistorialCliente(clienteId, enabled = false) {
  return useQuery({
    queryKey: ['historial-cliente', clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_comunicaciones_resumen')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data ?? []
    },
    enabled: !!clienteId && enabled,
  })
}
