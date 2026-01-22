-- =====================================================
-- Migración 016: Sistema de Gestión de Usuarios
-- Permite a administradores gestionar usuarios desde la UI
-- Fecha: Enero 2026
-- =====================================================

-- =====================================================
-- Vista: v_usuarios
-- Lista completa de usuarios con su información
-- =====================================================

CREATE OR REPLACE VIEW v_usuarios AS
SELECT 
  p.id,
  au.email,
  p.nombre_completo,
  p.rol,
  p.activo,
  au.created_at,
  au.last_sign_in_at,
  p.updated_at
FROM profiles p
JOIN auth.users au ON au.id = p.id
ORDER BY p.created_at DESC;

COMMENT ON VIEW v_usuarios IS 
  'Vista con información completa de usuarios del sistema';

-- =====================================================
-- Función: actualizar_usuario
-- Permite a admins actualizar nombre y estado de usuarios
-- =====================================================

CREATE OR REPLACE FUNCTION actualizar_usuario(
  p_user_id UUID,
  p_nombre_completo TEXT,
  p_activo BOOLEAN
)
RETURNS void AS $$
BEGIN
  -- Validar que solo admins puedan ejecutar
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden actualizar usuarios';
  END IF;
  
  -- Validar que el usuario existe
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;
  
  -- No permitir desactivarse a sí mismo
  IF p_user_id = auth.uid() AND p_activo = false THEN
    RAISE EXCEPTION 'No puedes desactivar tu propia cuenta';
  END IF;
  
  -- Validar nombre completo
  IF p_nombre_completo IS NULL OR length(trim(p_nombre_completo)) < 3 THEN
    RAISE EXCEPTION 'El nombre debe tener al menos 3 caracteres';
  END IF;
  
  -- Actualizar usuario
  UPDATE profiles
  SET nombre_completo = trim(p_nombre_completo),
      activo = p_activo,
      updated_at = now()
  WHERE id = p_user_id;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION actualizar_usuario IS 
  'Actualiza nombre y estado activo de un usuario (solo admins)';

-- =====================================================
-- Función: eliminar_usuario
-- Permite a admins eliminar usuarios del sistema
-- =====================================================

CREATE OR REPLACE FUNCTION eliminar_usuario(
  p_user_id UUID
)
RETURNS void AS $$
BEGIN
  -- Validar que solo admins puedan ejecutar
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden eliminar usuarios';
  END IF;
  
  -- Validar que el usuario existe
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;
  
  -- No permitir eliminarse a sí mismo
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes eliminar tu propia cuenta';
  END IF;
  
  -- No permitir eliminar admins (solo el propio admin puede desactivarse)
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id 
    AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'No se pueden eliminar cuentas de administrador';
  END IF;
  
  -- Eliminar el usuario de auth.users (el CASCADE eliminará automáticamente el perfil)
  -- SECURITY DEFINER permite acceder a auth.users
  DELETE FROM auth.users WHERE id = p_user_id;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION eliminar_usuario IS 
  'Elimina un usuario del sistema (solo admins, no puede eliminar admins ni a sí mismo)';

-- =====================================================
-- Políticas RLS para la vista v_usuarios
-- Solo usuarios autenticados pueden ver usuarios
-- =====================================================

-- Permitir que usuarios autenticados vean la vista
GRANT SELECT ON v_usuarios TO authenticated;
