import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/**
 * Hook para obtener lista de usuarios
 */
export function useUsuarios() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_usuarios')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    }
  })
}

/**
 * Hook para crear usuario
 * Usa signUp de Supabase (sin verificación de email si está deshabilitado)
 */
export function useCrearUsuario() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ email, password, nombreCompleto }) => {
      // Validaciones básicas
      if (!email || !password || !nombreCompleto) {
        throw new Error('Todos los campos son requeridos')
      }
      
      if (password.length < 3) {
        throw new Error('La contraseña debe tener al menos 3 caracteres')
      }
      
      // Crear usuario usando signUp
      // El trigger handle_new_user() creará automáticamente el perfil
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre_completo: nombreCompleto
          },
          emailRedirectTo: window.location.origin
        }
      })
      
      if (error) throw error
      
      // Si Supabase requiere confirmación de email pero está deshabilitado,
      // el usuario se crea igualmente
      return {
        user: data.user,
        email,
        nombreCompleto
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    }
  })
}

/**
 * Hook para actualizar usuario (nombre y estado activo)
 */
export function useActualizarUsuario() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, nombreCompleto, activo }) => {
      const { error } = await supabase
        .rpc('actualizar_usuario', {
          p_user_id: userId,
          p_nombre_completo: nombreCompleto,
          p_activo: activo
        })
      
      if (error) throw error
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    }
  })
}

/**
 * Hook para resetear contraseña de usuario
 * Nota: Esta funcionalidad requiere configuración adicional
 * Por ahora solo envía email de recuperación
 */
export function useResetearPassword() {
  return useMutation({
    mutationFn: async ({ email }) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })
      
      if (error) throw error
      return { success: true }
    }
  })
}

/**
 * Hook para eliminar usuario
 * Solo admins pueden eliminar usuarios (excepto otros admins y a sí mismos)
 */
export function useEliminarUsuario() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId }) => {
      const { error } = await supabase
        .rpc('eliminar_usuario', {
          p_user_id: userId
        })
      
      if (error) throw error
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    }
  })
}
