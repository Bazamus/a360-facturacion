-- ============================================================
-- Script corrección: Asociaciones cliente-contador-vivienda
-- Comunidad: 598 - 309 VIV TORRE VIANA 1
-- Agrupación: Torre 1
--
-- Para cada registro:
--   1. Mueve el contador a la vivienda correcta (contadores.ubicacion_id)
--   2. Desvincula al cliente de su vivienda actual (es_actual = false)
--   3. Vincula al cliente a la vivienda correcta (nueva fila en ubicaciones_clientes)
-- ============================================================

-- ============================================
-- PASO 0: VERIFICACIÓN PREVIA (ejecutar primero para validar datos)
-- ============================================

-- Ver estado ACTUAL de las asociaciones
SELECT
  cli.codigo_cliente,
  cont.numero_serie,
  cli.nombre || ' ' || cli.apellidos AS cliente,
  a_actual.nombre AS torre_actual,
  u_actual.nombre AS vivienda_actual,
  uc.es_actual
FROM clientes cli
LEFT JOIN ubicaciones_clientes uc ON cli.id = uc.cliente_id AND uc.es_actual = true
LEFT JOIN ubicaciones u_actual ON uc.ubicacion_id = u_actual.id
LEFT JOIN agrupaciones a_actual ON u_actual.agrupacion_id = a_actual.id
LEFT JOIN contadores cont ON cont.numero_serie IN ('11167162','11167246','11167142','11176617','11200218','11224554','11224687','11224391')
  AND cont.ubicacion_id = u_actual.id
WHERE cli.codigo_cliente IN ('104927','104362','103910','103760','104216','104182','105203','105134')
ORDER BY cli.codigo_cliente;

-- Ver las viviendas destino en Torre 1 de la comunidad 598
SELECT
  u.id AS ubicacion_id,
  u.nombre AS vivienda,
  a.nombre AS torre,
  com.codigo AS comunidad
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades com ON a.comunidad_id = com.id
WHERE com.codigo = '598'
  AND a.nombre = 'Torre 1'
  AND u.nombre IN ('1ºN','2ºY','2ºAB','3ºZ','6ºJ','18ºD','19ºC','21ºI')
ORDER BY u.nombre;

-- ============================================
-- PASO 1: ACTUALIZAR CONTADORES → VIVIENDA CORRECTA
-- ============================================

-- Contador 11167162 → Vivienda 1ºN (Torre 1)
UPDATE contadores
SET ubicacion_id = (
  SELECT u.id FROM ubicaciones u
  JOIN agrupaciones a ON u.agrupacion_id = a.id
  JOIN comunidades com ON a.comunidad_id = com.id
  WHERE com.codigo = '598' AND a.nombre = 'Torre 1' AND u.nombre = '1ºN'
)
WHERE numero_serie = '11167162';

-- Contador 11167246 → Vivienda 2ºY (Torre 1)
UPDATE contadores
SET ubicacion_id = (
  SELECT u.id FROM ubicaciones u
  JOIN agrupaciones a ON u.agrupacion_id = a.id
  JOIN comunidades com ON a.comunidad_id = com.id
  WHERE com.codigo = '598' AND a.nombre = 'Torre 1' AND u.nombre = '2ºY'
)
WHERE numero_serie = '11167246';

-- Contador 11167142 → Vivienda 2ºAB (Torre 1)
UPDATE contadores
SET ubicacion_id = (
  SELECT u.id FROM ubicaciones u
  JOIN agrupaciones a ON u.agrupacion_id = a.id
  JOIN comunidades com ON a.comunidad_id = com.id
  WHERE com.codigo = '598' AND a.nombre = 'Torre 1' AND u.nombre = '2ºAB'
)
WHERE numero_serie = '11167142';

-- Contador 11176617 → Vivienda 3ºZ (Torre 1)
UPDATE contadores
SET ubicacion_id = (
  SELECT u.id FROM ubicaciones u
  JOIN agrupaciones a ON u.agrupacion_id = a.id
  JOIN comunidades com ON a.comunidad_id = com.id
  WHERE com.codigo = '598' AND a.nombre = 'Torre 1' AND u.nombre = '3ºZ'
)
WHERE numero_serie = '11176617';

-- Contador 11200218 → Vivienda 6ºJ (Torre 1)
UPDATE contadores
SET ubicacion_id = (
  SELECT u.id FROM ubicaciones u
  JOIN agrupaciones a ON u.agrupacion_id = a.id
  JOIN comunidades com ON a.comunidad_id = com.id
  WHERE com.codigo = '598' AND a.nombre = 'Torre 1' AND u.nombre = '6ºJ'
)
WHERE numero_serie = '11200218';

-- Contador 11224554 → Vivienda 18ºD (Torre 1)
UPDATE contadores
SET ubicacion_id = (
  SELECT u.id FROM ubicaciones u
  JOIN agrupaciones a ON u.agrupacion_id = a.id
  JOIN comunidades com ON a.comunidad_id = com.id
  WHERE com.codigo = '598' AND a.nombre = 'Torre 1' AND u.nombre = '18ºD'
)
WHERE numero_serie = '11224554';

-- Contador 11224687 → Vivienda 19ºC (Torre 1)
UPDATE contadores
SET ubicacion_id = (
  SELECT u.id FROM ubicaciones u
  JOIN agrupaciones a ON u.agrupacion_id = a.id
  JOIN comunidades com ON a.comunidad_id = com.id
  WHERE com.codigo = '598' AND a.nombre = 'Torre 1' AND u.nombre = '19ºC'
)
WHERE numero_serie = '11224687';

-- Contador 11224391 → Vivienda 21ºI (Torre 1)
UPDATE contadores
SET ubicacion_id = (
  SELECT u.id FROM ubicaciones u
  JOIN agrupaciones a ON u.agrupacion_id = a.id
  JOIN comunidades com ON a.comunidad_id = com.id
  WHERE com.codigo = '598' AND a.nombre = 'Torre 1' AND u.nombre = '21ºI'
)
WHERE numero_serie = '11224391';

-- ============================================
-- PASO 2: DESVINCULAR CLIENTES DE VIVIENDAS ACTUALES
--         (marcar es_actual = false, poner fecha_fin)
-- ============================================

UPDATE ubicaciones_clientes
SET es_actual = false,
    fecha_fin = CURRENT_DATE
WHERE es_actual = true
  AND cliente_id IN (
    SELECT id FROM clientes
    WHERE codigo_cliente IN ('104927','104362','103910','103760','104216','104182','105203','105134')
  );

-- ============================================
-- PASO 3: VINCULAR CLIENTES A VIVIENDAS CORRECTAS
-- ============================================

-- Cliente 104927 (SOFIA FERNANDEZ UÑA) → 1ºN
INSERT INTO ubicaciones_clientes (id, ubicacion_id, cliente_id, fecha_inicio, es_actual)
SELECT gen_random_uuid(),
       u.id,
       cli.id,
       CURRENT_DATE,
       true
FROM clientes cli,
     ubicaciones u
     JOIN agrupaciones a ON u.agrupacion_id = a.id
     JOIN comunidades com ON a.comunidad_id = com.id
WHERE cli.codigo_cliente = '104927'
  AND com.codigo = '598' AND a.nombre = 'Torre 1' AND u.nombre = '1ºN';

-- Cliente 104362 (SILVIA VALLINA IGLESIAS) → 2ºY
INSERT INTO ubicaciones_clientes (id, ubicacion_id, cliente_id, fecha_inicio, es_actual)
SELECT gen_random_uuid(),
       u.id,
       cli.id,
       CURRENT_DATE,
       true
FROM clientes cli,
     ubicaciones u
     JOIN agrupaciones a ON u.agrupacion_id = a.id
     JOIN comunidades com ON a.comunidad_id = com.id
WHERE cli.codigo_cliente = '104362'
  AND com.codigo = '598' AND a.nombre = 'Torre 1' AND u.nombre = '2ºY';

-- Cliente 103910 (SERGIO RODRIGUEZ HERNANDEZ) → 2ºAB
INSERT INTO ubicaciones_clientes (id, ubicacion_id, cliente_id, fecha_inicio, es_actual)
SELECT gen_random_uuid(),
       u.id,
       cli.id,
       CURRENT_DATE,
       true
FROM clientes cli,
     ubicaciones u
     JOIN agrupaciones a ON u.agrupacion_id = a.id
     JOIN comunidades com ON a.comunidad_id = com.id
WHERE cli.codigo_cliente = '103910'
  AND com.codigo = '598' AND a.nombre = 'Torre 1' AND u.nombre = '2ºAB';

-- Cliente 103760 (SERGIO GONZALEZ AGUIRRE) → 3ºZ
INSERT INTO ubicaciones_clientes (id, ubicacion_id, cliente_id, fecha_inicio, es_actual)
SELECT gen_random_uuid(),
       u.id,
       cli.id,
       CURRENT_DATE,
       true
FROM clientes cli,
     ubicaciones u
     JOIN agrupaciones a ON u.agrupacion_id = a.id
     JOIN comunidades com ON a.comunidad_id = com.id
WHERE cli.codigo_cliente = '103760'
  AND com.codigo = '598' AND a.nombre = 'Torre 1' AND u.nombre = '3ºZ';

-- Cliente 104216 (SILVIA CORBACHO MENDEZ) → 6ºJ
INSERT INTO ubicaciones_clientes (id, ubicacion_id, cliente_id, fecha_inicio, es_actual)
SELECT gen_random_uuid(),
       u.id,
       cli.id,
       CURRENT_DATE,
       true
FROM clientes cli,
     ubicaciones u
     JOIN agrupaciones a ON u.agrupacion_id = a.id
     JOIN comunidades com ON a.comunidad_id = com.id
WHERE cli.codigo_cliente = '104216'
  AND com.codigo = '598' AND a.nombre = 'Torre 1' AND u.nombre = '6ºJ';

-- Cliente 104182 (SOFIA FERNANDEZ MANCILLA) → 18ºD
INSERT INTO ubicaciones_clientes (id, ubicacion_id, cliente_id, fecha_inicio, es_actual)
SELECT gen_random_uuid(),
       u.id,
       cli.id,
       CURRENT_DATE,
       true
FROM clientes cli,
     ubicaciones u
     JOIN agrupaciones a ON u.agrupacion_id = a.id
     JOIN comunidades com ON a.comunidad_id = com.id
WHERE cli.codigo_cliente = '104182'
  AND com.codigo = '598' AND a.nombre = 'Torre 1' AND u.nombre = '18ºD';

-- Cliente 105203 (SERGIO GARCIA MENENDEZ) → 19ºC
INSERT INTO ubicaciones_clientes (id, ubicacion_id, cliente_id, fecha_inicio, es_actual)
SELECT gen_random_uuid(),
       u.id,
       cli.id,
       CURRENT_DATE,
       true
FROM clientes cli,
     ubicaciones u
     JOIN agrupaciones a ON u.agrupacion_id = a.id
     JOIN comunidades com ON a.comunidad_id = com.id
WHERE cli.codigo_cliente = '105203'
  AND com.codigo = '598' AND a.nombre = 'Torre 1' AND u.nombre = '19ºC';

-- Cliente 105134 (SOFIA GARCIA ORDOÑEZ) → 21ºI
INSERT INTO ubicaciones_clientes (id, ubicacion_id, cliente_id, fecha_inicio, es_actual)
SELECT gen_random_uuid(),
       u.id,
       cli.id,
       CURRENT_DATE,
       true
FROM clientes cli,
     ubicaciones u
     JOIN agrupaciones a ON u.agrupacion_id = a.id
     JOIN comunidades com ON a.comunidad_id = com.id
WHERE cli.codigo_cliente = '105134'
  AND com.codigo = '598' AND a.nombre = 'Torre 1' AND u.nombre = '21ºI';

-- ============================================
-- PASO 4: VERIFICACIÓN POSTERIOR
-- ============================================

-- Verificar contadores → vivienda correcta
SELECT
  cont.numero_serie,
  u.nombre AS vivienda,
  a.nombre AS torre,
  com.codigo AS comunidad
FROM contadores cont
JOIN ubicaciones u ON cont.ubicacion_id = u.id
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades com ON a.comunidad_id = com.id
WHERE cont.numero_serie IN ('11167162','11167246','11167142','11176617','11200218','11224554','11224687','11224391')
ORDER BY cont.numero_serie;

-- Verificar clientes → vivienda correcta
SELECT
  cli.codigo_cliente,
  cli.nombre || ' ' || cli.apellidos AS cliente,
  u.nombre AS vivienda,
  a.nombre AS torre,
  uc.es_actual,
  uc.fecha_inicio
FROM clientes cli
JOIN ubicaciones_clientes uc ON cli.id = uc.cliente_id AND uc.es_actual = true
JOIN ubicaciones u ON uc.ubicacion_id = u.id
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades com ON a.comunidad_id = com.id
WHERE cli.codigo_cliente IN ('104927','104362','103910','103760','104216','104182','105203','105134')
  AND com.codigo = '598'
ORDER BY cli.codigo_cliente;
