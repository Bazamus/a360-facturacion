-- ============================================================
-- Migración 042: RPCs para agrupar conversaciones
-- Problema: el dashboard muestra mensajes individuales; con volumen
--   alto, un cliente con 6 mensajes ocupa 6 tarjetas.
-- Solución: agrupar mensajes por remitente_telefono y devolver
--   resumen de cada conversación + detalle bajo demanda.
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. get_conversaciones_pendientes
--    Agrupa mensajes por remitente_telefono y devuelve resumen
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_conversaciones_pendientes(
  p_canal   TEXT    DEFAULT NULL,
  p_search  TEXT    DEFAULT NULL,
  p_limit   INT     DEFAULT 20,
  p_offset  INT     DEFAULT 0
)
RETURNS TABLE (
  conversation_key         TEXT,
  remitente_telefono       TEXT,
  remitente_nombre         TEXT,
  cliente_id               UUID,
  cliente_nombre           TEXT,
  canal                    TEXT,
  chatwoot_conversation_id TEXT,
  ultimo_mensaje           TEXT,
  ultimo_mensaje_at        TIMESTAMPTZ,
  total_mensajes           BIGINT,
  pendientes               BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH mensajes_activos AS (
    SELECT
      com.remitente_telefono,
      com.remitente_nombre,
      com.canal,
      com.contenido,
      com.estado,
      com.chatwoot_conversation_id,
      com.created_at,
      c.id   AS cli_id,
      c.nombre || ' ' || c.apellidos AS cli_nombre,
      ROW_NUMBER() OVER (
        PARTITION BY com.remitente_telefono
        ORDER BY com.created_at DESC
      ) AS rn
    FROM comunicaciones com
    LEFT JOIN clientes c ON com.cliente_id = c.id
    WHERE com.estado NOT IN ('archivado', 'respondido')
      AND com.remitente_telefono IS NOT NULL
      AND com.remitente_telefono <> ''
      AND (p_canal IS NULL OR com.canal = p_canal)
  ),
  agrupado AS (
    SELECT
      ma.remitente_telefono                                   AS conversation_key,
      ma.remitente_telefono,
      MAX(CASE WHEN ma.rn = 1 THEN ma.remitente_nombre END)  AS remitente_nombre,
      (MAX(CASE WHEN ma.rn = 1 THEN ma.cli_id::text END))::uuid AS cliente_id,
      MAX(CASE WHEN ma.rn = 1 THEN ma.cli_nombre END)          AS cliente_nombre,
      MAX(CASE WHEN ma.rn = 1 THEN ma.canal END)             AS canal,
      MAX(ma.chatwoot_conversation_id) FILTER (
        WHERE ma.chatwoot_conversation_id IS NOT NULL
      )                                                        AS chatwoot_conversation_id,
      MAX(CASE WHEN ma.rn = 1 THEN ma.contenido END)         AS ultimo_mensaje,
      MAX(ma.created_at)                                      AS ultimo_mensaje_at,
      COUNT(*)                                                AS total_mensajes,
      COUNT(*) FILTER (WHERE ma.estado = 'recibido')          AS pendientes
    FROM mensajes_activos ma
    GROUP BY ma.remitente_telefono
    HAVING COUNT(*) FILTER (WHERE ma.estado = 'recibido') > 0
  )
  SELECT
    a.conversation_key,
    a.remitente_telefono,
    a.remitente_nombre,
    a.cliente_id,
    a.cliente_nombre,
    a.canal,
    a.chatwoot_conversation_id,
    a.ultimo_mensaje,
    a.ultimo_mensaje_at,
    a.total_mensajes,
    a.pendientes
  FROM agrupado a
  WHERE (
    p_search IS NULL
    OR a.remitente_nombre ILIKE '%' || replace(replace(replace(p_search, '\', '\\'), '%', '\%'), '_', '\_') || '%' ESCAPE '\'
    OR a.remitente_telefono ILIKE '%' || replace(replace(replace(p_search, '\', '\\'), '%', '\%'), '_', '\_') || '%' ESCAPE '\'
    OR a.cliente_nombre ILIKE '%' || replace(replace(replace(p_search, '\', '\\'), '%', '\%'), '_', '\_') || '%' ESCAPE '\'
    OR a.ultimo_mensaje ILIKE '%' || replace(replace(replace(p_search, '\', '\\'), '%', '\%'), '_', '\_') || '%' ESCAPE '\'
  )
  ORDER BY a.ultimo_mensaje_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION get_conversaciones_pendientes(TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversaciones_pendientes(TEXT, TEXT, INT, INT) TO service_role;

-- ─────────────────────────────────────────────────────────────
-- 2. get_mensajes_conversacion
--    Devuelve mensajes individuales de un teléfono
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_mensajes_conversacion(
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
  remitente_telefono       TEXT,
  external_id              TEXT,
  chatwoot_conversation_id TEXT,
  created_at               TIMESTAMPTZ,
  cliente_id               UUID,
  cliente_nombre           TEXT
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
    com.remitente_telefono,
    com.external_id,
    com.chatwoot_conversation_id,
    com.created_at,
    c.id AS cliente_id,
    c.nombre || ' ' || c.apellidos AS cliente_nombre
  FROM comunicaciones com
  LEFT JOIN clientes c ON com.cliente_id = c.id
  WHERE com.remitente_telefono = p_telefono
    AND com.estado <> 'archivado'
  ORDER BY com.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_mensajes_conversacion(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mensajes_conversacion(TEXT, INT) TO service_role;

-- ─────────────────────────────────────────────────────────────
-- 3. archivar_conversacion
--    Archiva TODOS los mensajes pendientes de un teléfono
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION archivar_conversacion(p_telefono TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.rol IN ('admin', 'encargado')
  ) THEN
    RAISE EXCEPTION 'Sin permisos para archivar comunicaciones';
  END IF;

  UPDATE comunicaciones
  SET estado = 'archivado'
  WHERE remitente_telefono = p_telefono
    AND estado NOT IN ('archivado', 'respondido');
END;
$$;

GRANT EXECUTE ON FUNCTION archivar_conversacion(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION archivar_conversacion(TEXT) TO service_role;

COMMIT;
