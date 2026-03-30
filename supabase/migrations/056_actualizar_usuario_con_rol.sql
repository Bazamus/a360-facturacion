BEGIN;

-- ============================================================
-- 056: Ampliar actualizar_usuario para incluir cambio de rol
-- SEGURIDAD: Solo modifica RPC existente (no toca tablas de produccion)
-- ============================================================

CREATE OR REPLACE FUNCTION actualizar_usuario(
  p_user_id UUID,
  p_nombre_completo TEXT,
  p_activo BOOLEAN,
  p_rol TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Validar que solo admins puedan ejecutar
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden modificar usuarios';
  END IF;

  -- No permitir modificar a otros admins (excepto a sí mismo)
  IF p_user_id != auth.uid() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = p_user_id AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'No puedes modificar a otro administrador';
  END IF;

  -- Actualizar usuario
  UPDATE profiles
  SET nombre_completo = trim(p_nombre_completo),
      activo = p_activo,
      rol = COALESCE(p_rol, rol),
      updated_at = now()
  WHERE id = p_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
