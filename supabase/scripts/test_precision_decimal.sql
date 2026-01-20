-- =====================================================
-- Script de Prueba: Precisión Decimal Variable
-- =====================================================
-- Objetivo: Validar que la migración 009 funciona correctamente

-- =====================================================
-- PARTE 1: Verificar estructura de columnas
-- =====================================================

SELECT
  table_name,
  column_name,
  data_type,
  numeric_precision,
  numeric_scale
FROM information_schema.columns
WHERE table_name IN ('precios', 'lecturas', 'facturas_lineas', 'contadores_conceptos', 'importaciones_detalle')
  AND column_name IN ('precio_unitario', 'lectura_valor', 'lectura_anterior', 'lectura_actual', 'consumo', 'lectura_inicial', 'consumo_calculado', 'lectura_corregida', 'cantidad')
ORDER BY table_name, column_name;

-- Resultado esperado:
-- precios.precio_unitario: numeric(10,5)
-- lecturas.lectura_valor: numeric(12,3)
-- lecturas.lectura_anterior: numeric(12,3)
-- lecturas.consumo: numeric(12,3)
-- contadores_conceptos.lectura_inicial: numeric(12,3)
-- contadores_conceptos.lectura_actual: numeric(12,3)
-- importaciones_detalle.lectura_valor: numeric(12,3)
-- importaciones_detalle.lectura_anterior: numeric(12,3)
-- importaciones_detalle.consumo_calculado: numeric(12,3)
-- importaciones_detalle.lectura_corregida: numeric(12,3)
-- importaciones_detalle.precio_unitario: numeric(10,5)
-- facturas_lineas.lectura_anterior: numeric(12,3)
-- facturas_lineas.lectura_actual: numeric(12,3)
-- facturas_lineas.consumo: numeric(12,3)
-- facturas_lineas.cantidad: numeric(12,3)
-- facturas_lineas.precio_unitario: numeric(10,5)

-- =====================================================
-- PARTE 2: Verificar que las vistas fueron recreadas
-- =====================================================

SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('v_contadores_completos', 'v_lecturas_pendientes_facturar')
ORDER BY table_name;

-- Resultado esperado: 2 filas con table_type = 'VIEW'

-- =====================================================
-- PARTE 3: Insertar datos de prueba con diferentes precisiones
-- =====================================================

-- Nota: Solo ejecutar si estamos en entorno de pruebas
-- Comentar/descomentar según sea necesario

/*
-- 3.1: Insertar precios de prueba con diferentes precisiones
INSERT INTO precios (comunidad_id, concepto_id, precio_unitario, fecha_inicio, activo)
VALUES
  -- Calefacción: 5 decimales
  (
    (SELECT id FROM comunidades LIMIT 1),
    (SELECT id FROM conceptos WHERE codigo = 'CAL' LIMIT 1),
    0.12459,  -- 5 decimales
    CURRENT_DATE,
    true
  ),
  -- Climatización: 5 decimales
  (
    (SELECT id FROM comunidades LIMIT 1),
    (SELECT id FROM conceptos WHERE codigo = 'CLI' LIMIT 1),
    0.14657,  -- 5 decimales
    CURRENT_DATE,
    true
  ),
  -- ACS: 3 decimales
  (
    (SELECT id FROM comunidades LIMIT 1),
    (SELECT id FROM conceptos WHERE codigo = 'ACS' LIMIT 1),
    5.563,  -- 3 decimales
    CURRENT_DATE,
    true
  ),
  -- Término Fijo: 3 decimales
  (
    (SELECT id FROM comunidades LIMIT 1),
    (SELECT id FROM conceptos WHERE codigo = 'TF' LIMIT 1),
    17.230,  -- 3 decimales
    CURRENT_DATE,
    true
  )
ON CONFLICT DO NOTHING;

-- 3.2: Verificar almacenamiento correcto de precios
SELECT
  c.codigo as concepto,
  c.nombre,
  p.precio_unitario,
  LENGTH(SPLIT_PART(p.precio_unitario::TEXT, '.', 2)) as decimales_almacenados
FROM precios p
JOIN conceptos c ON p.concepto_id = c.id
WHERE p.activo = true
  AND c.codigo IN ('CAL', 'CLI', 'ACS', 'TF')
ORDER BY c.codigo;

-- Resultado esperado:
-- CAL | Calefacción           | 0.12459 | 5 decimales
-- CLI | Climatización         | 0.14657 | 5 decimales
-- ACS | Agua Caliente Sanitaria | 5.563   | 3 decimales
-- TF  | Término Fijo          | 17.230  | 3 decimales

-- 3.3: Insertar lecturas de prueba con 3 decimales
INSERT INTO lecturas (
  contador_id,
  concepto_id,
  cliente_id,
  lectura_valor,
  fecha_lectura,
  lectura_anterior,
  fecha_lectura_anterior,
  consumo,
  facturada
)
VALUES (
  (SELECT id FROM contadores LIMIT 1),
  (SELECT id FROM conceptos WHERE codigo = 'CAL' LIMIT 1),
  (SELECT id FROM clientes LIMIT 1),
  2800.750,  -- 3 decimales
  CURRENT_DATE,
  1500.250,  -- 3 decimales
  CURRENT_DATE - INTERVAL '30 days',
  1300.500,  -- 3 decimales (consumo)
  false
)
ON CONFLICT DO NOTHING;

-- 3.4: Verificar almacenamiento correcto de lecturas
SELECT
  l.id,
  l.lectura_anterior,
  l.lectura_valor,
  l.consumo,
  LENGTH(SPLIT_PART(l.lectura_valor::TEXT, '.', 2)) as decimales_lectura,
  LENGTH(SPLIT_PART(l.consumo::TEXT, '.', 2)) as decimales_consumo
FROM lecturas l
WHERE l.fecha_lectura = CURRENT_DATE
ORDER BY l.id DESC
LIMIT 5;

-- Resultado esperado:
-- lectura_anterior: 1500.250 (3 decimales)
-- lectura_valor: 2800.750 (3 decimales)
-- consumo: 1300.500 (3 decimales)
*/

-- =====================================================
-- PARTE 4: Validar cálculos con precisión completa
-- =====================================================

-- Nota: Solo ejecutar si hay datos de prueba
/*
-- 4.1: Calcular importe con precisión completa (sin redondeo intermedio)
SELECT
  1300.500::DECIMAL(12,3) AS cantidad,
  0.12459::DECIMAL(10,5) AS precio_unitario,
  1300.500::DECIMAL(12,3) * 0.12459::DECIMAL(10,5) AS importe_sin_redondear,
  ROUND(1300.500::DECIMAL(12,3) * 0.12459::DECIMAL(10,5), 2) AS importe_redondeado;

-- Resultado esperado:
-- cantidad: 1300.500
-- precio_unitario: 0.12459
-- importe_sin_redondear: 162.00095
-- importe_redondeado: 162.00

-- 4.2: Verificar que las vistas funcionan correctamente
SELECT
  concepto_codigo,
  concepto_nombre,
  precio_unitario,
  lectura_inicial,
  lectura_actual
FROM v_contadores_completos
WHERE concepto_codigo IN ('CAL', 'CLI', 'ACS', 'TF')
LIMIT 5;

-- 4.3: Verificar v_lecturas_pendientes_facturar
SELECT
  concepto_codigo,
  lectura_anterior,
  lectura_valor,
  consumo,
  precio_unitario,
  importe_estimado
FROM v_lecturas_pendientes_facturar
WHERE concepto_codigo IN ('CAL', 'CLI', 'ACS')
LIMIT 5;
*/

-- =====================================================
-- PARTE 5: Verificar datos existentes (no alterados)
-- =====================================================

-- 5.1: Contar registros en tablas principales
SELECT
  'precios' as tabla,
  COUNT(*) as total_registros,
  COUNT(CASE WHEN precio_unitario IS NOT NULL THEN 1 END) as con_precio
FROM precios
UNION ALL
SELECT
  'lecturas' as tabla,
  COUNT(*) as total_registros,
  COUNT(CASE WHEN lectura_valor IS NOT NULL THEN 1 END) as con_lectura
FROM lecturas
UNION ALL
SELECT
  'facturas_lineas' as tabla,
  COUNT(*) as total_registros,
  COUNT(CASE WHEN precio_unitario IS NOT NULL THEN 1 END) as con_precio
FROM facturas_lineas;

-- =====================================================
-- PARTE 6: Validar que no hay datos corruptos
-- =====================================================

-- 6.1: Verificar que no hay precios NULL o negativos
SELECT
  'Precios inválidos' as validacion,
  COUNT(*) as total
FROM precios
WHERE precio_unitario IS NULL OR precio_unitario < 0;

-- Resultado esperado: 0

-- 6.2: Verificar que no hay lecturas NULL en registros activos
SELECT
  'Lecturas inválidas' as validacion,
  COUNT(*) as total
FROM lecturas
WHERE lectura_valor IS NULL;

-- Resultado esperado: 0 o muy pocos

-- 6.3: Verificar que no hay consumos negativos
SELECT
  'Consumos negativos' as validacion,
  COUNT(*) as total
FROM lecturas
WHERE consumo < 0;

-- Resultado esperado: 0 o muy pocos (pueden existir casos especiales)

-- =====================================================
-- RESUMEN DE VALIDACIÓN
-- =====================================================

SELECT
  'VALIDACIÓN COMPLETADA' as mensaje,
  CURRENT_TIMESTAMP as fecha_hora;

-- =====================================================
-- NOTAS FINALES
-- =====================================================

-- Para ejecutar este script:
-- 1. Conectar a Supabase Dashboard → SQL Editor
-- 2. Copiar y pegar este script
-- 3. Ejecutar partes 1, 2, 5 y 6 siempre
-- 4. Ejecutar partes 3 y 4 solo en entorno de pruebas
-- 5. Verificar que todos los resultados son los esperados

-- Si alguna validación falla:
-- 1. Revisar los comentarios de "Resultado esperado"
-- 2. Verificar que la migración 009 se ejecutó correctamente
-- 3. Verificar que no hay errores en las vistas
-- 4. Contactar al equipo de desarrollo si persiste el problema
