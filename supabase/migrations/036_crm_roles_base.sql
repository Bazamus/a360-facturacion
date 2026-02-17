-- ============================================================
-- Migracion 036: CRM Roles Base
-- Fase CRM 0 - Cimientos Seguros
-- 
-- IMPACTO: MINIMO
-- - Amplia constraint de profiles.rol (aditivo, no rompe existentes)
-- - Crea tabla nueva crm_permisos
-- - Crea funcion nueva verificar_permiso_crm
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Ampliar constraint de roles en profiles
--    SEGURO: Solo anade valores nuevos, no modifica existentes
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_rol_check' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_rol_check;
    RAISE NOTICE 'Constraint profiles_rol_check eliminado';
  END IF;
  
  ALTER TABLE profiles ADD CONSTRAINT profiles_rol_check 
    CHECK (rol IN ('admin', 'usuario', 'tecnico', 'encargado', 'cliente'));
    
  RAISE NOTICE 'Constraint profiles_rol_check actualizado con nuevos roles CRM';
END $$;

-- ============================================================
-- 2. Tabla de permisos CRM (NUEVA - no toca nada existente)
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_permisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rol TEXT NOT NULL,
  recurso TEXT NOT NULL,
  accion TEXT NOT NULL CHECK (accion IN ('leer', 'crear', 'editar', 'eliminar')),
  condicion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rol, recurso, accion)
);

CREATE INDEX IF NOT EXISTS idx_crm_permisos_rol ON crm_permisos(rol);
CREATE INDEX IF NOT EXISTS idx_crm_permisos_recurso ON crm_permisos(recurso);

-- RLS
ALTER TABLE crm_permisos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer permisos CRM"
  ON crm_permisos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo admin puede modificar permisos CRM"
  ON crm_permisos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );

-- ============================================================
-- 3. Insertar permisos base por rol
-- ============================================================

-- Permisos de tecnico
INSERT INTO crm_permisos (rol, recurso, accion, condicion) VALUES
  ('tecnico', 'intervenciones', 'leer', 'propio'),
  ('tecnico', 'intervenciones', 'crear', NULL),
  ('tecnico', 'intervenciones', 'editar', 'propio'),
  ('tecnico', 'citas', 'leer', 'propio'),
  ('tecnico', 'citas', 'crear', NULL),
  ('tecnico', 'citas', 'editar', 'propio'),
  ('tecnico', 'contratos', 'leer', NULL),
  ('tecnico', 'materiales', 'leer', NULL),
  ('tecnico', 'clientes', 'leer', NULL),
  ('tecnico', 'comunidades', 'leer', NULL)
ON CONFLICT (rol, recurso, accion) DO NOTHING;

-- Permisos de encargado
INSERT INTO crm_permisos (rol, recurso, accion, condicion) VALUES
  ('encargado', 'intervenciones', 'leer', NULL),
  ('encargado', 'intervenciones', 'crear', NULL),
  ('encargado', 'intervenciones', 'editar', NULL),
  ('encargado', 'intervenciones', 'eliminar', NULL),
  ('encargado', 'citas', 'leer', NULL),
  ('encargado', 'citas', 'crear', NULL),
  ('encargado', 'citas', 'editar', NULL),
  ('encargado', 'citas', 'eliminar', NULL),
  ('encargado', 'contratos', 'leer', NULL),
  ('encargado', 'contratos', 'crear', NULL),
  ('encargado', 'contratos', 'editar', NULL),
  ('encargado', 'materiales', 'leer', NULL),
  ('encargado', 'materiales', 'crear', NULL),
  ('encargado', 'materiales', 'editar', NULL),
  ('encargado', 'comunicaciones', 'leer', NULL),
  ('encargado', 'clientes', 'leer', NULL),
  ('encargado', 'comunidades', 'leer', NULL),
  ('encargado', 'facturas', 'leer', NULL),
  ('encargado', 'reportes', 'leer', NULL)
ON CONFLICT (rol, recurso, accion) DO NOTHING;

-- Permisos de cliente (portal)
INSERT INTO crm_permisos (rol, recurso, accion, condicion) VALUES
  ('cliente', 'facturas', 'leer', 'propio'),
  ('cliente', 'contratos', 'leer', 'propio'),
  ('cliente', 'citas', 'leer', 'propio'),
  ('cliente', 'comunicaciones', 'leer', 'propio'),
  ('cliente', 'comunicaciones', 'crear', 'propio')
ON CONFLICT (rol, recurso, accion) DO NOTHING;

-- ============================================================
-- 4. Funcion helper para verificar permisos
-- ============================================================
CREATE OR REPLACE FUNCTION verificar_permiso_crm(
  p_recurso TEXT,
  p_accion TEXT
)
RETURNS TABLE (
  tiene_permiso BOOLEAN,
  condicion TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rol TEXT;
BEGIN
  SELECT profiles.rol INTO v_rol
  FROM profiles
  WHERE profiles.id = auth.uid();
  
  -- Admin siempre tiene permiso total
  IF v_rol = 'admin' THEN
    RETURN QUERY SELECT true::BOOLEAN, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Verificar en tabla de permisos
  RETURN QUERY
  SELECT 
    true::BOOLEAN,
    cp.condicion
  FROM crm_permisos cp
  WHERE cp.rol = v_rol
    AND cp.recurso = p_recurso
    AND cp.accion = p_accion
    AND cp.activo = true;
  
  -- Si no hay filas, no tiene permiso
  IF NOT FOUND THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::TEXT;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION verificar_permiso_crm TO authenticated;

COMMIT;
