-- =====================================================
-- SCRIPT: Agregar Término Fijo a Facturas en Borrador
-- =====================================================
-- Este script añade el concepto "Término Fijo" (TF) a todas las
-- facturas en estado 'borrador' que no lo tienen, utilizando
-- el precio configurado en cada comunidad.
-- =====================================================

-- PASO 1: Ver facturas en borrador sin TF (SOLO CONSULTA - NO MODIFICA)
-- Ejecuta esto primero para ver qué facturas se van a modificar

SELECT
    f.id AS factura_id,
    f.cliente_nombre,
    f.base_imponible AS base_actual,
    f.total AS total_actual,
    f.periodo_inicio,
    f.periodo_fin,
    f.dias_periodo,
    f.es_periodo_parcial,
    com.nombre AS comunidad,
    p.precio_unitario AS precio_tf,
    CASE
        WHEN f.es_periodo_parcial THEN
            ROUND((p.precio_unitario * f.dias_periodo /
                EXTRACT(DAY FROM (DATE_TRUNC('month', f.periodo_inicio) + INTERVAL '1 month - 1 day'))
            )::NUMERIC, 2)
        ELSE p.precio_unitario
    END AS subtotal_tf_calculado
FROM facturas f
JOIN comunidades com ON f.comunidad_id = com.id
JOIN conceptos c ON c.codigo = 'TF' AND c.es_termino_fijo = true AND c.activo = true
LEFT JOIN precios p ON p.comunidad_id = f.comunidad_id
    AND p.concepto_id = c.id
    AND p.activo = true
    AND p.fecha_fin IS NULL
WHERE f.estado = 'borrador'
  AND NOT EXISTS (
      SELECT 1 FROM facturas_lineas fl
      WHERE fl.factura_id = f.id
      AND fl.concepto_codigo = 'TF'
  )
  AND p.precio_unitario IS NOT NULL
ORDER BY com.nombre, f.cliente_nombre;

-- =====================================================
-- PASO 2: Insertar líneas de Término Fijo
-- =====================================================
-- IMPORTANTE: Revisa el resultado del PASO 1 antes de ejecutar esto

-- Descomenta las siguientes líneas para ejecutar:

/*
WITH facturas_sin_tf AS (
    SELECT
        f.id AS factura_id,
        f.periodo_inicio,
        f.dias_periodo,
        f.es_periodo_parcial,
        c.id AS concepto_id,
        c.codigo AS concepto_codigo,
        c.nombre AS concepto_nombre,
        c.unidad_medida,
        p.precio_unitario,
        CASE
            WHEN f.es_periodo_parcial THEN
                ROUND((f.dias_periodo::NUMERIC /
                    EXTRACT(DAY FROM (DATE_TRUNC('month', f.periodo_inicio) + INTERVAL '1 month - 1 day'))
                ), 4)
            ELSE 1
        END AS cantidad,
        CASE
            WHEN f.es_periodo_parcial THEN
                ROUND((p.precio_unitario * f.dias_periodo /
                    EXTRACT(DAY FROM (DATE_TRUNC('month', f.periodo_inicio) + INTERVAL '1 month - 1 day'))
                )::NUMERIC, 2)
            ELSE p.precio_unitario
        END AS subtotal,
        COALESCE(
            (SELECT MAX(orden) FROM facturas_lineas WHERE factura_id = f.id), 0
        ) + 1 AS nuevo_orden
    FROM facturas f
    JOIN comunidades com ON f.comunidad_id = com.id
    JOIN conceptos c ON c.codigo = 'TF' AND c.es_termino_fijo = true AND c.activo = true
    LEFT JOIN precios p ON p.comunidad_id = f.comunidad_id
        AND p.concepto_id = c.id
        AND p.activo = true
        AND p.fecha_fin IS NULL
    WHERE f.estado = 'borrador'
      AND NOT EXISTS (
          SELECT 1 FROM facturas_lineas fl
          WHERE fl.factura_id = f.id
          AND fl.concepto_codigo = 'TF'
      )
      AND p.precio_unitario IS NOT NULL
)
INSERT INTO facturas_lineas (
    factura_id,
    lectura_id,
    concepto_id,
    concepto_codigo,
    concepto_nombre,
    unidad_medida,
    es_termino_fijo,
    cantidad,
    precio_unitario,
    subtotal,
    orden
)
SELECT
    factura_id,
    NULL,  -- lectura_id (no aplica para TF)
    concepto_id,
    concepto_codigo,
    concepto_nombre,
    unidad_medida,
    true,  -- es_termino_fijo
    cantidad,
    precio_unitario,
    subtotal,
    nuevo_orden
FROM facturas_sin_tf;
*/

-- =====================================================
-- PASO 3: Actualizar totales de las facturas
-- =====================================================
-- Ejecuta DESPUÉS de insertar las líneas de TF

/*
UPDATE facturas f
SET
    base_imponible = (
        SELECT COALESCE(SUM(subtotal), 0)
        FROM facturas_lineas
        WHERE factura_id = f.id
    ),
    importe_iva = ROUND((
        SELECT COALESCE(SUM(subtotal), 0)
        FROM facturas_lineas
        WHERE factura_id = f.id
    ) * 0.21, 2),
    total = ROUND((
        SELECT COALESCE(SUM(subtotal), 0)
        FROM facturas_lineas
        WHERE factura_id = f.id
    ) * 1.21, 2),
    updated_at = NOW()
WHERE estado = 'borrador'
  AND EXISTS (
      SELECT 1 FROM facturas_lineas fl
      WHERE fl.factura_id = f.id
      AND fl.concepto_codigo = 'TF'
  );
*/

-- =====================================================
-- PASO 4: Verificar resultados
-- =====================================================

/*
SELECT
    f.id,
    f.cliente_nombre,
    f.base_imponible,
    f.importe_iva,
    f.total,
    (SELECT STRING_AGG(concepto_codigo, ', ') FROM facturas_lineas WHERE factura_id = f.id) AS conceptos
FROM facturas f
WHERE f.estado = 'borrador'
ORDER BY f.cliente_nombre;
*/

-- =====================================================
-- SCRIPT COMBINADO (TODO EN UNO)
-- =====================================================
-- Si prefieres ejecutar todo de una vez, usa este bloque:

/*
DO $$
DECLARE
    v_facturas_actualizadas INTEGER;
    v_lineas_insertadas INTEGER;
BEGIN
    -- Insertar líneas de TF
    WITH facturas_sin_tf AS (
        SELECT
            f.id AS factura_id,
            f.periodo_inicio,
            f.dias_periodo,
            f.es_periodo_parcial,
            c.id AS concepto_id,
            c.codigo AS concepto_codigo,
            c.nombre AS concepto_nombre,
            c.unidad_medida,
            p.precio_unitario,
            CASE
                WHEN f.es_periodo_parcial THEN
                    ROUND((f.dias_periodo::NUMERIC /
                        EXTRACT(DAY FROM (DATE_TRUNC('month', f.periodo_inicio) + INTERVAL '1 month - 1 day'))
                    ), 4)
                ELSE 1
            END AS cantidad,
            CASE
                WHEN f.es_periodo_parcial THEN
                    ROUND((p.precio_unitario * f.dias_periodo /
                        EXTRACT(DAY FROM (DATE_TRUNC('month', f.periodo_inicio) + INTERVAL '1 month - 1 day'))
                    )::NUMERIC, 2)
                ELSE p.precio_unitario
            END AS subtotal,
            COALESCE(
                (SELECT MAX(orden) FROM facturas_lineas WHERE factura_id = f.id), 0
            ) + 1 AS nuevo_orden
        FROM facturas f
        JOIN conceptos c ON c.codigo = 'TF' AND c.es_termino_fijo = true AND c.activo = true
        LEFT JOIN precios p ON p.comunidad_id = f.comunidad_id
            AND p.concepto_id = c.id
            AND p.activo = true
            AND p.fecha_fin IS NULL
        WHERE f.estado = 'borrador'
          AND NOT EXISTS (
              SELECT 1 FROM facturas_lineas fl
              WHERE fl.factura_id = f.id
              AND fl.concepto_codigo = 'TF'
          )
          AND p.precio_unitario IS NOT NULL
    )
    INSERT INTO facturas_lineas (
        factura_id, lectura_id, concepto_id, concepto_codigo,
        concepto_nombre, unidad_medida, es_termino_fijo,
        cantidad, precio_unitario, subtotal, orden
    )
    SELECT
        factura_id, NULL, concepto_id, concepto_codigo,
        concepto_nombre, unidad_medida, true,
        cantidad, precio_unitario, subtotal, nuevo_orden
    FROM facturas_sin_tf;

    GET DIAGNOSTICS v_lineas_insertadas = ROW_COUNT;

    -- Actualizar totales
    UPDATE facturas f
    SET
        base_imponible = (
            SELECT COALESCE(SUM(subtotal), 0)
            FROM facturas_lineas WHERE factura_id = f.id
        ),
        importe_iva = ROUND((
            SELECT COALESCE(SUM(subtotal), 0)
            FROM facturas_lineas WHERE factura_id = f.id
        ) * 0.21, 2),
        total = ROUND((
            SELECT COALESCE(SUM(subtotal), 0)
            FROM facturas_lineas WHERE factura_id = f.id
        ) * 1.21, 2),
        updated_at = NOW()
    WHERE estado = 'borrador'
      AND EXISTS (
          SELECT 1 FROM facturas_lineas fl
          WHERE fl.factura_id = f.id
          AND fl.concepto_codigo = 'TF'
      );

    GET DIAGNOSTICS v_facturas_actualizadas = ROW_COUNT;

    RAISE NOTICE 'Líneas TF insertadas: %', v_lineas_insertadas;
    RAISE NOTICE 'Facturas actualizadas: %', v_facturas_actualizadas;
END $$;
*/
