-- ============================================================
-- Migración 040: RPC archivar_comunicacion con SECURITY DEFINER
-- Problema: UPDATE directo en comunicaciones da 403 incluso para admin
--   (las políticas RLS UPDATE con subquery a profiles pueden fallar
--    en ciertos contextos de evaluación de Supabase)
-- Solución: función SECURITY DEFINER que bypasea RLS y verifica
--   el rol del usuario internamente antes de actualizar
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION archivar_comunicacion(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el usuario autenticado tiene rol permitido
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.rol IN ('admin', 'encargado')
  ) THEN
    RAISE EXCEPTION 'Sin permisos para archivar comunicaciones';
  END IF;

  UPDATE comunicaciones
  SET estado = 'archivado'
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION archivar_comunicacion(UUID) TO authenticated;

COMMIT;
