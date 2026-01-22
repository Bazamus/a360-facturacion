-- =====================================================
-- Migración 017: Corregir CASCADE en tablas con created_by/usuario_id
-- Permite eliminar usuarios aunque tengan registros asociados
-- Los registros se mantienen con created_by/usuario_id = NULL
-- Fecha: Enero 2026
-- =====================================================

-- =====================================================
-- 1. Tabla: importaciones (usuario_id)
-- =====================================================

-- Hacer que el campo usuario_id acepte NULL
ALTER TABLE importaciones 
  ALTER COLUMN usuario_id DROP NOT NULL;

-- Eliminar el constraint actual
ALTER TABLE importaciones 
  DROP CONSTRAINT IF EXISTS importaciones_usuario_id_fkey;

-- Recrear el constraint con ON DELETE SET NULL
ALTER TABLE importaciones 
  ADD CONSTRAINT importaciones_usuario_id_fkey 
  FOREIGN KEY (usuario_id) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

COMMENT ON CONSTRAINT importaciones_usuario_id_fkey ON importaciones IS 
  'Al eliminar un usuario, sus importaciones se mantienen con usuario_id = NULL';

-- =====================================================
-- 2. Tabla: facturas (created_by)
-- =====================================================

-- Hacer que el campo created_by acepte NULL
ALTER TABLE facturas 
  ALTER COLUMN created_by DROP NOT NULL;

-- Eliminar el constraint actual
ALTER TABLE facturas 
  DROP CONSTRAINT IF EXISTS facturas_created_by_fkey;

-- Recrear el constraint con ON DELETE SET NULL
ALTER TABLE facturas 
  ADD CONSTRAINT facturas_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

COMMENT ON CONSTRAINT facturas_created_by_fkey ON facturas IS 
  'Al eliminar un usuario, sus facturas se mantienen con created_by = NULL';

-- =====================================================
-- 3. Tabla: envios (created_by)
-- =====================================================

-- Hacer que el campo created_by acepte NULL
ALTER TABLE envios 
  ALTER COLUMN created_by DROP NOT NULL;

-- Eliminar el constraint actual
ALTER TABLE envios 
  DROP CONSTRAINT IF EXISTS envios_created_by_fkey;

-- Recrear el constraint con ON DELETE SET NULL
ALTER TABLE envios 
  ADD CONSTRAINT envios_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

COMMENT ON CONSTRAINT envios_created_by_fkey ON envios IS 
  'Al eliminar un usuario, sus envíos se mantienen con created_by = NULL';

-- =====================================================
-- 4. Tabla: remesas (created_by)
-- =====================================================

-- Hacer que el campo created_by acepte NULL
ALTER TABLE remesas 
  ALTER COLUMN created_by DROP NOT NULL;

-- Eliminar el constraint actual
ALTER TABLE remesas 
  DROP CONSTRAINT IF EXISTS remesas_created_by_fkey;

-- Recrear el constraint con ON DELETE SET NULL
ALTER TABLE remesas 
  ADD CONSTRAINT remesas_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

COMMENT ON CONSTRAINT remesas_created_by_fkey ON remesas IS 
  'Al eliminar un usuario, sus remesas se mantienen con created_by = NULL';
