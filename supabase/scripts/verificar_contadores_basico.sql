-- =====================================================
-- VERIFICACIÓN BÁSICA DE CONTADORES Y LECTURAS
-- =====================================================

-- 1. Verificar si los contadores existen
SELECT 
    id,
    numero_serie,
    marca,
    modelo,
    ubicacion_id,
    activo
FROM contadores
WHERE numero_serie IN ('11200154', '11200164')
ORDER BY numero_serie;

-- 2. Si existen, ver sus lecturas
SELECT 
    c.numero_serie AS contador,
    co.nombre AS concepto,
    l.fecha_lectura,
    l.lectura_anterior,
    l.lectura_valor AS lectura_actual,
    l.consumo,
    l.facturada
FROM lecturas l
JOIN contadores c ON c.id = l.contador_id
JOIN conceptos co ON co.id = l.concepto_id
WHERE c.numero_serie IN ('11200154', '11200164')
ORDER BY c.numero_serie, co.nombre, l.fecha_lectura;

-- 3. Contar lecturas por contador
SELECT 
    c.numero_serie,
    COUNT(l.id) AS total_lecturas,
    COUNT(CASE WHEN l.facturada = true THEN 1 END) AS lecturas_facturadas,
    COUNT(CASE WHEN l.facturada = false THEN 1 END) AS lecturas_pendientes
FROM contadores c
LEFT JOIN lecturas l ON l.contador_id = c.id
WHERE c.numero_serie IN ('11200154', '11200164')
GROUP BY c.numero_serie
ORDER BY c.numero_serie;
