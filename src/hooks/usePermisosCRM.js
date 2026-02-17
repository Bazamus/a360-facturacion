import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

export function usePermisoCRM(recurso, accion) {
  const { profile } = useAuth()

  return useQuery({
    queryKey: ['permiso-crm', profile?.rol, recurso, accion],
    queryFn: async () => {
      if (profile?.rol === 'admin') {
        return { tiene_permiso: true, condicion: null }
      }

      const { data, error } = await supabase
        .rpc('verificar_permiso_crm', {
          p_recurso: recurso,
          p_accion: accion
        })

      if (error) throw error
      return data?.[0] || { tiene_permiso: false, condicion: null }
    },
    enabled: !!profile?.rol && !!recurso && !!accion,
    staleTime: 5 * 60 * 1000,
  })
}
