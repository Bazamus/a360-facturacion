import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/**
 * Hook para obtener configuración general del sistema
 * Obtiene configuraciones clave como serie_facturacion e iva_porcentaje
 */
export function useConfiguracion() {
  return useQuery({
    queryKey: ['configuracion'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracion')
        .select('*')
        .in('clave', ['serie_facturacion', 'iva_porcentaje'])
      
      if (error) throw error
      
      // Transformar array a objeto para fácil acceso
      const config = {}
      data?.forEach(item => {
        config[item.clave] = typeof item.valor === 'string' 
          ? JSON.parse(item.valor) 
          : item.valor
      })
      
      return config
    }
  })
}

/**
 * Hook para actualizar la secuencia de facturas
 * Llama a la función RPC actualizar_secuencia_facturas
 * Incluye validaciones de seguridad en el backend
 */
export function useActualizarSecuenciaFacturas() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ nuevoNumero }) => {
      const { data, error } = await supabase
        .rpc('actualizar_secuencia_facturas', {
          p_nuevo_numero: nuevoNumero
        })
      
      if (error) throw error
      return data[0] // Retorna { numero_anterior, numero_nuevo, secuencia_actualizada }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracion'] })
      queryClient.invalidateQueries({ queryKey: ['facturas'] })
    }
  })
}
