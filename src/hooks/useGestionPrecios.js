import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ──────────────────────────────────────────────
// QUERIES
// ──────────────────────────────────────────────

/**
 * Valores mensuales de referencia energética (P6 NATURGY o MIBGAS)
 */
export function useReferenciasEnergia(tipo, anio) {
  return useQuery({
    queryKey: ['referencias-energia', tipo, anio],
    queryFn: async () => {
      const query = supabase
        .from('precios_referencias_mercado')
        .select('*')
        .order('mes', { ascending: true })

      if (tipo) query.eq('tipo', tipo)
      if (anio) query.eq('anio', anio)

      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: !!tipo || !!anio
  })
}

/**
 * Descuentos vigentes (no expirados)
 */
export function useDescuentosVigentes(comunidadId) {
  return useQuery({
    queryKey: ['descuentos', comunidadId],
    queryFn: async () => {
      let query = supabase
        .from('descuentos')
        .select(`
          *,
          comunidad:comunidades(id, nombre, codigo),
          concepto:conceptos(id, codigo, nombre)
        `)
        .gte('fecha_fin', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false })

      if (comunidadId) {
        query = query.eq('comunidad_id', comunidadId)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    }
  })
}

/**
 * Historial de ajustes de precios con paginación
 */
export function useHistorialAjustes({ page = 1, pageSize = 20 } = {}) {
  return useQuery({
    queryKey: ['historial-ajustes', page, pageSize],
    queryFn: async () => {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data, error, count } = await supabase
        .from('historial_ajustes_precios')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      return { data, count }
    }
  })
}

// ──────────────────────────────────────────────
// MUTATIONS
// ──────────────────────────────────────────────

/**
 * Registrar (upsert) valor mensual de referencia energética
 */
export function useRegistrarReferencia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ tipo, anio, mes, valor }) => {
      const { data, error } = await supabase
        .from('precios_referencias_mercado')
        .upsert(
          { tipo, anio, mes, valor },
          { onConflict: 'tipo,anio,mes' }
        )
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referencias-energia'] })
    }
  })
}

/**
 * Llama RPC aplicar_factor_precios
 */
export function useAplicarFactorPrecios() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      comunidadIds,
      conceptoCodigos,
      factor,
      tipoAjuste,
      referencia,
      valorAnterior,
      valorActual,
      porcentajeIpc
    }) => {
      const { data, error } = await supabase.rpc('aplicar_factor_precios', {
        p_comunidad_ids: comunidadIds,
        p_concepto_codigos: conceptoCodigos,
        p_factor: factor,
        p_tipo_ajuste: tipoAjuste,
        p_referencia: referencia || null,
        p_valor_anterior: valorAnterior || null,
        p_valor_actual: valorActual || null,
        p_porcentaje_ipc: porcentajeIpc || null
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['precios'] })
      queryClient.invalidateQueries({ queryKey: ['historial-ajustes'] })
    }
  })
}

/**
 * Llama RPC get_preview_actualizacion_precios
 */
export function usePreviewActualizacion() {
  return useMutation({
    mutationFn: async ({ comunidadIds, conceptoCodigos, factor }) => {
      const { data, error } = await supabase.rpc('get_preview_actualizacion_precios', {
        p_comunidad_ids: comunidadIds,
        p_concepto_codigos: conceptoCodigos,
        p_factor: factor
      })

      if (error) throw error
      return data
    }
  })
}

/**
 * Llama RPC recalcular_facturas_con_nuevos_precios
 */
export function useRecalcularFacturas() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ comunidadIds, conceptoCodigos }) => {
      const { data, error } = await supabase.rpc('recalcular_facturas_con_nuevos_precios', {
        p_comunidad_ids: comunidadIds,
        p_concepto_codigos: conceptoCodigos
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] })
    }
  })
}

/**
 * Crear descuento puntual
 */
export function useCrearDescuento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ comunidadId, conceptoId, porcentaje, motivo, fechaInicio, fechaFin }) => {
      const { data, error } = await supabase
        .from('descuentos')
        .insert({
          comunidad_id: comunidadId,
          concepto_id: conceptoId,
          porcentaje,
          motivo,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin
        })
        .select(`
          *,
          comunidad:comunidades(id, nombre, codigo),
          concepto:conceptos(id, codigo, nombre)
        `)
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['descuentos'] })
    }
  })
}

/**
 * Eliminar descuento (solo si aplicado=false)
 */
export function useEliminarDescuento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (descuentoId) => {
      const { error } = await supabase
        .from('descuentos')
        .delete()
        .eq('id', descuentoId)
        .eq('aplicado', false)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['descuentos'] })
    }
  })
}
