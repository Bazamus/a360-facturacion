-- ============================================================
-- Migración 046: Bugfixes — Paginación, Stats, Vistas mejoradas
--
-- Cambios:
--   1. RPC get_factura_stats() — stats server-side (reemplaza cálculo JS con límite 1000)
--   2. v_contadores_completos — añade info del cliente actual
--   3. v_historial_envios — vista para historial de envíos con filtros server-side
--   4. v_facturas_pendientes_envio — incluir pagadas no enviadas
--
-- Impacto: BAJO — solo crea/reemplaza vistas y funciones
-- ============================================================

BEGIN;

-- ============================================================
-- 1. RPC: get_factura_stats (reemplaza cálculo JS client-side)
-- ============================================================

CREATE OR REPLACE FUNCTION get_factura_stats(
  p_comunidad_id UUID DEFAULT NULL,
  p_fecha_desde DATE DEFAULT NULL,
  p_fecha_hasta DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'borradores', COUNT(*) FILTER (WHERE estado = 'borrador'),
    'emitidas', COUNT(*) FILTER (WHERE estado = 'emitida'),
    'pagadas', COUNT(*) FILTER (WHERE estado = 'pagada'),
    'anuladas', COUNT(*) FILTER (WHERE estado = 'anulada'),
    'importeTotal', COALESCE(SUM(total) FILTER (WHERE estado IN ('emitida', 'pagada')), 0),
    'importePendiente', COALESCE(SUM(total) FILTER (WHERE estado = 'emitida'), 0),
    'importeCobrado', COALESCE(SUM(total) FILTER (WHERE estado = 'pagada'), 0)
  ) INTO v_result
  FROM facturas
  WHERE (p_comunidad_id IS NULL OR comunidad_id = p_comunidad_id)
    AND (p_fecha_desde IS NULL OR fecha_factura >= p_fecha_desde)
    AND (p_fecha_hasta IS NULL OR fecha_factura <= p_fecha_hasta);

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_factura_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_factura_stats TO service_role;

-- ============================================================
-- 2. v_contadores_completos — añadir info cliente actual
-- ============================================================

DROP VIEW IF EXISTS v_contadores_completos CASCADE;

CREATE VIEW v_contadores_completos AS
SELECT
  cont.id AS contador_id,
  cont.numero_serie,
  cont.marca,
  cont.modelo,
  cont.activo AS contador_activo,
  u.id AS ubicacion_id,
  u.nombre AS ubicacion_nombre,
  a.id AS agrupacion_id,
  a.nombre AS agrupacion_nombre,
  com.id AS comunidad_id,
  com.nombre AS comunidad_nombre,
  com.codigo AS comunidad_codigo,
  conc.id AS concepto_id,
  conc.codigo AS concepto_codigo,
  conc.nombre AS concepto_nombre,
  conc.unidad_medida,
  conc.es_termino_fijo,
  cc.lectura_inicial,
  cc.fecha_lectura_inicial,
  cc.lectura_actual,
  cc.fecha_lectura_actual,
  p.precio_unitario,
  -- Cliente actual de la ubicación
  cli.id AS cliente_id,
  CASE WHEN cli.id IS NOT NULL
    THEN cli.nombre || ' ' || COALESCE(cli.apellidos, '')
    ELSE NULL
  END AS cliente_nombre,
  cli.codigo_cliente AS cliente_codigo
FROM contadores cont
JOIN ubicaciones u ON cont.ubicacion_id = u.id
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades com ON a.comunidad_id = com.id
LEFT JOIN contadores_conceptos cc ON cont.id = cc.contador_id AND cc.activo = true
LEFT JOIN conceptos conc ON cc.concepto_id = conc.id
LEFT JOIN precios p ON com.id = p.comunidad_id
  AND conc.id = p.concepto_id
  AND p.activo = true
  AND p.fecha_fin IS NULL
LEFT JOIN ubicaciones_clientes uc ON u.id = uc.ubicacion_id AND uc.es_actual = true
LEFT JOIN clientes cli ON uc.cliente_id = cli.id;

-- ============================================================
-- 3. v_historial_envios — vista para historial con filtros server-side
-- ============================================================

CREATE OR REPLACE VIEW v_historial_envios AS
SELECT
  ee.id,
  ee.factura_id,
  ee.cliente_id,
  ee.email_destino,
  ee.asunto,
  ee.estado,
  ee.intentos,
  ee.max_intentos,
  ee.tipo_rebote,
  ee.error_mensaje,
  ee.fecha_enviado,
  ee.fecha_entregado,
  ee.fecha_abierto,
  ee.fecha_rebotado,
  ee.created_at,
  ee.updated_at,
  -- Factura
  f.numero_completo,
  f.comunidad_id,
  f.total AS factura_total,
  -- Comunidad
  com.nombre AS comunidad_nombre,
  -- Cliente
  c.nombre || ' ' || COALESCE(c.apellidos, '') AS cliente_nombre,
  c.codigo_cliente
FROM envios_email ee
LEFT JOIN facturas f ON ee.factura_id = f.id
LEFT JOIN comunidades com ON f.comunidad_id = com.id
LEFT JOIN clientes c ON ee.cliente_id = c.id;

-- ============================================================
-- 4. v_facturas_pendientes_envio — incluir pagadas no enviadas
-- ============================================================

DROP VIEW IF EXISTS v_facturas_pendientes_envio CASCADE;

CREATE VIEW v_facturas_pendientes_envio AS
SELECT
  f.id,
  f.numero_completo,
  f.fecha_factura,
  f.cliente_id,
  f.cliente_nombre,
  f.comunidad_id,
  f.estado,
  COALESCE(cli.email, f.cliente_email) AS cliente_email,
  f.total,
  c.nombre AS comunidad_nombre,
  CASE
    WHEN cli.email IS NULL OR cli.email = '' THEN 'sin_email'
    WHEN f.email_enviado = true THEN 'enviado'
    ELSE 'pendiente'
  END AS estado_envio,
  CASE
    WHEN cli.email IS NOT NULL AND cli.email != '' AND cli.email != f.cliente_email
    THEN true
    ELSE false
  END AS email_actualizado
FROM facturas f
JOIN comunidades c ON f.comunidad_id = c.id
LEFT JOIN clientes cli ON f.cliente_id = cli.id
WHERE f.estado IN ('emitida', 'pagada');

COMMIT;
