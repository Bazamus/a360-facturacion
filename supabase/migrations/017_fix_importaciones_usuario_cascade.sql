-- =====================================================
-- Migración 017: Corregir CASCADE en importaciones.usuario_id
-- Permite eliminar usuarios aunque tengan importaciones asociadas
-- Las importaciones se mantienen con usuario_id = NULL
-- Fecha: Enero 2026
-- =====================================================

-- Primero, hacer que el campo usuario_id acepte NULL (si no lo hace ya)
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
