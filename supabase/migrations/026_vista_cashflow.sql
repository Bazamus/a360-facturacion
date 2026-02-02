-- =====================================================
-- Migración: Vista de Cash Flow
-- Descripción: Vista para análisis de flujo de caja (facturado vs cobrado)
-- Fecha: 2026-02-02
-- =====================================================

-- =====================================================
-- 1. Vista de Cash Flow Mensual
-- =====================================================

CREATE OR REPLACE VIEW v_reporte_cashflow AS
SELECT 
  DATE_TRUNC('month', f.fecha_factura)::DATE as mes,
  TO_CHAR(DATE_TRUNC('month', f.fecha_factura), 'YYYY-MM') as mes_texto,
  TO_CHAR(DATE_TRUNC('month', f.fecha_factura), 'TMMonth YYYY') as mes_nombre,
  COUNT(*) as num_facturas,
  SUM(f.total) as total_facturado,
  SUM(f.base_imponible) as base_imponible,
  SUM(f.importe_iva) as iva,
  SUM(CASE WHEN f.estado = 'pagada' THEN f.total ELSE 0 END) as total_cobrado,
  SUM(CASE WHEN f.estado != 'pagada' AND f.estado != 'anulada' THEN f.total ELSE 0 END) as pendiente_cobro,
  COUNT(CASE WHEN f.estado = 'pagada' THEN 1 END) as num_cobradas,
  COUNT(CASE WHEN f.estado != 'pagada' AND f.estado != 'anulada' THEN 1 END) as num_pendientes,
  ROUND(
    (COUNT(CASE WHEN f.estado = 'pagada' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
    2
  ) as tasa_cobro,
  AVG(CASE 
    WHEN f.fecha_pago IS NOT NULL AND f.fecha_factura IS NOT NULL
    THEN EXTRACT(DAY FROM f.fecha_pago - f.fecha_factura)::INTEGER
  END) as dias_medio_cobro
FROM facturas f
WHERE f.estado != 'anulada'
  AND f.fecha_factura IS NOT NULL
GROUP BY DATE_TRUNC('month', f.fecha_factura)
ORDER BY mes DESC;

COMMENT ON VIEW v_reporte_cashflow IS 'Análisis de flujo de caja mensual: facturado vs cobrado con métricas de días promedio de cobro';

-- =====================================================
-- 2. Vista de Cash Flow por Comunidad
-- =====================================================

CREATE OR REPLACE VIEW v_reporte_cashflow_comunidad AS
SELECT 
  c.id as comunidad_id,
  c.nombre as comunidad,
  c.codigo as codigo_comunidad,
  DATE_TRUNC('month', f.fecha_factura)::DATE as mes,
  TO_CHAR(DATE_TRUNC('month', f.fecha_factura), 'TMMonth YYYY') as mes_nombre,
  COUNT(*) as num_facturas,
  SUM(f.total) as total_facturado,
  SUM(CASE WHEN f.estado = 'pagada' THEN f.total ELSE 0 END) as total_cobrado,
  SUM(CASE WHEN f.estado != 'pagada' AND f.estado != 'anulada' THEN f.total ELSE 0 END) as pendiente_cobro,
  AVG(CASE 
    WHEN f.fecha_pago IS NOT NULL AND f.fecha_factura IS NOT NULL
    THEN EXTRACT(DAY FROM f.fecha_pago - f.fecha_factura)::INTEGER
  END) as dias_medio_cobro
FROM facturas f
JOIN comunidades c ON f.comunidad_id = c.id
WHERE f.estado != 'anulada'
  AND f.fecha_factura IS NOT NULL
GROUP BY c.id, c.nombre, c.codigo, DATE_TRUNC('month', f.fecha_factura)
ORDER BY c.nombre, mes DESC;

COMMENT ON VIEW v_reporte_cashflow_comunidad IS 'Análisis de flujo de caja mensual por comunidad';

-- =====================================================
-- 3. Función para obtener proyección de cobros
-- =====================================================

CREATE OR REPLACE FUNCTION get_proyeccion_cobros(
  p_dias_horizonte INTEGER DEFAULT 90
)
RETURNS TABLE (
  rango_dias TEXT,
  num_facturas INTEGER,
  importe_total NUMERIC,
  importe_acumulado NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH facturas_pendientes AS (
    SELECT 
      f.id,
      f.total,
      CASE 
        WHEN f.fecha_vencimiento < CURRENT_DATE THEN EXTRACT(DAY FROM CURRENT_DATE - f.fecha_vencimiento)::INTEGER
        ELSE 0
      END as dias_vencido,
      CASE 
        WHEN f.fecha_vencimiento >= CURRENT_DATE THEN EXTRACT(DAY FROM f.fecha_vencimiento - CURRENT_DATE)::INTEGER
        ELSE 0
      END as dias_hasta_vencimiento
    FROM facturas f
    WHERE f.estado NOT IN ('pagada', 'anulada')
      AND (f.fecha_vencimiento IS NULL OR f.fecha_vencimiento <= CURRENT_DATE + (p_dias_horizonte || ' days')::INTERVAL)
  ),
  rangos AS (
    SELECT 
      CASE 
        WHEN dias_vencido > 0 THEN 'Vencidas'
        WHEN dias_hasta_vencimiento <= 7 THEN '0-7 días'
        WHEN dias_hasta_vencimiento <= 30 THEN '8-30 días'
        WHEN dias_hasta_vencimiento <= 60 THEN '31-60 días'
        ELSE '60+ días'
      END as rango_dias,
      CASE 
        WHEN dias_vencido > 0 THEN 1
        WHEN dias_hasta_vencimiento <= 7 THEN 2
        WHEN dias_hasta_vencimiento <= 30 THEN 3
        WHEN dias_hasta_vencimiento <= 60 THEN 4
        ELSE 5
      END as orden,
      COUNT(*)::INTEGER as num_facturas,
      SUM(total) as importe_total
    FROM facturas_pendientes
    GROUP BY rango_dias, orden
  )
  SELECT 
    r.rango_dias,
    r.num_facturas,
    ROUND(r.importe_total, 2) as importe_total,
    ROUND(SUM(r.importe_total) OVER (ORDER BY r.orden), 2) as importe_acumulado
  FROM rangos r
  ORDER BY r.orden;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_proyeccion_cobros IS 'Proyección de cobros pendientes agrupados por rangos de vencimiento';

-- =====================================================
-- 4. Grants
-- =====================================================

GRANT SELECT ON v_reporte_cashflow TO authenticated;
GRANT SELECT ON v_reporte_cashflow_comunidad TO authenticated;
GRANT EXECUTE ON FUNCTION get_proyeccion_cobros TO authenticated;

-- =====================================================
-- 5. Índices para rendimiento
-- =====================================================

-- Los índices en facturas.fecha_factura y facturas.estado ya existen
-- Crear índice adicional para fecha_pago si no existe

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_facturas_fecha_pago'
  ) THEN
    CREATE INDEX idx_facturas_fecha_pago ON facturas(fecha_pago) WHERE fecha_pago IS NOT NULL;
  END IF;
END $$;
