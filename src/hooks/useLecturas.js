import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

// =====================================================
// Hooks para Importaciones
// =====================================================

export function useImportaciones(options = {}) {
  const { comunidadId, estado, limit = 50 } = options

  return useQuery({
    queryKey: ['importaciones', { comunidadId, estado, limit }],
    queryFn: async () => {
      let query = supabase
        .from('v_importaciones_resumen')
        .select('*')
        .order('fecha_subida', { ascending: false })
        .limit(limit)

      if (comunidadId) {
        query = query.eq('comunidad_id', comunidadId)
      }

      if (estado) {
        query = query.eq('estado', estado)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    }
  })
}

export function useImportacion(id) {
  return useQuery({
    queryKey: ['importaciones', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('importaciones')
        .select(`
          *,
          comunidad:comunidades(id, nombre, codigo)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id
  })
}

export function useCreateImportacion() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase
        .from('importaciones')
        .insert({
          ...data,
          usuario_id: user?.id
        })
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importaciones'] })
    }
  })
}

export function useUpdateImportacion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: result, error } = await supabase
        .from('importaciones')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['importaciones'] })
      queryClient.invalidateQueries({ queryKey: ['importaciones', id] })
    }
  })
}

// =====================================================
// Hooks para Importaciones Detalle
// =====================================================

export function useImportacionDetalle(importacionId, options = {}) {
  const { estado } = options

  return useQuery({
    queryKey: ['importaciones-detalle', importacionId, { estado }],
    queryFn: async () => {
      // Primero obtener los detalles con contador y concepto
      let query = supabase
        .from('importaciones_detalle')
        .select(`
          *,
          contador:contadores(id, numero_serie, ubicacion_id),
          concepto:conceptos(id, codigo, nombre, unidad_medida)
        `)
        .eq('importacion_id', importacionId)
        .order('fila_numero')

      if (estado) {
        query = query.eq('estado', estado)
      }

      const { data, error } = await query
      if (error) throw error

      // Si hay datos y algunos tienen cliente_id, obtener info de clientes
      if (data && data.length > 0) {
        const clienteIds = [...new Set(data.filter(d => d.cliente_id).map(d => d.cliente_id))]

        if (clienteIds.length > 0) {
          // Usar filter instead of in() para evitar errores de encoding
          const { data: clientes, error: clientesError } = await supabase
            .from('clientes')
            .select('id, nombre, apellidos, nif, bloqueado')
            .or(clienteIds.map(id => `id.eq.${id}`).join(','))

          if (!clientesError && clientes) {
            // Mapear clientes a los detalles
            const clientesMap = new Map(clientes.map(c => [c.id, c]))
            data.forEach(detalle => {
              detalle.cliente = detalle.cliente_id ? clientesMap.get(detalle.cliente_id) || null : null
            })
          }
        } else {
          // No hay cliente_ids, inicializar cliente como null
          data.forEach(detalle => {
            detalle.cliente = null
          })
        }
      }

      return data
    },
    enabled: !!importacionId
  })
}

export function useCreateImportacionDetalle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (items) => {
      // Permitir insertar múltiples filas
      const { data, error } = await supabase
        .from('importaciones_detalle')
        .insert(items)
        .select()

      if (error) throw error
      return data
    },
    onSuccess: (_, items) => {
      const importacionId = Array.isArray(items) ? items[0]?.importacion_id : items.importacion_id
      queryClient.invalidateQueries({ queryKey: ['importaciones-detalle', importacionId] })
    }
  })
}

export function useUpdateImportacionDetalle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: result, error } = await supabase
        .from('importaciones_detalle')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['importaciones-detalle', result.importacion_id] })
    }
  })
}

export function useDescartarFilas() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ids, importacionId }) => {
      const { error } = await supabase
        .from('importaciones_detalle')
        .update({ estado: 'descartado' })
        .in('id', ids)

      if (error) throw error
      return { ids, importacionId }
    },
    onSuccess: (_, { importacionId }) => {
      queryClient.invalidateQueries({ queryKey: ['importaciones-detalle', importacionId] })
    }
  })
}

// =====================================================
// Hooks para Confirmar Importación
// =====================================================

export function useConfirmarImportacion() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (importacionId) => {
      // Llamar a la función de BD
      const { data, error } = await supabase
        .rpc('confirmar_importacion', {
          p_importacion_id: importacionId,
          p_usuario_id: user?.id
        })

      if (error) throw error
      return { importacionId, count: data }
    },
    onSuccess: (_, importacionId) => {
      queryClient.invalidateQueries({ queryKey: ['importaciones'] })
      queryClient.invalidateQueries({ queryKey: ['importaciones', importacionId] })
      queryClient.invalidateQueries({ queryKey: ['importaciones-detalle', importacionId] })
      queryClient.invalidateQueries({ queryKey: ['lecturas'] })
    }
  })
}

// =====================================================
// Hooks para Lecturas
// =====================================================

export function useLecturas(options = {}) {
  const { contadorId, conceptoId, clienteId, facturada, limit = 100 } = options

  return useQuery({
    queryKey: ['lecturas', { contadorId, conceptoId, clienteId, facturada, limit }],
    queryFn: async () => {
      let query = supabase
        .from('lecturas')
        .select(`
          *,
          contador:contadores(id, numero_serie),
          concepto:conceptos(id, codigo, nombre, unidad_medida),
          cliente:clientes(id, nombre, apellidos, nif)
        `)
        .order('fecha_lectura', { ascending: false })
        .limit(limit)

      if (contadorId) query = query.eq('contador_id', contadorId)
      if (conceptoId) query = query.eq('concepto_id', conceptoId)
      if (clienteId) query = query.eq('cliente_id', clienteId)
      if (facturada !== undefined) query = query.eq('facturada', facturada)

      const { data, error } = await query
      if (error) throw error
      return data
    }
  })
}

export function useLecturasPendientes(comunidadId) {
  return useQuery({
    queryKey: ['lecturas', 'pendientes', comunidadId],
    queryFn: async () => {
      // Obtener lecturas no facturadas
      let query = supabase
        .from('lecturas')
        .select(`
          *,
          contador:contadores(
            id, 
            numero_serie,
            ubicacion:ubicaciones(
              id,
              nombre,
              agrupacion:agrupaciones(
                id,
                nombre,
                comunidad:comunidades(id, nombre, codigo)
              )
            )
          ),
          concepto:conceptos(id, codigo, nombre, unidad_medida),
          cliente:clientes(id, nombre, apellidos, nif, email)
        `)
        .eq('facturada', false)
        .order('fecha_lectura', { ascending: false })

      const { data, error } = await query
      if (error) throw error
      
      // Filtrar por comunidad si se especifica
      if (comunidadId) {
        return data.filter(l => 
          l.contador?.ubicacion?.agrupacion?.comunidad?.id === comunidadId
        )
      }
      
      return data
    },
    enabled: true
  })
}

// =====================================================
// Hooks para Alertas Configuración
// =====================================================

export function useAlertasConfiguracion() {
  return useQuery({
    queryKey: ['alertas-configuracion'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alertas_configuracion')
        .select('*')
        .order('tipo')

      if (error) throw error
      
      // Convertir a objeto indexado por tipo
      const config = {}
      data.forEach(a => {
        config[a.tipo] = a
      })
      return config
    },
    staleTime: 1000 * 60 * 10 // 10 minutos
  })
}

export function useUpdateAlertaConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: result, error } = await supabase
        .from('alertas_configuracion')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas-configuracion'] })
    }
  })
}

// =====================================================
// Hooks de Utilidad
// =====================================================

export function useContadorByNumeroSerie(numeroSerie) {
  return useQuery({
    queryKey: ['contador-serie', numeroSerie],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_contadores_completos')
        .select('*')
        .eq('numero_serie', numeroSerie)

      if (error) throw error
      return data
    },
    enabled: !!numeroSerie
  })
}

export function useUltimaLectura(contadorId, conceptoId) {
  return useQuery({
    queryKey: ['ultima-lectura', contadorId, conceptoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lecturas')
        .select('lectura_valor, fecha_lectura')
        .eq('contador_id', contadorId)
        .eq('concepto_id', conceptoId)
        .order('fecha_lectura', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
      return data || null
    },
    enabled: !!contadorId && !!conceptoId
  })
}

export function useMediaConsumo(contadorId, conceptoId) {
  return useQuery({
    queryKey: ['media-consumo', contadorId, conceptoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_media_consumo', {
          p_contador_id: contadorId,
          p_concepto_id: conceptoId,
          p_meses: 12
        })

      if (error) throw error
      return data || 0
    },
    enabled: !!contadorId && !!conceptoId
  })
}





