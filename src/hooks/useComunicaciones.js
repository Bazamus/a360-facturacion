import { useMemo } from 'react'
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

// Soft delete: marca plantilla como inactiva en lugar de eliminarla
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
