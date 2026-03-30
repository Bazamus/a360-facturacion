BEGIN;

-- ============================================================
-- 062: Fix RLS - cliente puede leer su propio registro en clientes
-- Sin esto, getClienteId() falla y tickets/intervenciones no cargan
-- SEGURIDAD: Solo añade política SELECT, no modifica nada existente
-- ============================================================

-- Cliente puede leer su propio registro en clientes (vinculado por email)
CREATE POLICY "Cliente ve su propio registro"
  ON clientes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.rol = 'cliente'
    )
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

COMMIT;
