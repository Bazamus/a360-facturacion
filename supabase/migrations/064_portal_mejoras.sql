BEGIN;

-- ============================================================
-- 064: Mejoras Portal Cliente
-- - Incluir facturas anuladas
-- - RPC detalle factura (para PDF y expandible)
-- - RPC historial facturación (para gráfico)
-- - Actualizar RLS
-- ============================================================

-- 1. Recrear RPC facturas incluyendo anulada + numero_completo
CREATE OR REPLACE FUNCTION get_portal_mis_facturas(
  p_anio INTEGER DEFAULT NULL,
  p_estado TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cliente_id UUID;
  v_result JSON;
BEGIN
  v_cliente_id := get_mi_cliente_id();
  IF v_cliente_id IS NULL THEN
    RETURN json_build_object('data', '[]'::json, 'count', 0);
  END IF;

  SELECT json_build_object(
    'data', COALESCE((
      SELECT json_agg(f)
      FROM (
        SELECT id, serie, numero, numero_completo, fecha_factura, periodo_inicio, periodo_fin,
               base_imponible, importe_iva, total, estado::text AS estado, pdf_url
        FROM facturas
        WHERE cliente_id = v_cliente_id
        AND estado::text IN ('emitida', 'pagada', 'anulada')
        AND (p_anio IS NULL OR EXTRACT(YEAR FROM fecha_factura) = p_anio)
        AND (p_estado IS NULL OR estado::text = p_estado)
        ORDER BY fecha_factura DESC
        LIMIT p_limit OFFSET p_offset
      ) f
    ), '[]'::json),
    'count', (
      SELECT COUNT(*) FROM facturas
      WHERE cliente_id = v_cliente_id
      AND estado::text IN ('emitida', 'pagada', 'anulada')
      AND (p_anio IS NULL OR EXTRACT(YEAR FROM fecha_factura) = p_anio)
      AND (p_estado IS NULL OR estado::text = p_estado)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 2. Recrear RPC dashboard incluyendo anuladas en conteo
CREATE OR REPLACE FUNCTION get_portal_cliente_datos()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email TEXT;
  v_cliente_id UUID;
  v_result JSON;
BEGIN
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  SELECT id INTO v_cliente_id FROM clientes WHERE email = v_user_email LIMIT 1;

  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró un cliente vinculado a este email';
  END IF;

  SELECT json_build_object(
    'cliente', (
      SELECT json_build_object(
        'id', c.id, 'nombre', c.nombre, 'apellidos', c.apellidos,
        'email', c.email, 'telefono', c.telefono,
        'direccion', c.direccion_correspondencia,
        'cp', c.cp_correspondencia, 'ciudad', c.ciudad_correspondencia
      )
      FROM clientes c WHERE c.id = v_cliente_id
    ),
    'facturas_resumen', json_build_object(
      'total', (SELECT COUNT(*) FROM facturas WHERE cliente_id = v_cliente_id AND estado::text IN ('emitida', 'pagada', 'anulada')),
      'pendientes', (SELECT COUNT(*) FROM facturas WHERE cliente_id = v_cliente_id AND estado::text = 'emitida'),
      'importe_pendiente', (SELECT COALESCE(SUM(total), 0) FROM facturas WHERE cliente_id = v_cliente_id AND estado::text = 'emitida')
    ),
    'tickets_abiertos', (
      SELECT COUNT(*) FROM tickets_sat
      WHERE cliente_id = v_cliente_id AND estado NOT IN ('resuelto', 'cerrado')
    ),
    'proximas_citas', (
      SELECT COALESCE(json_agg(ci ORDER BY ci.fecha_hora), '[]')
      FROM (
        SELECT ci.id, ci.fecha_hora, ci.duracion_minutos, ci.estado, ci.direccion,
               i.numero_parte, i.titulo AS intervencion_titulo
        FROM citas ci
        LEFT JOIN intervenciones i ON ci.intervencion_id = i.id
        WHERE ci.cliente_id = v_cliente_id
          AND ci.fecha_hora >= NOW()
          AND ci.estado NOT IN ('cancelada', 'completada')
        ORDER BY ci.fecha_hora LIMIT 5
      ) ci
    ),
    'contratos_activos', (
      SELECT COUNT(*) FROM contratos_mantenimiento
      WHERE cliente_id = v_cliente_id AND estado = 'activo'
    ),
    'equipos', (
      SELECT COUNT(*) FROM equipos
      WHERE cliente_id = v_cliente_id AND estado = 'activo'
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 3. Actualizar RLS facturas para incluir anulada
DROP POLICY IF EXISTS "Cliente ve sus facturas" ON facturas;
CREATE POLICY "Cliente ve sus facturas"
  ON facturas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.rol = 'cliente'
    )
    AND cliente_id IN (
      SELECT c.id FROM clientes c
      WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    AND estado IN ('emitida', 'pagada', 'anulada')
  );

DROP POLICY IF EXISTS "Cliente ve lineas de sus facturas" ON facturas_lineas;
CREATE POLICY "Cliente ve lineas de sus facturas"
  ON facturas_lineas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.rol = 'cliente'
    )
    AND factura_id IN (
      SELECT f.id FROM facturas f
      WHERE f.cliente_id IN (
        SELECT c.id FROM clientes c
        WHERE c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
      AND f.estado IN ('emitida', 'pagada', 'anulada')
    )
  );

-- 4. RPC: detalle de factura con líneas (para PDF y expandible)
CREATE OR REPLACE FUNCTION get_portal_factura_detalle(p_factura_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cliente_id UUID;
  v_result JSON;
BEGIN
  v_cliente_id := get_mi_cliente_id();
  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM facturas
    WHERE id = p_factura_id AND cliente_id = v_cliente_id
    AND estado::text IN ('emitida', 'pagada', 'anulada')
  ) THEN
    RAISE EXCEPTION 'Factura no encontrada';
  END IF;

  SELECT json_build_object(
    'factura', (
      SELECT row_to_json(f) FROM (
        SELECT id, serie, numero, numero_completo, fecha_factura,
               periodo_inicio, periodo_fin, dias_periodo,
               base_imponible, porcentaje_iva, importe_iva, total,
               estado::text AS estado, metodo_pago::text AS metodo_pago,
               fecha_vencimiento, pdf_url,
               cliente_nombre, cliente_nif, cliente_direccion,
               cliente_cp, cliente_ciudad, cliente_email, cliente_iban
        FROM facturas WHERE id = p_factura_id
      ) f
    ),
    'lineas', COALESCE((
      SELECT json_agg(l ORDER BY l.orden)
      FROM (
        SELECT fl.id, fl.concepto_codigo, fl.concepto_nombre, fl.unidad_medida,
               fl.es_termino_fijo, fl.cantidad, fl.precio_unitario,
               fl.descuento_porcentaje, fl.descuento_importe, fl.subtotal,
               fl.lectura_anterior, fl.lectura_actual, fl.consumo,
               fl.fecha_lectura_anterior, fl.fecha_lectura_actual,
               fl.contador_numero_serie, fl.orden
        FROM facturas_lineas fl
        WHERE fl.factura_id = p_factura_id
        ORDER BY fl.orden
      ) l
    ), '[]'::json)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_portal_factura_detalle TO authenticated;

-- 5. RPC: historial de facturación por meses (para gráfico)
CREATE OR REPLACE FUNCTION get_portal_historial_facturacion(p_meses INTEGER DEFAULT 12)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cliente_id UUID;
BEGIN
  v_cliente_id := get_mi_cliente_id();
  IF v_cliente_id IS NULL THEN RETURN '[]'::json; END IF;

  RETURN COALESCE((
    SELECT json_agg(m ORDER BY m.mes)
    FROM (
      SELECT
        TO_CHAR(fecha_factura, 'YYYY-MM') AS mes,
        TO_CHAR(fecha_factura, 'Mon YYYY') AS mes_label,
        COUNT(*) AS num_facturas,
        SUM(CASE WHEN estado::text != 'anulada' THEN total ELSE 0 END) AS total,
        SUM(CASE WHEN estado::text = 'pagada' THEN total ELSE 0 END) AS pagado,
        SUM(CASE WHEN estado::text = 'emitida' THEN total ELSE 0 END) AS pendiente
      FROM facturas
      WHERE cliente_id = v_cliente_id
      AND estado::text IN ('emitida', 'pagada', 'anulada')
      AND fecha_factura >= (CURRENT_DATE - (p_meses || ' months')::INTERVAL)
      GROUP BY TO_CHAR(fecha_factura, 'YYYY-MM'), TO_CHAR(fecha_factura, 'Mon YYYY')
      ORDER BY mes
    ) m
  ), '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION get_portal_historial_facturacion TO authenticated;

COMMIT;
