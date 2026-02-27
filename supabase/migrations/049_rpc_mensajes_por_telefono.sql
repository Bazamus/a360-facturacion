-- ============================================================
-- Migración 049: RPC get_mensajes_por_telefono
--
-- Devuelve TODOS los mensajes de un teléfono sin filtro de estado.
-- Necesario para el historial de conversaciones archivadas,
-- donde get_mensajes_conversacion excluye archivados.
-- ============================================================

CREATE OR REPLACE FUNCTION get_mensajes_por_telefono(
  p_telefono TEXT,
  p_limit    INT DEFAULT 50
)
RETURNS TABLE (
  id                       UUID,
  canal                    TEXT,
  direccion                TEXT,
  contenido                TEXT,
  contenido_tipo           TEXT,
  estado                   TEXT,
  remitente_nombre         TEXT,
  created_at               TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    com.id,
    com.canal,
    com.direccion,
    com.contenido,
    com.contenido_tipo,
    com.estado,
    com.remitente_nombre,
    com.created_at
  FROM comunicaciones com
  WHERE com.remitente_telefono = p_telefono
  ORDER BY com.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_mensajes_por_telefono(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mensajes_por_telefono(TEXT, INT) TO service_role;
