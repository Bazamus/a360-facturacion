-- ============================================================================
-- SCRIPT DE CORRECCIÓN: Término Fijo (TF) con cantidad errónea
-- Fecha: 2026-02-18
-- Alcance: Facturas en estado 'borrador' y 'emitida' del mes actual (Feb 2026)
-- Problema: TF calculado con cantidad prorrateada (ej: 0.65) en lugar de 1.00
-- ============================================================================

-- ============================================================================
-- PASO 1: DIAGNÓSTICO - Ver facturas afectadas ANTES de corregir
-- ============================================================================

SELECT 
    f.id AS factura_id,
    f.numero_completo,
    f.estado,
    f.fecha_factura,
    f.periodo_inicio,
    f.periodo_fin,
    f.es_periodo_parcial,
    f.dias_periodo,
    f.base_imponible AS base_imponible_actual,
    f.importe_iva AS iva_actual,
    f.total AS total_actual,
    fl.id AS linea_id,
    fl.concepto_codigo,
    fl.concepto_nombre,
    fl.cantidad AS cantidad_erronea,
    fl.precio_unitario,
    fl.subtotal AS subtotal_erroneo,
    -- Valores correctos calculados
    1.000 AS cantidad_correcta,
    ROUND(fl.precio_unitario, 2) AS subtotal_correcto,
    ROUND(fl.precio_unitario, 2) - fl.subtotal AS diferencia_subtotal
FROM facturas f
JOIN facturas_lineas fl ON fl.factura_id = f.id
WHERE fl.es_termino_fijo = true
  AND fl.cantidad != 1.000
  AND f.estado IN ('borrador', 'emitida')
  AND f.fecha_factura >= '2026-02-01'
  AND f.fecha_factura < '2026-03-01'
ORDER BY f.numero_completo, fl.orden;


-- ============================================================================
-- PASO 2: CORRECCIÓN DE LÍNEAS - Actualizar cantidad y subtotal del TF
-- ============================================================================

UPDATE facturas_lineas fl
SET 
    cantidad = 1.000,
    subtotal = ROUND(precio_unitario, 2)
FROM facturas f
WHERE fl.factura_id = f.id
  AND fl.es_termino_fijo = true
  AND fl.cantidad != 1.000
  AND f.estado IN ('borrador', 'emitida')
  AND f.fecha_factura >= '2026-02-01'
  AND f.fecha_factura < '2026-03-01';


-- ============================================================================
-- PASO 3: RECALCULAR TOTALES DE FACTURAS AFECTADAS
-- ============================================================================

WITH nuevos_totales AS (
    SELECT 
        f.id AS factura_id,
        f.porcentaje_iva,
        SUM(fl.subtotal) AS nueva_base_imponible
    FROM facturas f
    JOIN facturas_lineas fl ON fl.factura_id = f.id
    WHERE f.estado IN ('borrador', 'emitida')
      AND f.fecha_factura >= '2026-02-01'
      AND f.fecha_factura < '2026-03-01'
      AND f.id IN (
          SELECT DISTINCT fl2.factura_id
          FROM facturas_lineas fl2
          WHERE fl2.es_termino_fijo = true
      )
    GROUP BY f.id, f.porcentaje_iva
)
UPDATE facturas f
SET 
    base_imponible = nt.nueva_base_imponible,
    importe_iva = ROUND(nt.nueva_base_imponible * nt.porcentaje_iva / 100, 2),
    total = ROUND(nt.nueva_base_imponible + (nt.nueva_base_imponible * nt.porcentaje_iva / 100), 2),
    updated_at = now()
FROM nuevos_totales nt
WHERE f.id = nt.factura_id;


-- ============================================================================
-- PASO 4: VERIFICACIÓN - Confirmar que todo se corrigió correctamente
-- ============================================================================

SELECT 
    f.id AS factura_id,
    f.numero_completo,
    f.estado,
    f.fecha_factura,
    f.base_imponible,
    f.importe_iva,
    f.total,
    fl.concepto_codigo,
    fl.cantidad,
    fl.precio_unitario,
    fl.subtotal
FROM facturas f
JOIN facturas_lineas fl ON fl.factura_id = f.id
WHERE fl.es_termino_fijo = true
  AND f.estado IN ('borrador', 'emitida')
  AND f.fecha_factura >= '2026-02-01'
  AND f.fecha_factura < '2026-03-01'
ORDER BY f.numero_completo, fl.orden;


-- ============================================================================
-- VERIFICACIÓN EXTRA: Asegurar que NO queda ningún TF con cantidad != 1.00
-- en facturas del mes actual
-- ============================================================================

SELECT COUNT(*) AS tf_pendientes_correccion
FROM facturas_lineas fl
JOIN facturas f ON f.id = fl.factura_id
WHERE fl.es_termino_fijo = true
  AND fl.cantidad != 1.000
  AND f.estado IN ('borrador', 'emitida')
  AND f.fecha_factura >= '2026-02-01'
  AND f.fecha_factura < '2026-03-01';
-- Resultado esperado: 0
