-- =====================================================
-- Script para corregir lecturas en facturas borrador
-- Marca como facturadas las lecturas que ya están en borradores
-- =====================================================

-- PASO 1: Verificar antes de ejecutar (ejecutar primero solo esto)
SELECT
  'Lecturas a corregir' as descripcion,
  COUNT(*) as cantidad
FROM lecturas l
JOIN facturas_lineas fl ON fl.lectura_id = l.id
JOIN facturas f ON f.id = fl.factura_id
WHERE f.estado = 'borrador'
  AND l.facturada = false;

-- PASO 2: Ejecutar la corrección (descomentar para ejecutar)
/*
UPDATE lecturas l
SET
  facturada = true,
  factura_id = fl.factura_id,
  updated_at = now()
FROM facturas_lineas fl
JOIN facturas f ON f.id = fl.factura_id
WHERE fl.lectura_id = l.id
  AND f.estado = 'borrador'
  AND l.facturada = false;
*/

-- PASO 3: Verificar después de la corrección
-- (Debería devolver 0 si todo se corrigió correctamente)
/*
SELECT
  'Lecturas pendientes de corregir' as descripcion,
  COUNT(*) as cantidad
FROM lecturas l
JOIN facturas_lineas fl ON fl.lectura_id = l.id
JOIN facturas f ON f.id = fl.factura_id
WHERE f.estado = 'borrador'
  AND l.facturada = false;
*/
