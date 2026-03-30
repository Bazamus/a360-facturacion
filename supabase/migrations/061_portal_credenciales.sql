BEGIN;

-- ============================================================
-- 061: Portal - credenciales, gestión portal, documentos
-- SEGURIDAD: ADD COLUMN en profiles (tabla propia), crear tabla nueva
-- ============================================================

-- 1. Añadir campo puede_gestionar_portal a profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS puede_gestionar_portal BOOLEAN DEFAULT false;

-- 2. Actualizar RPC actualizar_usuario para incluir puede_gestionar_portal
CREATE OR REPLACE FUNCTION actualizar_usuario(
  p_user_id UUID,
  p_nombre_completo TEXT,
  p_activo BOOLEAN,
  p_rol TEXT DEFAULT NULL,
  p_puede_gestionar_portal BOOLEAN DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden modificar usuarios';
  END IF;

  IF p_user_id != auth.uid() AND EXISTS (
    SELECT 1 FROM profiles WHERE id = p_user_id AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'No puedes modificar a otro administrador';
  END IF;

  UPDATE profiles
  SET nombre_completo = trim(p_nombre_completo),
      activo = p_activo,
      rol = COALESCE(p_rol, rol),
      puede_gestionar_portal = COALESCE(p_puede_gestionar_portal, puede_gestionar_portal),
      updated_at = now()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Actualizar vista v_usuarios para incluir puede_gestionar_portal
DROP VIEW IF EXISTS v_usuarios;
CREATE VIEW v_usuarios AS
SELECT
  p.id,
  au.email,
  p.nombre_completo,
  p.rol,
  p.activo,
  p.puede_gestionar_portal,
  au.created_at,
  au.last_sign_in_at,
  p.updated_at
FROM profiles p
JOIN auth.users au ON au.id = p.id
ORDER BY p.created_at DESC;

-- 4. RPC: obtener clientes sin cuenta de portal
CREATE OR REPLACE FUNCTION verificar_clientes_sin_cuenta()
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  apellidos TEXT,
  email TEXT,
  codigo_cliente TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.nombre, c.apellidos, c.email, c.codigo_cliente
  FROM clientes c
  WHERE c.email IS NOT NULL
    AND c.email != ''
    AND NOT EXISTS (
      SELECT 1 FROM auth.users u WHERE u.email = c.email
    )
  ORDER BY c.apellidos, c.nombre;
END;
$$;

GRANT EXECUTE ON FUNCTION verificar_clientes_sin_cuenta TO authenticated;

-- 5. RPC: estadísticas del portal para gestores
CREATE OR REPLACE FUNCTION get_portal_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_clientes', (SELECT COUNT(*) FROM clientes WHERE email IS NOT NULL AND email != ''),
    'clientes_con_cuenta', (
      SELECT COUNT(DISTINCT c.id) FROM clientes c
      INNER JOIN auth.users u ON u.email = c.email
      INNER JOIN profiles p ON p.id = u.id AND p.rol = 'cliente'
    ),
    'clientes_sin_cuenta', (
      SELECT COUNT(*) FROM clientes c
      WHERE c.email IS NOT NULL AND c.email != ''
      AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.email = c.email)
    ),
    'tickets_portal', (
      SELECT COUNT(*) FROM tickets_sat WHERE origen = 'portal_cliente' AND estado NOT IN ('resuelto', 'cerrado')
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_portal_admin_stats TO authenticated;

-- 6. Tabla: documentos_cliente
CREATE TABLE IF NOT EXISTS documentos_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'otro'
    CHECK (tipo IN ('contrato', 'presupuesto', 'certificado', 'otro')),
  descripcion TEXT,
  storage_path TEXT NOT NULL,
  tamanio_bytes BIGINT,
  subido_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documentos_cliente ON documentos_cliente(cliente_id);

ALTER TABLE documentos_cliente ENABLE ROW LEVEL SECURITY;

-- Admin y gestores portal pueden gestionar documentos
CREATE POLICY "Gestores gestionan documentos"
  ON documentos_cliente FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.rol = 'admin' OR profiles.puede_gestionar_portal = true)
    )
  );

-- Cliente lee sus documentos
CREATE POLICY "Cliente ve sus documentos"
  ON documentos_cliente FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.rol = 'cliente'
    )
    AND cliente_id IN (
      SELECT c.id FROM clientes c
      WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

COMMIT;
