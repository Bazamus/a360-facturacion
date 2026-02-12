-- =====================================================
-- MIGRACIÓN: Permisos colaborativos para comentarios
-- =====================================================
-- Permite a todos los usuarios autenticados actualizar
-- el estado de cualquier nota (necesario para Kanban).
-- Eliminar sigue restringido a autor o admin.
-- =====================================================

-- Eliminar politica restrictiva de UPDATE
DROP POLICY IF EXISTS "Autor o admin puede actualizar comentarios" ON comentarios;

-- Nueva politica: todos los autenticados pueden actualizar
CREATE POLICY "Usuarios autenticados pueden actualizar comentarios"
  ON comentarios
  FOR UPDATE
  TO authenticated
  USING (true);
