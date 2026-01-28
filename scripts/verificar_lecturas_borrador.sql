-- =====================================================
-- Script para verificar lecturas en facturas borrador
-- que no están marcadas como facturadas
-- =====================================================

-- 1. Contar lecturas afectadas
SELECT
  'Lecturas a corregir' as descripcion,
  COUNT(*) as cantidad
FROM lecturas l
JOIN facturas_lineas fl ON fl.lectura_id = l.id
JOIN facturas f ON f.id = fl.factura_id
WHERE f.estado = 'borrador'
  AND l.facturada = false;

-- 2. Ver detalle de las lecturas afectadas
SELECT
  l.id as lectura_id,
  l.lectura_valor,
  l.fecha_lectura,
  l.facturada,
  l.factura_id as lectura_factura_id,
  f.id as factura_id,
  f.numero_completo,
  f.estado as estado_factura,
  f.cliente_nombre,
  f.total as total_factura,
  cont.numero_serie as contador
FROM lecturas l
JOIN facturas_lineas fl ON fl.lectura_id = l.id
JOIN facturas f ON f.id = fl.factura_id
JOIN contadores cont ON cont.id = l.contador_id
WHERE f.estado = 'borrador'
  AND l.facturada = false
ORDER BY f.created_at DESC, cont.numero_serie;

-- 3. Resumen por factura borrador
SELECT
  f.id as factura_id,
  f.cliente_nombre,
  f.total,
  f.created_at as fecha_creacion,
  COUNT(l.id) as lecturas_sin_marcar
FROM facturas f
JOIN facturas_lineas fl ON fl.factura_id = f.id
JOIN lecturas l ON l.id = fl.lectura_id
WHERE f.estado = 'borrador'
  AND l.facturada = false
GROUP BY f.id, f.cliente_nombre, f.total, f.created_at
ORDER BY f.created_at DESC;
