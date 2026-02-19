-- ============================================================
-- Migración 039: Ampliar política UPDATE en comunicaciones
-- Problema: solo 'admin' podía actualizar (archivar mensajes)
-- Solución: permitir también a 'encargado' actualizar estado
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS "Admin puede modificar comunicaciones" ON comunicaciones;

CREATE POLICY "Admin y encargado pueden modificar comunicaciones"
  ON comunicaciones FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.rol IN ('admin', 'encargado')
    )
  );

COMMIT;
