import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Hook para obtener configuraciones de reportes del usuario
 */
export function useConfiguracionesUsuario() {
  return useQuery({
    queryKey: ['reportes-configuraciones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_reportes_configuraciones')
        .select('*')
        .order('es_favorito', { ascending: false })
        .order('orden', { ascending: true })
        .order('updated_at', { ascending: false })
      
      if (error) throw error
      return data || []
    }
  })
}

/**
 * Hook para obtener configuraciones por tipo de reporte
 */
export function useConfiguracionesPorTipo(tipoReporte) {
  return useQuery({
    queryKey: ['reportes-configuraciones', tipoReporte],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_reportes_configuraciones')
        .select('*')
        .eq('tipo_reporte', tipoReporte)
        .order('es_favorito', { ascending: false })
        .order('orden', { ascending: true })
      
      if (error) throw error
      return data || []
    },
    enabled: !!tipoReporte
  })
}

/**
 * Hook para obtener una configuración específica
 */
export function useConfiguracionReporte(id) {
  return useQuery({
    queryKey: ['reportes-configuraciones', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_reportes_configuraciones')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!id
  })
}

/**
 * Hook para guardar nueva configuración
 */
export function useGuardarConfiguracion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (config) => {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.user) {
        throw new Error('Usuario no autenticado')
      }

      const { data, error } = await supabase
        .from('reportes_configuraciones')
        .insert({
          usuario_id: session.session.user.id,
          ...config
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportes-configuraciones'] })
    }
  })
}

/**
 * Hook para actualizar configuración
 */
export function useActualizarConfiguracion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('reportes_configuraciones')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportes-configuraciones'] })
    }
  })
}

/**
 * Hook para eliminar configuración
 */
export function useEliminarConfiguracion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('reportes_configuraciones')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportes-configuraciones'] })
    }
  })
}

/**
 * Hook para marcar como favorito
 */
export function useToggleFavorito() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, esFavorito }) => {
      const { data, error } = await supabase
        .from('reportes_configuraciones')
        .update({ es_favorito: esFavorito })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportes-configuraciones'] })
    }
  })
}

/**
 * Hook para duplicar configuración
 */
export function useDuplicarConfiguracion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, nuevoNombre }) => {
      const { data, error } = await supabase
        .rpc('duplicar_configuracion_reporte', {
          p_configuracion_id: id,
          p_nuevo_nombre: nuevoNombre
        })
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportes-configuraciones'] })
    }
  })
}
