import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// =====================================================
// QUERIES
// =====================================================

/**
 * Hook para obtener facturas pendientes de envío
 */
export function useFacturasPendientesEnvio(filtros = {}) {
  const { comunidadId, estado, fechaDesde, fechaHasta } = filtros

  return useQuery({
    queryKey: ['facturas-pendientes-envio', comunidadId, estado, fechaDesde, fechaHasta],
    queryFn: async () => {
      let query = supabase
        .from('v_facturas_pendientes_envio')
        .select('*')
        .order('fecha_factura', { ascending: false })

      if (comunidadId) {
        query = query.eq('comunidad_id', comunidadId)
      }

      if (estado === 'pendiente') {
        query = query.eq('estado_envio', 'pendiente')
      } else if (estado === 'sin_email') {
        query = query.eq('estado_envio', 'sin_email')
      } else if (estado === 'enviado') {
        query = query.eq('estado_envio', 'enviado')
      }

      if (fechaDesde) {
        query = query.gte('fecha_factura', fechaDesde)
      }

      if (fechaHasta) {
        query = query.lte('fecha_factura', fechaHasta)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    }
  })
}

/**
 * Hook para obtener historial de envíos
 */
export function useHistorialEnvios(filtros = {}) {
  const { comunidadId, estado, fechaInicio, fechaFin, search, page = 1, pageSize = 20 } = filtros

  return useQuery({
    queryKey: ['historial-envios', comunidadId, estado, fechaInicio, fechaFin, search, page],
    queryFn: async () => {
      let query = supabase
        .from('envios_email')
        .select(`
          *,
          factura:facturas(numero_completo, total, comunidad_id),
          cliente:clientes(nombre, apellidos, codigo_cliente)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)

      if (estado) {
        query = query.eq('estado', estado)
      }

      if (fechaInicio) {
        query = query.gte('created_at', fechaInicio)
      }

      if (fechaFin) {
        query = query.lte('created_at', fechaFin)
      }

      if (search) {
        query = query.or(`email_destino.ilike.%${search}%,asunto.ilike.%${search}%`)
      }

      const { data, error, count } = await query

      if (error) throw error

      // Filtrar por comunidad si se especifica
      let filteredData = data || []
      if (comunidadId) {
        filteredData = filteredData.filter(e => e.factura?.comunidad_id === comunidadId)
      }

      return {
        data: filteredData,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    }
  })
}

/**
 * Hook para obtener detalle de un envío
 */
export function useEnvio(envioId) {
  return useQuery({
    queryKey: ['envio', envioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('envios_email')
        .select(`
          *,
          factura:facturas(*),
          cliente:clientes(*)
        `)
        .eq('id', envioId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!envioId
  })
}

/**
 * Hook para obtener estadísticas de envíos
 */
export function useEnviosStats(periodo = {}) {
  const { fechaInicio, fechaFin } = periodo

  return useQuery({
    queryKey: ['envios-stats', fechaInicio, fechaFin],
    queryFn: async () => {
      let query = supabase
        .from('envios_email')
        .select('estado, created_at')

      if (fechaInicio) {
        query = query.gte('created_at', fechaInicio)
      }

      if (fechaFin) {
        query = query.lte('created_at', fechaFin)
      }

      const { data, error } = await query

      if (error) throw error

      // Calcular estadísticas
      const stats = {
        total: data?.length || 0,
        enviados: 0,
        entregados: 0,
        abiertos: 0,
        rebotados: 0,
        fallidos: 0,
        pendientes: 0
      }

      data?.forEach(envio => {
        switch (envio.estado) {
          case 'enviado':
            stats.enviados++
            break
          case 'entregado':
            stats.entregados++
            break
          case 'abierto':
            stats.abiertos++
            break
          case 'rebotado':
            stats.rebotados++
            break
          case 'fallido':
            stats.fallidos++
            break
          case 'pendiente':
          case 'enviando':
            stats.pendientes++
            break
        }
      })

      // Calcular porcentajes
      if (stats.total > 0) {
        stats.tasaEntrega = Math.round((stats.entregados / stats.total) * 100)
        stats.tasaApertura = Math.round((stats.abiertos / stats.total) * 100)
        stats.tasaRebote = Math.round((stats.rebotados / stats.total) * 100)
      } else {
        stats.tasaEntrega = 0
        stats.tasaApertura = 0
        stats.tasaRebote = 0
      }

      return stats
    }
  })
}

/**
 * Hook para obtener envíos recientes
 */
export function useEnviosRecientes(limit = 10) {
  return useQuery({
    queryKey: ['envios-recientes', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('envios_email')
        .select(`
          *,
          factura:facturas(numero_completo)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    }
  })
}

/**
 * Hook para obtener rebotes pendientes de revisar
 */
export function useRebotesPendientes() {
  return useQuery({
    queryKey: ['rebotes-pendientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('envios_email')
        .select(`
          *,
          factura:facturas(numero_completo),
          cliente:clientes(nombre, apellidos, nif)
        `)
        .eq('estado', 'rebotado')
        .order('fecha_rebote', { ascending: false })

      if (error) throw error
      return data || []
    }
  })
}

/**
 * Hook para obtener configuración de email
 */
export function useEmailConfig() {
  return useQuery({
    queryKey: ['email-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracion_email')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    }
  })
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Hook para enviar una factura por email
 */
export function useEnviarFactura() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ facturaId, emailCc, modoTest = false }) => {
      // Importar el servicio de email
      const { enviarFacturaEmail } = await import('@/features/envios/services/emailService')

      // Llamar al servicio real de Resend
      const resultado = await enviarFacturaEmail(facturaId, { emailCc, modoTest })

      return resultado
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['facturas-pendientes-envio'] })
      queryClient.invalidateQueries({ queryKey: ['historial-envios'] })
      queryClient.invalidateQueries({ queryKey: ['envios-stats'] })
      queryClient.invalidateQueries({ queryKey: ['facturas'] })
      queryClient.invalidateQueries({ queryKey: ['envios-recientes'] })
    },
    onError: (error) => {
      console.error('Error en useEnviarFactura:', error)
    }
  })
}

/**
 * Hook para enviar múltiples facturas
 */
export function useEnviarFacturasMasivo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ facturaIds, onProgress, emailCc, modoTest = false }) => {
      // Importar el servicio de envío masivo
      const { enviarFacturasMasivo } = await import('@/features/envios/services/envioMasivoService')

      // Llamar al servicio real
      const resultados = await enviarFacturasMasivo(facturaIds, {
        onProgress,
        emailCc,
        modoTest,
        delayEntreEnvios: 150 // 150ms = ~6-7 emails/segundo
      })

      return resultados
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas-pendientes-envio'] })
      queryClient.invalidateQueries({ queryKey: ['historial-envios'] })
      queryClient.invalidateQueries({ queryKey: ['envios-stats'] })
      queryClient.invalidateQueries({ queryKey: ['facturas'] })
      queryClient.invalidateQueries({ queryKey: ['envios-recientes'] })
    },
    onError: (error) => {
      console.error('Error en useEnviarFacturasMasivo:', error)
    }
  })
}

/**
 * Hook para reintentar un envío fallido
 */
export function useReintentarEnvio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (envioId) => {
      // Obtener envío actual
      const { data: envio, error: getError } = await supabase
        .from('envios_email')
        .select('*')
        .eq('id', envioId)
        .single()

      if (getError) throw getError

      if (envio.intentos >= envio.max_intentos) {
        throw new Error('Se ha superado el máximo de reintentos')
      }

      // Actualizar a enviado (simulación)
      const { error: updateError } = await supabase
        .from('envios_email')
        .update({
          estado: 'enviado',
          fecha_enviado: new Date().toISOString(),
          intentos: envio.intentos + 1,
          error_mensaje: null,
          error_codigo: null,
          proximo_reintento: null
        })
        .eq('id', envioId)

      if (updateError) throw updateError

      // Marcar factura como enviada
      await supabase
        .from('facturas')
        .update({
          email_enviado: true,
          fecha_email_enviado: new Date().toISOString()
        })
        .eq('id', envio.factura_id)

      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historial-envios'] })
      queryClient.invalidateQueries({ queryKey: ['envios-stats'] })
      queryClient.invalidateQueries({ queryKey: ['rebotes-pendientes'] })
    }
  })
}

/**
 * Hook para actualizar configuración de email
 */
export function useUpdateEmailConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (config) => {
      const { data, error } = await supabase
        .from('configuracion_email')
        .update({
          ...config,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-config'] })
    }
  })
}

/**
 * Hook para cancelar un envío pendiente
 */
export function useCancelarEnvio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (envioId) => {
      const { error } = await supabase
        .from('envios_email')
        .update({
          estado: 'cancelado'
        })
        .eq('id', envioId)
        .eq('estado', 'pendiente')

      if (error) throw error
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historial-envios'] })
      queryClient.invalidateQueries({ queryKey: ['facturas-pendientes-envio'] })
    }
  })
}



