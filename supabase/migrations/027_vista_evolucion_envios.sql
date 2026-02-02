-- =====================================================
-- Migración: Vista de Evolución de Envíos
-- Descripción: Vista para análisis temporal de envíos de email
-- Fecha: 2026-02-02
-- =====================================================

-- =====================================================
-- 1. Vista de Evolución Mensual de Envíos
-- =====================================================

CREATE OR REPLACE VIEW v_envios_evolucion_mensual AS
SELECT 
  DATE_TRUNC('month', e.created_at)::DATE as mes,
  TO_CHAR(DATE_TRUNC('month', e.created_at), 'TMMonth YYYY') as mes_nombre,
  COUNT(*) as total_enviados,
  COUNT(CASE WHEN e.estado IN ('enviado', 'entregado', 'abierto') THEN 1 END) as total_entregados,
  COUNT(CASE WHEN e.estado = 'abierto' THEN 1 END) as total_abiertos,
  COUNT(CASE WHEN e.estado = 'rebotado' THEN 1 END) as total_rebotados,
  COUNT(CASE WHEN e.estado = 'fallido' THEN 1 END) as total_fallidos,
  ROUND(
    (COUNT(CASE WHEN e.estado IN ('enviado', 'entregado', 'abierto') THEN 1 END)::NUMERIC / 
     NULLIF(COUNT(*), 0)) * 100,
    2
  ) as tasa_entrega,
  ROUND(
    (COUNT(CASE WHEN e.estado = 'abierto' THEN 1 END)::NUMERIC / 
     NULLIF(COUNT(CASE WHEN e.estado IN ('enviado', 'entregado', 'abierto') THEN 1 END), 0)) * 100,
    2
  ) as tasa_apertura,
  ROUND(
    (COUNT(CASE WHEN e.estado = 'rebotado' THEN 1 END)::NUMERIC / 
     NULLIF(COUNT(*), 0)) * 100,
    2
  ) as tasa_rebote
FROM envios_email e
WHERE e.estado NOT IN ('pendiente', 'enviando')
GROUP BY DATE_TRUNC('month', e.created_at)
ORDER BY mes DESC;

COMMENT ON VIEW v_envios_evolucion_mensual IS 'Evolución mensual de métricas de envíos de email';

-- =====================================================
-- 2. Vista de Análisis de Rebotes
-- =====================================================

CREATE OR REPLACE VIEW v_envios_analisis_rebotes AS
SELECT 
  e.tipo_rebote,
  COUNT(*) as num_rebotes,
  ROUND((COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM envios_email WHERE estado = 'rebotado')) * 100, 2) as porcentaje,
  array_agg(DISTINCT e.email_destino) FILTER (WHERE e.email_destino IS NOT NULL) as emails_afectados
FROM envios_email e
WHERE e.estado = 'rebotado'
  AND e.tipo_rebote IS NOT NULL
GROUP BY e.tipo_rebote
ORDER BY num_rebotes DESC;

COMMENT ON VIEW v_envios_analisis_rebotes IS 'Análisis de rebotes de email por tipo';

-- =====================================================
-- 3. Vista de Errores Frecuentes
-- =====================================================

CREATE OR REPLACE VIEW v_envios_errores_frecuentes AS
SELECT 
  e.error_codigo,
  COUNT(*) as num_errores,
  ROUND((COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM envios_email WHERE estado = 'fallido')) * 100, 2) as porcentaje,
  array_agg(DISTINCT SUBSTRING(e.error_mensaje, 1, 100)) FILTER (WHERE e.error_mensaje IS NOT NULL) as mensajes_ejemplo
FROM envios_email e
WHERE e.estado = 'fallido'
  AND e.error_codigo IS NOT NULL
GROUP BY e.error_codigo
ORDER BY num_errores DESC
LIMIT 10;

COMMENT ON VIEW v_envios_errores_frecuentes IS 'Top 10 errores más frecuentes en envíos fallidos';

-- =====================================================
-- 4. Grants
-- =====================================================

GRANT SELECT ON v_envios_evolucion_mensual TO authenticated;
GRANT SELECT ON v_envios_analisis_rebotes TO authenticated;
GRANT SELECT ON v_envios_errores_frecuentes TO authenticated;
