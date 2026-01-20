-- =====================================================
-- Migración 009: Precisión Decimal Variable
-- =====================================================
-- Objetivo: Ajustar precisión de precios y lecturas según requerimientos

-- PASO 0: Eliminar vistas dependientes
-- Estas vistas usan las columnas que vamos a modificar
DROP VIEW IF EXISTS v_contadores_completos CASCADE;
DROP VIEW IF EXISTS v_lecturas_pendientes_facturar CASCADE;

-- PASO 1: Modificar tabla precios
-- De DECIMAL(10,4) a DECIMAL(10,5) para soportar 5 decimales
ALTER TABLE precios
ALTER COLUMN precio_unitario TYPE DECIMAL(10,5);

-- PASO 2: Modificar tabla lecturas
-- De DECIMAL(12,4) a DECIMAL(12,3) para reflejar precisión real de 3 decimales
ALTER TABLE lecturas
ALTER COLUMN lectura_valor TYPE DECIMAL(12,3),
ALTER COLUMN lectura_anterior TYPE DECIMAL(12,3),
ALTER COLUMN consumo TYPE DECIMAL(12,3);

-- PASO 3: Modificar tabla contadores_conceptos
ALTER TABLE contadores_conceptos
ALTER COLUMN lectura_inicial TYPE DECIMAL(12,3),
ALTER COLUMN lectura_actual TYPE DECIMAL(12,3);

-- PASO 4: Modificar tabla importaciones_detalle
ALTER TABLE importaciones_detalle
ALTER COLUMN lectura_valor TYPE DECIMAL(12,3),
ALTER COLUMN lectura_anterior TYPE DECIMAL(12,3),
ALTER COLUMN consumo_calculado TYPE DECIMAL(12,3),
ALTER COLUMN lectura_corregida TYPE DECIMAL(12,3),
ALTER COLUMN precio_unitario TYPE DECIMAL(10,5);

-- PASO 5: Modificar tabla facturas_lineas
ALTER TABLE facturas_lineas
ALTER COLUMN lectura_anterior TYPE DECIMAL(12,3),
ALTER COLUMN lectura_actual TYPE DECIMAL(12,3),
ALTER COLUMN consumo TYPE DECIMAL(12,3),
ALTER COLUMN cantidad TYPE DECIMAL(12,3),
ALTER COLUMN precio_unitario TYPE DECIMAL(10,5);

-- PASO 6: Recrear vistas con las mismas definiciones
-- Vista: v_contadores_completos (de migración 002)
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
  p.precio_unitario
FROM contadores cont
JOIN ubicaciones u ON cont.ubicacion_id = u.id
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades com ON a.comunidad_id = com.id
LEFT JOIN contadores_conceptos cc ON cont.id = cc.contador_id AND cc.activo = true
LEFT JOIN conceptos conc ON cc.concepto_id = conc.id
LEFT JOIN precios p ON com.id = p.comunidad_id
  AND conc.id = p.concepto_id
  AND p.activo = true
  AND p.fecha_fin IS NULL;

-- Vista: v_lecturas_pendientes_facturar (de migración 004)
CREATE VIEW v_lecturas_pendientes_facturar AS
SELECT
  l.id,
  l.contador_id,
  l.concepto_id,
  l.cliente_id,
  l.lectura_valor,
  l.lectura_anterior,
  l.fecha_lectura,
  l.fecha_lectura_anterior,
  l.consumo,
  p.precio_unitario,
  COALESCE(l.consumo * p.precio_unitario, 0) as importe_estimado,
  cont.numero_serie as contador_numero_serie,
  conc.codigo as concepto_codigo,
  conc.nombre as concepto_nombre,
  conc.unidad_medida,
  conc.es_termino_fijo,
  c.id as cliente_actual_id,
  c.nombre || ' ' || COALESCE(c.apellidos, '') as cliente_nombre,
  c.nif as cliente_nif,
  u.id as ubicacion_id,
  u.nombre as ubicacion_nombre,
  a.id as agrupacion_id,
  a.nombre as agrupacion_nombre,
  com.id as comunidad_id,
  com.nombre as comunidad_nombre,
  com.codigo as comunidad_codigo
FROM lecturas l
JOIN contadores cont ON cont.id = l.contador_id
JOIN conceptos conc ON conc.id = l.concepto_id
LEFT JOIN clientes c ON c.id = l.cliente_id
JOIN ubicaciones u ON u.id = cont.ubicacion_id
JOIN agrupaciones a ON a.id = u.agrupacion_id
JOIN comunidades com ON com.id = a.comunidad_id
LEFT JOIN precios p ON p.comunidad_id = com.id
  AND p.concepto_id = l.concepto_id
  AND p.activo = true
  AND p.fecha_fin IS NULL
WHERE l.facturada = false;

-- Nota: Los datos existentes se mantendrán y se truncarán automáticamente
-- si exceden la nueva precisión (poco probable dado que estamos reduciendo
-- precisión de lecturas de 4 a 3 decimales)

COMMENT ON COLUMN precios.precio_unitario IS
'Precio unitario con hasta 5 decimales. Precisión variable según concepto:
- CAL, CLI: 5 decimales (ej: 0.12459)
- ACS, TF, MANT: 3 decimales (ej: 5.563)';

COMMENT ON COLUMN lecturas.lectura_valor IS
'Lectura del contador con hasta 3 decimales máximo';
