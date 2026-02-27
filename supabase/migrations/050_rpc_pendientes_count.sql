-- ============================================================
-- Migración 050: RPC get_comunicaciones_pendientes_count
--
-- Count ligero de mensajes entrantes pendientes de respuesta.
-- SECURITY DEFINER para bypassear RLS y garantizar count fiable.
-- Usado por badge de notificaciones en Header y Sidebar.
-- ============================================================

CREATE OR REPLACE FUNCTION get_comunicaciones_pendientes_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM comunicaciones
  WHERE estado = 'recibido'
    AND direccion = 'entrante';
$$;

GRANT EXECUTE ON FUNCTION get_comunicaciones_pendientes_count() TO authenticated;
GRANT EXECUTE ON FUNCTION get_comunicaciones_pendientes_count() TO service_role;
