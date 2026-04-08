BEGIN;

-- ============================================================
-- 063: RPC para obtener cliente_id del usuario actual
-- Las consultas directas a 'clientes' fallan por dependencia
-- circular de RLS. Este RPC es SECURITY DEFINER y bypasa RLS.
-- ============================================================

CREATE OR REPLACE FUNCTION get_mi_cliente_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
  v_id UUID;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  SELECT id INTO v_id FROM clientes WHERE email = v_email LIMIT 1;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_mi_cliente_id TO authenticated;

-- También crear RPC para tickets del portal (evita problemas RLS)
CREATE OR REPLACE FUNCTION get_portal_mis_tickets(
  p_estado TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
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
      SELECT json_agg(t)
      FROM (
        SELECT id, numero_ticket, asunto, tipo, prioridad, estado, origen, created_at
        FROM tickets_sat
        WHERE cliente_id = v_cliente_id
        AND (p_estado IS NULL OR estado::text = p_estado)
        ORDER BY created_at DESC
        LIMIT p_limit OFFSET p_offset
      ) t
    ), '[]'::json),
    'count', (
      SELECT COUNT(*) FROM tickets_sat
      WHERE cliente_id = v_cliente_id
      AND (p_estado IS NULL OR estado = p_estado)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_portal_mis_tickets TO authenticated;

-- RPC para intervenciones del portal
CREATE OR REPLACE FUNCTION get_portal_mis_intervenciones()
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
    SELECT json_agg(i)
    FROM (
      SELECT id, numero_parte, titulo, tipo, prioridad, estado,
             fecha_solicitud, fecha_fin, diagnostico, solucion
      FROM intervenciones
      WHERE cliente_id = v_cliente_id
      ORDER BY fecha_solicitud DESC
      LIMIT 50
    ) i
  ), '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION get_portal_mis_intervenciones TO authenticated;

-- RPC para facturas del portal
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
        SELECT id, serie, numero, fecha_factura, periodo_inicio, periodo_fin,
               base_imponible, importe_iva, total, estado, pdf_url
        FROM facturas
        WHERE cliente_id = v_cliente_id
        AND estado::text IN ('emitida', 'pagada')
        AND (p_anio IS NULL OR EXTRACT(YEAR FROM fecha_factura) = p_anio)
        AND (p_estado IS NULL OR estado::text = p_estado)
        ORDER BY fecha_factura DESC
        LIMIT p_limit OFFSET p_offset
      ) f
    ), '[]'::json),
    'count', (
      SELECT COUNT(*) FROM facturas
      WHERE cliente_id = v_cliente_id
      AND estado IN ('emitida', 'pagada')
      AND (p_anio IS NULL OR EXTRACT(YEAR FROM fecha_factura) = p_anio)
      AND (p_estado IS NULL OR estado = p_estado)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_portal_mis_facturas TO authenticated;

COMMIT;
