-- =====================================================
-- PASO 5: VERIFICACIÓN FINAL
-- Comunidad 648 (UUID: 97c62d43-88a4-4685-968b-04fc83aba88b)
-- =====================================================

-- Verificar que no quedan facturas borrador (debe dar 0)
SELECT
  'Facturas borrador restantes' as descripcion,
  COUNT(*) as cantidad
FROM facturas f
JOIN contadores c ON c.id = f.contador_id
JOIN ubicaciones u ON u.id = c.ubicacion_id
JOIN agrupaciones a ON a.id = u.agrupacion_id
WHERE a.comunidad_id = '97c62d43-88a4-4685-968b-04fc83aba88b'
  AND f.estado = 'borrador'
  AND c.numero_serie IN (
    '11237541','11276003','11276004','11276005','11276006','11276008','11276011','11276013','11276014','11276015',
    '11276016','11277609','11277610','11277611','11299253','11299254','11299255','11299256','11299257','11299258',
    '11299259','11299260','11299261','11299262','11299263','11299264','11299265','11299266','11299267','11299268',
    '11299301','11299302','11299303','11299304','11299305','11299306','11299307','11299308','11299309','11299310',
    '11299311','11299312','11299313','11299314','11299315','11299316','11299333','11299334','11299335','11299336',
    '11299337','11299338','11299339','11299340','11299341','11299342','11299343','11299344','11299345','11299346',
    '11299347','11299348','11305500','11305501','11305502','11305503','11305504','11305505','11305506','11305507',
    '11305508','11305509','11305512','11305514','11305515'
  );

-- Verificar que no quedan lecturas (debe dar 0)
SELECT
  'Lecturas restantes' as descripcion,
  COUNT(*) as cantidad
FROM lecturas l
JOIN contadores c ON c.id = l.contador_id
JOIN ubicaciones u ON u.id = c.ubicacion_id
JOIN agrupaciones a ON a.id = u.agrupacion_id
WHERE a.comunidad_id = '97c62d43-88a4-4685-968b-04fc83aba88b'
  AND c.numero_serie IN (
    '11237541','11276003','11276004','11276005','11276006','11276008','11276011','11276013','11276014','11276015',
    '11276016','11277609','11277610','11277611','11299253','11299254','11299255','11299256','11299257','11299258',
    '11299259','11299260','11299261','11299262','11299263','11299264','11299265','11299266','11299267','11299268',
    '11299301','11299302','11299303','11299304','11299305','11299306','11299307','11299308','11299309','11299310',
    '11299311','11299312','11299313','11299314','11299315','11299316','11299333','11299334','11299335','11299336',
    '11299337','11299338','11299339','11299340','11299341','11299342','11299343','11299344','11299345','11299346',
    '11299347','11299348','11305500','11305501','11305502','11305503','11305504','11305505','11305506','11305507',
    '11305508','11305509','11305512','11305514','11305515'
  );

-- Verificar fechas actualizadas (muestra 10 primeros)
SELECT
  c.numero_serie,
  con.codigo as concepto,
  cc.lectura_inicial,
  cc.fecha_lectura_inicial,
  cc.lectura_actual,
  cc.fecha_lectura_actual
FROM contadores_conceptos cc
JOIN contadores c ON c.id = cc.contador_id
JOIN conceptos con ON con.id = cc.concepto_id
JOIN ubicaciones u ON u.id = c.ubicacion_id
JOIN agrupaciones a ON a.id = u.agrupacion_id
WHERE a.comunidad_id = '97c62d43-88a4-4685-968b-04fc83aba88b'
  AND c.numero_serie IN ('11237541','11276003','11276004','11276005','11276006')
ORDER BY c.numero_serie, con.codigo;
