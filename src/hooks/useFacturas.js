import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

// =====================================================
// Hooks para Facturas
// =====================================================

export function useFacturas(options = {}) {
  const { comunidadId, estado, clienteId, search, limit = 50 } = options

  return useQuery({
    queryKey: ['facturas', { comunidadId, estado, clienteId, search, limit }],
    queryFn: async () => {
      // Primero obtener las facturas
      let query = supabase
        .from('v_facturas_resumen')
        .select('*')
        .order('fecha_factura', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)

      if (comunidadId) {
        query = query.eq('comunidad_id', comunidadId)
      }

      if (estado) {
        query = query.eq('estado', estado)
      }

      if (clienteId) {
        query = query.eq('cliente_id', clienteId)
      }

      if (search) {
        query = query.or(`numero_completo.ilike.%${search}%,cliente_nombre.ilike.%${search}%,cliente_nif.ilike.%${search}%`)
      }

      const { data: facturas, error } = await query
      if (error) throw error

      // Obtener códigos de cliente para las facturas
      if (facturas?.length > 0) {
        const clienteIds = [...new Set(facturas.map(f => f.cliente_id).filter(Boolean))]

        if (clienteIds.length > 0) {
          const { data: clientes } = await supabase
            .from('clientes')
            .select('id, codigo_cliente')
            .in('id', clienteIds)

          // Crear mapa de cliente_id -> codigo_cliente
          const codigosMap = {}
          clientes?.forEach(c => {
            codigosMap[c.id] = c.codigo_cliente
          })

          // Añadir codigo_cliente a cada factura
          return facturas.map(f => ({
            ...f,
            codigo_cliente: f.cliente_id ? codigosMap[f.cliente_id] || null : null
          }))
        }
      }

      return facturas
    }
  })
}

export function useFactura(id) {
  return useQuery({
    queryKey: ['facturas', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facturas')
        .select(`
          *,
          comunidad:comunidades(id, nombre, codigo),
          ubicacion:ubicaciones(id, nombre),
          contador:contadores(id, numero_serie),
          cliente:clientes(codigo_cliente)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id
  })
}

export function useFacturaLineas(facturaId) {
  return useQuery({
    queryKey: ['facturas-lineas', facturaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facturas_lineas')
        .select(`
          *,
          concepto:conceptos(id, codigo, nombre, unidad_medida)
        `)
        .eq('factura_id', facturaId)
        .order('orden')

      if (error) throw error
      return data
    },
    enabled: !!facturaId
  })
}

export function useFacturaHistoricoConsumo(facturaId) {
  return useQuery({
    queryKey: ['facturas-historico', facturaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facturas_consumo_historico')
        .select('*')
        .eq('factura_id', facturaId)
        .order('orden')

      if (error) throw error
      return data
    },
    enabled: !!facturaId
  })
}

// =====================================================
// Hooks para Crear/Actualizar Facturas
// =====================================================

export function useCreateFactura() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase
        .from('facturas')
        .insert({
          ...data,
          created_by: user?.id
        })
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] })
    }
  })
}

export function useUpdateFactura() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: result, error } = await supabase
        .from('facturas')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] })
      queryClient.invalidateQueries({ queryKey: ['facturas', id] })
    }
  })
}

export function useDeleteFactura() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      // Solo se pueden eliminar borradores
      const { data: factura } = await supabase
        .from('facturas')
        .select('estado')
        .eq('id', id)
        .single()

      if (factura?.estado !== 'borrador') {
        throw new Error('Solo se pueden eliminar facturas en borrador')
      }

      const { error } = await supabase
        .from('facturas')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] })
    }
  })
}

export function useEliminarFacturas() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (facturaIds) => {
      // Normalizar a array
      const ids = Array.isArray(facturaIds) ? facturaIds : [facturaIds]
      
      // Validación cliente: verificar que no sean borradores
      const { data: facturas } = await supabase
        .from('facturas')
        .select('id, numero, estado')
        .in('id', ids)

      const borradores = facturas?.filter(f => f.estado === 'borrador') || []
      if (borradores.length > 0) {
        throw new Error('No se pueden eliminar facturas en borrador con esta función. Use el botón de eliminar normal.')
      }

      // Llamar a función SQL
      const { data, error } = await supabase
        .rpc('eliminar_facturas_emitidas', {
          p_factura_ids: ids
        })

      if (error) throw error
      return data[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] })
      queryClient.invalidateQueries({ queryKey: ['lecturas'] })
    }
  })
}

// =====================================================
// Hooks para Líneas de Factura
// =====================================================

export function useCreateFacturaLineas() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (lineas) => {
      const { data, error } = await supabase
        .from('facturas_lineas')
        .insert(lineas)
        .select()

      if (error) throw error
      return data
    },
    onSuccess: (_, lineas) => {
      const facturaId = Array.isArray(lineas) ? lineas[0]?.factura_id : lineas.factura_id
      queryClient.invalidateQueries({ queryKey: ['facturas-lineas', facturaId] })
    }
  })
}

export function useCreateFacturaHistorico() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (historico) => {
      const { data, error } = await supabase
        .from('facturas_consumo_historico')
        .insert(historico)
        .select()

      if (error) throw error
      return data
    },
    onSuccess: (_, historico) => {
      const facturaId = Array.isArray(historico) ? historico[0]?.factura_id : historico.factura_id
      queryClient.invalidateQueries({ queryKey: ['facturas-historico', facturaId] })
    }
  })
}

// =====================================================
// Hooks para Emitir/Anular/Pagar Facturas
// =====================================================

export function useEmitirFactura() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (facturaId) => {
      const { data, error } = await supabase
        .rpc('emitir_factura', { p_factura_id: facturaId })

      if (error) throw error
      return data[0] // { numero, numero_completo }
    },
    onSuccess: (_, facturaId) => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] })
      queryClient.invalidateQueries({ queryKey: ['facturas', facturaId] })
      queryClient.invalidateQueries({ queryKey: ['lecturas'] })
    }
  })
}

export function useEmitirFacturasMasivo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (facturaIds) => {
      const results = []
      
      for (const id of facturaIds) {
        try {
          const { data, error } = await supabase
            .rpc('emitir_factura', { p_factura_id: id })
          
          if (error) throw error
          results.push({ id, success: true, data: data[0] })
        } catch (err) {
          results.push({ id, success: false, error: err.message })
        }
      }
      
      return results
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] })
      queryClient.invalidateQueries({ queryKey: ['lecturas'] })
    }
  })
}

export function useAnularFactura() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ facturaId, motivo }) => {
      const { data, error } = await supabase
        .rpc('anular_factura', { 
          p_factura_id: facturaId, 
          p_motivo: motivo 
        })

      if (error) throw error
      return data
    },
    onSuccess: (_, { facturaId }) => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] })
      queryClient.invalidateQueries({ queryKey: ['facturas', facturaId] })
      queryClient.invalidateQueries({ queryKey: ['lecturas'] })
    }
  })
}

export function useMarcarPagada() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ facturaId, fechaPago }) => {
      const { data, error } = await supabase
        .rpc('marcar_factura_pagada', { 
          p_factura_id: facturaId, 
          p_fecha_pago: fechaPago || new Date().toISOString().split('T')[0]
        })

      if (error) throw error
      return data
    },
    onSuccess: (_, { facturaId }) => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] })
      queryClient.invalidateQueries({ queryKey: ['facturas', facturaId] })
    }
  })
}

// =====================================================
// Hooks para Lecturas Pendientes de Facturar
// =====================================================

export function useLecturasPendientesFacturar(options = {}) {
  const { comunidadId, periodoInicio, periodoFin } = options

  return useQuery({
    queryKey: ['lecturas-pendientes-facturar', { comunidadId, periodoInicio, periodoFin }],
    queryFn: async () => {
      let query = supabase
        .from('v_lecturas_pendientes_facturar')
        .select('*')
        .order('comunidad_nombre')
        .order('agrupacion_nombre')
        .order('ubicacion_nombre')

      if (comunidadId) {
        query = query.eq('comunidad_id', comunidadId)
      }

      if (periodoInicio) {
        query = query.gte('fecha_lectura', periodoInicio)
      }

      if (periodoFin) {
        query = query.lte('fecha_lectura', periodoFin)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    }
  })
}

// =====================================================
// Hooks para Histórico de Consumo
// =====================================================

export function useHistoricoConsumo(contadorId, conceptoId, meses = 6) {
  return useQuery({
    queryKey: ['historico-consumo', contadorId, conceptoId, meses],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_historico_consumo', {
          p_contador_id: contadorId,
          p_concepto_id: conceptoId,
          p_meses: meses
        })

      if (error) throw error
      return data || []
    },
    enabled: !!contadorId && !!conceptoId
  })
}

// =====================================================
// Hooks de Estadísticas
// =====================================================

export function useEstadisticasFacturacion(options = {}) {
  const { comunidadId, periodoInicio, periodoFin } = options

  return useQuery({
    queryKey: ['estadisticas-facturacion', { comunidadId, periodoInicio, periodoFin }],
    queryFn: async () => {
      let query = supabase
        .from('facturas')
        .select('estado, total')

      if (comunidadId) {
        query = query.eq('comunidad_id', comunidadId)
      }

      if (periodoInicio) {
        query = query.gte('fecha_factura', periodoInicio)
      }

      if (periodoFin) {
        query = query.lte('fecha_factura', periodoFin)
      }

      const { data, error } = await query
      if (error) throw error

      // Calcular estadísticas
      const stats = {
        total: data.length,
        borradores: 0,
        emitidas: 0,
        pagadas: 0,
        anuladas: 0,
        importeTotal: 0,
        importePendiente: 0,
        importeCobrado: 0
      }

      data.forEach(f => {
        switch (f.estado) {
          case 'borrador':
            stats.borradores++
            break
          case 'emitida':
            stats.emitidas++
            stats.importePendiente += Number(f.total)
            stats.importeTotal += Number(f.total)
            break
          case 'pagada':
            stats.pagadas++
            stats.importeCobrado += Number(f.total)
            stats.importeTotal += Number(f.total)
            break
          case 'anulada':
            stats.anuladas++
            break
        }
      })

      return stats
    }
  })
}

/**
 * Hook para obtener las líneas de una factura específica
 */
export function useLineasFactura(facturaId) {
  return useQuery({
    queryKey: ['facturas', facturaId, 'lineas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facturas_lineas')
        .select('*')
        .eq('factura_id', facturaId)
        .order('orden')

      if (error) throw error
      return data
    },
    enabled: !!facturaId
  })
}

/**
 * Hook para actualizar una línea de factura
 */
export function useUpdateLineaFactura() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ lineaId, facturaId, updates }) => {
      const { data, error} = await supabase
        .from('facturas_lineas')
        .update(updates)
        .eq('id', lineaId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { facturaId }) => {
      queryClient.invalidateQueries({ queryKey: ['facturas', facturaId, 'lineas'] })
      queryClient.invalidateQueries({ queryKey: ['facturas', facturaId] })
    }
  })
}

/**
 * Hook para eliminar una línea de factura
 */
export function useDeleteLineaFactura() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ lineaId, facturaId }) => {
      const { error } = await supabase
        .from('facturas_lineas')
        .delete()
        .eq('id', lineaId)

      if (error) throw error
    },
    onSuccess: (_, { facturaId }) => {
      queryClient.invalidateQueries({ queryKey: ['facturas', facturaId, 'lineas'] })
      queryClient.invalidateQueries({ queryKey: ['facturas', facturaId] })
    }
  })
}

/**
 * Hook para crear una nueva línea de factura
 */
export function useCreateLineaFactura() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (lineaData) => {
      const { data, error } = await supabase
        .from('facturas_lineas')
        .insert(lineaData)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      const facturaId = data.factura_id
      queryClient.invalidateQueries({ queryKey: ['facturas', facturaId, 'lineas'] })
      queryClient.invalidateQueries({ queryKey: ['facturas', facturaId] })
    }
  })
}



