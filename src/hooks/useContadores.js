import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// =====================================================
// Hooks para Contadores
// =====================================================

export function useContadores(options = {}) {
  const { search, comunidadId, conceptoId, activo } = options

  return useQuery({
    queryKey: ['contadores', { search, comunidadId, conceptoId, activo }],
    queryFn: async () => {
      let query = supabase
        .from('v_contadores_completos')
        .select('*')
        .order('comunidad_nombre')
        .order('agrupacion_nombre')
        .order('ubicacion_nombre')

      if (search) {
        query = query.ilike('numero_serie', `%${search}%`)
      }

      if (comunidadId) {
        query = query.eq('comunidad_id', comunidadId)
      }

      if (conceptoId) {
        query = query.eq('concepto_id', conceptoId)
      }

      if (activo !== undefined) {
        query = query.eq('contador_activo', activo)
      }

      const { data, error } = await query

      if (error) throw error
      
      // Agrupar conceptos por contador
      const contadoresMap = new Map()
      data.forEach(row => {
        if (!contadoresMap.has(row.contador_id)) {
          contadoresMap.set(row.contador_id, {
            id: row.contador_id,
            numero_serie: row.numero_serie,
            marca: row.marca,
            modelo: row.modelo,
            activo: row.contador_activo,
            ubicacion_id: row.ubicacion_id,
            ubicacion_nombre: row.ubicacion_nombre,
            agrupacion_id: row.agrupacion_id,
            agrupacion_nombre: row.agrupacion_nombre,
            comunidad_id: row.comunidad_id,
            comunidad_nombre: row.comunidad_nombre,
            comunidad_codigo: row.comunidad_codigo,
            conceptos: []
          })
        }
        
        if (row.concepto_id) {
          contadoresMap.get(row.contador_id).conceptos.push({
            id: row.concepto_id,
            codigo: row.concepto_codigo,
            nombre: row.concepto_nombre,
            unidad_medida: row.unidad_medida,
            es_termino_fijo: row.es_termino_fijo,
            lectura_inicial: row.lectura_inicial,
            lectura_actual: row.lectura_actual,
            fecha_lectura_actual: row.fecha_lectura_actual,
            precio_unitario: row.precio_unitario
          })
        }
      })

      return Array.from(contadoresMap.values())
    }
  })
}

// Lista simple de contadores
export function useContadoresSimple(ubicacionId) {
  return useQuery({
    queryKey: ['contadores', 'ubicacion', ubicacionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contadores')
        .select('*')
        .eq('ubicacion_id', ubicacionId)
        .eq('activo', true)
        .order('numero_serie')

      if (error) throw error
      return data
    },
    enabled: !!ubicacionId
  })
}

// Obtener contador por ID
export function useContador(id) {
  return useQuery({
    queryKey: ['contadores', id],
    queryFn: async () => {
      const { data: contador, error } = await supabase
        .from('contadores')
        .select(`
          *,
          ubicacion:ubicaciones(
            id,
            nombre,
            agrupacion:agrupaciones(
              id,
              nombre,
              comunidad:comunidades(id, nombre, codigo)
            )
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      // Obtener conceptos asignados
      const { data: conceptos, error: errorConceptos } = await supabase
        .from('contadores_conceptos')
        .select(`
          *,
          concepto:conceptos(id, codigo, nombre, unidad_medida, es_termino_fijo)
        `)
        .eq('contador_id', id)
        .eq('activo', true)

      if (errorConceptos) throw errorConceptos

      return { ...contador, conceptos }
    },
    enabled: !!id
  })
}

// Crear contador
export function useCreateContador() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data) => {
      const { data: result, error } = await supabase
        .from('contadores')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contadores'] })
      queryClient.invalidateQueries({ queryKey: ['comunidades'] })
    }
  })
}

// Actualizar contador
export function useUpdateContador() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const { data: result, error } = await supabase
        .from('contadores')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['contadores'] })
      queryClient.invalidateQueries({ queryKey: ['contadores', id] })
    }
  })
}

// Desactivar contador
export function useDeleteContador() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('contadores')
        .update({ activo: false })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contadores'] })
      queryClient.invalidateQueries({ queryKey: ['comunidades'] })
    }
  })
}

// =====================================================
// Hooks para Conceptos de Contador
// =====================================================

export function useAsignarConcepto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data) => {
      // Verificar si ya existe el registro (activo o inactivo)
      const { data: existing } = await supabase
        .from('contadores_conceptos')
        .select('id, activo')
        .eq('contador_id', data.contador_id)
        .eq('concepto_id', data.concepto_id)
        .maybeSingle()

      if (existing) {
        // Ya existe - actualizar con nuevos valores
        const { data: result, error } = await supabase
          .from('contadores_conceptos')
          .update({
            lectura_inicial: data.lectura_inicial || 0,
            lectura_actual: data.lectura_inicial || 0,
            fecha_lectura_inicial: data.fecha_lectura_inicial || new Date().toISOString().split('T')[0],
            fecha_lectura_actual: data.fecha_lectura_inicial || new Date().toISOString().split('T')[0],
            activo: true
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) throw error
        return result
      } else {
        // No existe - insertar nuevo
        const { data: result, error } = await supabase
          .from('contadores_conceptos')
          .insert({
            contador_id: data.contador_id,
            concepto_id: data.concepto_id,
            lectura_inicial: data.lectura_inicial || 0,
            lectura_actual: data.lectura_inicial || 0,
            fecha_lectura_inicial: data.fecha_lectura_inicial || new Date().toISOString().split('T')[0],
            fecha_lectura_actual: data.fecha_lectura_inicial || new Date().toISOString().split('T')[0],
            activo: true
          })
          .select()
          .single()

        if (error) throw error
        return result
      }
    },
    onSuccess: (_, { contador_id }) => {
      queryClient.invalidateQueries({ queryKey: ['contadores'] })
      queryClient.invalidateQueries({ queryKey: ['contadores', contador_id] })
    }
  })
}

export function useDesasignarConcepto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ contadorId, conceptoId }) => {
      const { error } = await supabase
        .from('contadores_conceptos')
        .update({ activo: false })
        .eq('contador_id', contadorId)
        .eq('concepto_id', conceptoId)

      if (error) throw error
    },
    onSuccess: (_, { contadorId }) => {
      queryClient.invalidateQueries({ queryKey: ['contadores'] })
      queryClient.invalidateQueries({ queryKey: ['contadores', contadorId] })
    }
  })
}






