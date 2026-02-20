-- ============================================================
-- Migración 043: Fix get_comunicaciones_stats
-- Problema: los KPIs cuentan mensajes archivados inflando totales
-- Solución: excluir estado='archivado' del conteo general
-- ============================================================

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
    'clientes_contactados', COUNT(DISTINCT cliente_id)
  ) INTO v_result
  FROM comunicaciones
  WHERE created_at >= p_fecha_inicio
    AND created_at < p_fecha_fin + INTERVAL '1 day'
    AND estado <> 'archivado';

  RETURN v_result;
END;
$$;
