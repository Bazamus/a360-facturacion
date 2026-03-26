import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import { applySearchFilters } from '@/utils/buildSearchFilter'

// =====================================================
// Hooks para Facturas
// =====================================================

export function useFacturas(options = {}) {
  const {
    comunidadId,
    estado,
    clienteId,
    search,
    fechaDesde,
    fechaHasta,
    emailEnviado,
    limit = 50,
    offset = 0,
    withCount = false,
    sortBy = 'fecha_factura',
    sortDirection = 'desc'
  } = options

  return useQuery({
    queryKey: ['facturas', { comunidadId, estado, clienteId, search, fechaDesde, fechaHasta, emailEnviado, limit, offset, sortBy, sortDirection }],
    queryFn: async () => {
      // Construir query base con los filtros
      let baseQuery = supabase.from('v_facturas_resumen')
      let countQuery = supabase.from('v_facturas_resumen').select('*', { count: 'exact', head: true })

      // Aplicar filtros a ambas queries
      const applyFilters = (q) => {
        if (comunidadId) q = q.eq('comunidad_id', comunidadId)
        if (estado) q = q.eq('estado', estado)
        if (emailEnviado != null) q = q.eq('email_enviado', emailEnviado)
        if (clienteId) q = q.eq('cliente_id', clienteId)
        if (search) q = applySearchFilters(q, search, ['numero_completo', 'cliente_nombre', 'cliente_nif'])
        if (fechaDesde) q = q.gte('fecha_factura', fechaDesde)
        if (fechaHasta) q = q.lte('fecha_factura', fechaHasta)
        return q
      }

      // Obtener conteo total si se solicita
      let totalCount = null
      if (withCount) {
        countQuery = applyFilters(countQuery)
        const { count, error: countError } = await countQuery
        if (countError) throw countError
        totalCount = count
      }

      // Obtener facturas con paginación y ordenación
      let query = baseQuery
        .select('*')
        .order(sortBy, { ascending: sortDirection === 'asc' })
        .range(offset, offset + limit - 1)

      // Ordenación secundaria para estabilidad
      if (sortBy !== 'created_at') {
        query = query.order('created_at', { ascending: false })
      }

      query = applyFilters(query)

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
          const facturasConCodigo = facturas.map(f => ({
            ...f,
            codigo_cliente: f.cliente_id ? codigosMap[f.cliente_id] || null : null
          }))

          return withCount ? { data: facturasConCodigo, total: totalCount } : facturasConCodigo
        }
      }

      return withCount ? { data: facturas, total: totalCount } : facturas
    }
  })
}

// Obtener TODAS las facturas en lotes (para exportación)
export async function fetchAllFacturas(filters = {}) {
  const { comunidadId, estado, clienteId, search, fechaDesde, fechaHasta, emailEnviado, sortBy = 'fecha_factura', sortDirection = 'desc' } = filters
  const all = []
  let from = 0
  const batchSize = 1000

  while (true) {
    let query = supabase
      .from('v_facturas_resumen')
      .select('*')
      .order(sortBy, { ascending: sortDirection === 'asc' })
      .range(from, from + batchSize - 1)

    if (comunidadId) query = query.eq('comunidad_id', comunidadId)
    if (estado) query = query.eq('estado', estado)
    if (emailEnviado != null) query = query.eq('email_enviado', emailEnviado)
    if (clienteId) query = query.eq('cliente_id', clienteId)
    if (search) query = applySearchFilters(query, search, ['numero_completo', 'cliente_nombre', 'cliente_nif'])
    if (fechaDesde) query = query.gte('fecha_factura', fechaDesde)
    if (fechaHasta) query = query.lte('fecha_factura', fechaHasta)

    if (sortBy !== 'created_at') {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query
    if (error) throw error
    if (!data || data.length === 0) break
    // Mapear cliente_codigo_cliente → codigo_cliente (compatibilidad con export)
    all.push(...data.map(f => ({
      ...f,
      codigo_cliente: f.cliente_codigo_cliente || f.codigo_cliente || null
    })))
    if (data.length < batchSize) break
    from += batchSize
  }

  return all
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
          cliente:clientes(
            id,
            codigo_cliente,
            nombre,
            apellidos,
            nif,
            email,
            telefono,
            telefono_secundario,
            direccion_correspondencia,
            cp_correspondencia,
            ciudad_correspondencia,
            provincia_correspondencia,
            iban,
            estado_id
          )
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

      // Revertir lecturas a no facturadas antes de eliminar la factura
      // (ya que las líneas se eliminan con CASCADE)
      await supabase
        .from('lecturas')
        .update({
          facturada: false,
          factura_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('factura_id', id)

      const { error } = await supabase
        .from('facturas')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] })
      queryClient.invalidateQueries({ queryKey: ['lecturas'] })
      queryClient.invalidateQueries({ queryKey: ['lecturas-pendientes-facturar'] })
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
  const {
    comunidadId,
    periodoInicio,
    periodoFin,
    fechaDesde,
    fechaHasta
  } = options

  // Soportar ambos nombres de parámetros
  const fechaInicio = periodoInicio || fechaDesde
  const fechaFin = periodoFin || fechaHasta

  return useQuery({
    queryKey: ['estadisticas-facturacion', { comunidadId, fechaInicio, fechaFin }],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_factura_stats', {
        p_comunidad_id: comunidadId || null,
        p_fecha_desde: fechaInicio || null,
        p_fecha_hasta: fechaFin || null,
      })

      if (error) throw error
      return data
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

// =====================================================
// Hook para crear factura de abono (total o parcial)
// =====================================================

/**
 * Crea una factura de abono a partir de una factura de cargo.
 * @param facturaId  UUID de la factura original
 * @param lineasIds  Array de UUIDs de facturas_lineas a abonar.
 *                   null o [] = abono total (todas las líneas)
 * Devuelve el UUID de la factura de abono creada.
 */
export function useCrearFacturaAbono() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ facturaId, lineasIds = null }) => {
      const { data, error } = await supabase.rpc('crear_factura_abono', {
        p_factura_id: facturaId,
        p_lineas_ids: lineasIds && lineasIds.length > 0 ? lineasIds : null
      })

      if (error) throw error
      return data
    },
    onSuccess: (_, { facturaId }) => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] })
      queryClient.invalidateQueries({ queryKey: ['facturas', facturaId] })
      queryClient.invalidateQueries({ queryKey: ['facturas-lineas', facturaId] })
      queryClient.invalidateQueries({ queryKey: ['lecturas'] })
      queryClient.invalidateQueries({ queryKey: ['lecturas-pendientes-facturar'] })
    }
  })
}



