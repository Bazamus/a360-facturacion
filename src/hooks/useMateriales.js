import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Lista de materiales con filtros
export function useMateriales({ categoria, search, soloActivos = true } = {}) {
  return useQuery({
    queryKey: ['materiales', { categoria, search, soloActivos }],
    queryFn: async () => {
      let query = supabase
        .from('materiales')
        .select('*')
        .order('nombre')

      if (soloActivos) query = query.eq('activo', true)
      if (categoria) query = query.eq('categoria', categoria)
      if (search) {
        query = query.or(
          `nombre.ilike.%${search}%,referencia.ilike.%${search}%,descripcion.ilike.%${search}%`
        )
      }

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })
}

// Material individual
export function useMaterial(id) {
  return useQuery({
    queryKey: ['material', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materiales')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

// Crear material
export function useCrearMaterial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (material) => {
      const { data, error } = await supabase
        .from('materiales')
        .insert(material)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiales'] })
    },
  })
}

// Actualizar material
export function useActualizarMaterial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('materiales')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['materiales'] })
      queryClient.invalidateQueries({ queryKey: ['material', variables.id] })
    },
  })
}
