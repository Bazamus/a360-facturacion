-- =====================================================
-- MIGRACIÓN: Permisos colaborativos para comentarios
-- =====================================================
-- Permite a todos los usuarios autenticados gestionar
-- notas (herramienta colaborativa interna).
-- =====================================================

-- Eliminar politicas restrictivas
DROP POLICY IF EXISTS "Autor o admin puede actualizar comentarios" ON comentarios;
DROP POLICY IF EXISTS "Autor o admin puede eliminar comentarios" ON comentarios;

-- Nueva politica: todos los autenticados pueden actualizar
CREATE POLICY "Usuarios autenticados pueden actualizar comentarios"
  ON comentarios
  FOR UPDATE
  TO authenticated
  USING (true);

-- Nueva politica: todos los autenticados pueden eliminar
CREATE POLICY "Usuarios autenticados pueden eliminar comentarios"
  ON comentarios
  FOR DELETE
  TO authenticated
  USING (true);
