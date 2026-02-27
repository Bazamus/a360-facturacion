-- ============================================================
-- Migración 048: Mejoras Dashboard Comunicaciones
--
-- 1. RPC backfill_chatwoot_conversation_id — propaga IDs faltantes
-- 2. Backfill masivo único
-- 3. RPC get_conversaciones_archivadas — historial de archivadas
-- 4. RPC restaurar_conversacion — devuelve mensajes a pendientes
-- 5. Actualiza get_comunicaciones_stats — métricas de respuesta
-- 6. Habilita Realtime en tabla comunicaciones
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Sección 1: RPC backfill_chatwoot_conversation_id
-- Propaga el chatwoot_conversation_id más reciente de un teléfono
-- a todos los registros que lo tengan NULL
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION backfill_chatwoot_conversation_id(p_telefono TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conv_id TEXT;
  v_updated INT;
BEGIN
  -- Buscar el chatwoot_conversation_id más reciente para este teléfono
  SELECT chatwoot_conversation_id INTO v_conv_id
  FROM comunicaciones
  WHERE remitente_telefono = p_telefono
    AND chatwoot_conversation_id IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_conv_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Propagar a registros huérfanos
  UPDATE comunicaciones
  SET chatwoot_conversation_id = v_conv_id
  WHERE remitente_telefono = p_telefono
    AND chatwoot_conversation_id IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION backfill_chatwoot_conversation_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION backfill_chatwoot_conversation_id(TEXT) TO service_role;


-- ─────────────────────────────────────────────────────────────
-- Sección 2: Backfill masivo único
-- Propaga chatwoot_conversation_id existentes a registros huérfanos
-- ─────────────────────────────────────────────────────────────
WITH best_ids AS (
  SELECT DISTINCT ON (remitente_telefono)
    remitente_telefono,
    chatwoot_conversation_id
  FROM comunicaciones
  WHERE chatwoot_conversation_id IS NOT NULL
  ORDER BY remitente_telefono, created_at DESC
)
UPDATE comunicaciones c
SET chatwoot_conversation_id = b.chatwoot_conversation_id
FROM best_ids b
WHERE c.remitente_telefono = b.remitente_telefono
  AND c.chatwoot_conversation_id IS NULL;


-- ─────────────────────────────────────────────────────────────
-- Sección 3: RPC get_conversaciones_archivadas
-- Mismo patrón que get_conversaciones_pendientes pero para historial
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_conversaciones_archivadas(
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
  archivado_at             TIMESTAMPTZ,
  total_mensajes           BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH mensajes_archivados AS (
    SELECT
      com.remitente_telefono,
      com.remitente_nombre,
      com.canal,
      com.contenido,
      com.estado,
      com.chatwoot_conversation_id,
      com.created_at,
      com.updated_at,
      c.id   AS cli_id,
      c.nombre || ' ' || c.apellidos AS cli_nombre,
      ROW_NUMBER() OVER (
        PARTITION BY com.remitente_telefono
        ORDER BY com.updated_at DESC
      ) AS rn
    FROM comunicaciones com
    LEFT JOIN clientes c ON com.cliente_id = c.id
    WHERE com.estado IN ('archivado', 'respondido')
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
      MAX(ma.updated_at)                                      AS archivado_at,
      COUNT(*)                                                AS total_mensajes
    FROM mensajes_archivados ma
    GROUP BY ma.remitente_telefono
  )
  SELECT * FROM agrupado a
  WHERE (
    p_search IS NULL
    OR a.remitente_nombre ILIKE '%' || replace(replace(replace(p_search, '\', '\\'), '%', '\%'), '_', '\_') || '%' ESCAPE '\'
    OR a.remitente_telefono ILIKE '%' || replace(replace(replace(p_search, '\', '\\'), '%', '\%'), '_', '\_') || '%' ESCAPE '\'
    OR a.cliente_nombre ILIKE '%' || replace(replace(replace(p_search, '\', '\\'), '%', '\%'), '_', '\_') || '%' ESCAPE '\'
  )
  ORDER BY a.archivado_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION get_conversaciones_archivadas(TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversaciones_archivadas(TEXT, TEXT, INT, INT) TO service_role;


-- ─────────────────────────────────────────────────────────────
-- Sección 4: RPC restaurar_conversacion
-- Devuelve mensajes archivados de un teléfono a estado 'recibido'
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION restaurar_conversacion(p_telefono TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.rol IN ('admin', 'encargado')
  ) THEN
    RAISE EXCEPTION 'Sin permisos para restaurar comunicaciones';
  END IF;

  UPDATE comunicaciones
  SET estado = 'recibido'
  WHERE remitente_telefono = p_telefono
    AND estado IN ('archivado', 'respondido');

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION restaurar_conversacion(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION restaurar_conversacion(TEXT) TO service_role;


-- ─────────────────────────────────────────────────────────────
-- Sección 5: Actualizar get_comunicaciones_stats
-- Añadir tiempo_respuesta_medio_min y archivadas_periodo
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_comunicaciones_stats(
  p_fecha_inicio DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
  p_fecha_fin DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_mensajes', COUNT(*),
    'entrantes', COUNT(*) FILTER (WHERE direccion = 'entrante'),
    'salientes', COUNT(*) FILTER (WHERE direccion = 'saliente'),
    'por_canal', json_build_object(
      'whatsapp', COUNT(*) FILTER (WHERE canal = 'whatsapp'),
      'email', COUNT(*) FILTER (WHERE canal = 'email'),
      'chat', COUNT(*) FILTER (WHERE canal = 'chat'),
      'telefono', COUNT(*) FILTER (WHERE canal = 'telefono')
    ),
    'pendientes_respuesta', COUNT(*) FILTER (WHERE estado = 'recibido' AND direccion = 'entrante'),
    'clientes_contactados', COUNT(DISTINCT cliente_id),
    'tiempo_respuesta_medio_min', ROUND(
      EXTRACT(EPOCH FROM AVG(updated_at - created_at) FILTER (
        WHERE estado IN ('respondido', 'archivado')
        AND direccion = 'entrante'
      )) / 60
    ),
    'archivadas_periodo', COUNT(*) FILTER (WHERE estado IN ('archivado', 'respondido'))
  ) INTO v_result
  FROM comunicaciones
  WHERE created_at >= p_fecha_inicio
    AND created_at < p_fecha_fin + INTERVAL '1 day';

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_comunicaciones_stats TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- Sección 6: Habilitar Supabase Realtime en tabla comunicaciones
-- ─────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE comunicaciones;


-- ─────────────────────────────────────────────────────────────
-- Sección 7: Índice para consultas de historial archivado
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_comunicaciones_estado_updated
  ON comunicaciones(estado, updated_at DESC)
  WHERE estado IN ('archivado', 'respondido');
